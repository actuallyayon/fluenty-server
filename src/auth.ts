import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { ObjectId } from 'mongodb';
import { client, db, collections } from './db/index.js';
import { env } from './config/env.js';

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    env.CLIENT_URL,
    'https://fluenty-client.vercel.app',
    'https://fluenty-server.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000',
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  plugins: [
    admin({
      defaultRole: 'user',
      adminRoles: ['admin'],
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Rule: Signup must NEVER accept a role from the client. Every new user is "user".
          return {
            data: {
              ...user,
              role: 'user',
              banned: false,
            },
          };
        },
        after: async (user) => {
          try {
            // Automatically ensure document exists in profiles collection
            await collections.profiles().updateOne(
              { userId: user.id },
              {
                $setOnInsert: {
                  _id: new ObjectId(),
                  userId: user.id,
                  name: user.name || 'User',
                  email: user.email,
                  role: 'user',
                  plan: 'free',
                  xp: 0,
                  dailyStreak: 0,
                  banned: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
              { upsert: true }
            );
          } catch (err) {
            console.error('Failed to create initial profile in database hook:', err);
          }
        },
      },
    },
  },
});
