import { connectDB, getDb, collections } from '../db/index.js';
import { auth } from '../auth.js';
import { env } from '../config/env.js';
import { profileRepository } from '../repositories/profile.repository.js';

async function seedAdmin(): Promise<void> {
  console.log('🌱 Starting admin seed script...');

  try {
    await connectDB();
    const db = getDb();

    const email = env.ADMIN_EMAIL.toLowerCase().trim();
    const password = env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be defined in server/.env');
    }

    console.log(`Checking if admin user exists: ${email}`);

    // Check if user already exists in Better Auth user collection
    const existingUser = await db.collection('user').findOne({ email });

    let userId: string;

    if (!existingUser) {
      console.log('Creating new admin user via Better Auth API...');
      const result = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: 'Super Admin',
        },
      });

      if (!result || !result.user) {
        throw new Error('Failed to create admin user via Better Auth');
      }

      userId = result.user.id;
      console.log(`Admin user created with ID: ${userId}`);
    } else {
      userId = existingUser.id || existingUser._id.toString();
      console.log(`Existing user found with ID: ${userId}. Elevating to admin...`);
    }

    // Ensure role is 'admin' in Better Auth's user collection
    await db.collection('user').updateOne(
      { $or: [{ id: userId }, { email }] },
      { $set: { role: 'admin', banned: false, updatedAt: new Date() } }
    );

    // Ensure admin profile exists in profiles collection
    const profile = await profileRepository.ensureProfile({
      id: userId,
      name: 'Super Admin',
      email,
      role: 'admin',
    });

    await collections.profiles().updateOne(
      { userId },
      { $set: { role: 'admin', banned: false, updatedAt: new Date() } }
    );

    console.log('=============================================');
    console.log('🎉 Admin account successfully seeded!');
    console.log(`📧 Email:    ${email}`);
    console.log(`🔑 Role:     admin`);
    console.log(`🆔 User ID:  ${userId}`);
    console.log('=============================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed admin user:', error);
    process.exit(1);
  }
}

seedAdmin();
