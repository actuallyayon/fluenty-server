import { ObjectId } from 'mongodb';
import { collections } from '../db/index.js';
import type { ProfileDoc, TargetBand, UserLevel, PlanType } from '../types/collections.js';

export interface FormattedProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatarUrl?: string;
  targetBand?: TargetBand;
  examDate?: string;
  currentLevel?: UserLevel;
  plan: PlanType;
  xp: number;
  dailyStreak: number;
  lastActiveDate?: string;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
}

export function formatProfile(doc: ProfileDoc): FormattedProfile {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId,
    name: doc.name,
    email: doc.email,
    role: doc.role,
    avatarUrl: doc.avatarUrl,
    targetBand: doc.targetBand,
    examDate: doc.examDate ? doc.examDate.toISOString() : undefined,
    currentLevel: doc.currentLevel,
    plan: doc.plan,
    xp: doc.xp,
    dailyStreak: doc.dailyStreak,
    lastActiveDate: doc.lastActiveDate ? doc.lastActiveDate.toISOString() : undefined,
    banned: doc.banned,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const profileRepository = {
  async findByUserId(userId: string): Promise<ProfileDoc | null> {
    return collections.profiles().findOne({ userId });
  },

  async ensureProfile(user: { id: string; name?: string; email: string; role?: string }): Promise<ProfileDoc> {
    const existing = await collections.profiles().findOne({ userId: user.id });
    if (existing) {
      return existing;
    }

    const newProfile: ProfileDoc = {
      _id: new ObjectId(),
      userId: user.id,
      name: user.name || 'User',
      email: user.email,
      role: (user.role as 'user' | 'admin') || 'user',
      plan: 'free',
      xp: 0,
      dailyStreak: 0,
      banned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collections.profiles().insertOne(newProfile);
    return newProfile;
  },

  async updateOnboarding(
    userId: string,
    data: { targetBand: TargetBand; examDate: Date; currentLevel: UserLevel }
  ): Promise<ProfileDoc | null> {
    const res = await collections.profiles().findOneAndUpdate(
      { userId },
      {
        $set: {
          targetBand: data.targetBand,
          examDate: data.examDate,
          currentLevel: data.currentLevel,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    return res;
  },

  async addXpAndStreak(userId: string, xpToAdd: number): Promise<ProfileDoc | null> {
    const profile = await collections.profiles().findOne({ userId });
    if (!profile) return null;

    const now = new Date();
    let newStreak = profile.dailyStreak || 0;

    if (profile.lastActiveDate) {
      const lastDate = new Date(profile.lastActiveDate);
      const isToday =
        lastDate.getUTCFullYear() === now.getUTCFullYear() &&
        lastDate.getUTCMonth() === now.getUTCMonth() &&
        lastDate.getUTCDate() === now.getUTCDate();

      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const isYesterday =
        lastDate.getUTCFullYear() === yesterday.getUTCFullYear() &&
        lastDate.getUTCMonth() === yesterday.getUTCMonth() &&
        lastDate.getUTCDate() === yesterday.getUTCDate();

      if (!isToday) {
        if (isYesterday) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }
    } else {
      newStreak = 1;
    }

    const res = await collections.profiles().findOneAndUpdate(
      { userId },
      {
        $inc: { xp: xpToAdd },
        $set: {
          dailyStreak: newStreak,
          lastActiveDate: now,
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );
    return res;
  },

  async updateAvatar(userId: string, avatarUrl: string): Promise<ProfileDoc | null> {
    return collections.profiles().findOneAndUpdate(
      { userId },
      { $set: { avatarUrl, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
  },

  async updateRole(userId: string, role: 'user' | 'admin'): Promise<ProfileDoc | null> {
    return collections.profiles().findOneAndUpdate(
      { userId },
      { $set: { role, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
  },

  async setBanStatus(userId: string, banned: boolean, banReason?: string): Promise<ProfileDoc | null> {
    return collections.profiles().findOneAndUpdate(
      { userId },
      { $set: { banned, banReason, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
  },
};
