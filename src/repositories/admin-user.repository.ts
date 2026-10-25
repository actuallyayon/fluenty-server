import { ObjectId } from 'mongodb';
import { db, collections } from '../db/index.js';
import type { ProfileDoc, UserRole, PlanType } from '../types/collections.js';

export const adminUserRepository = {
  /**
   * List users with search, role/plan/banned filters, and pagination.
   */
  async listUsers(options: {
    search?: string;
    role?: string;
    plan?: string;
    status?: 'all' | 'banned' | 'active';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = {};

    if (options.role && options.role !== 'all') {
      query.role = options.role;
    }

    if (options.plan && options.plan !== 'all') {
      query.plan = options.plan;
    }

    if (options.status === 'banned') {
      query.banned = true;
    } else if (options.status === 'active') {
      query.banned = { $ne: true };
    }

    if (options.search) {
      query.$or = [
        { name: { $regex: options.search, $options: 'i' } },
        { email: { $regex: options.search, $options: 'i' } },
      ];
    }

    const [total, profiles] = await Promise.all([
      collections.profiles().countDocuments(query),
      collections
        .profiles()
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    return {
      users: profiles.map((p) => ({
        id: p._id.toString(),
        userId: p.userId,
        name: p.name,
        email: p.email,
        role: p.role,
        avatarUrl: p.avatarUrl,
        targetBand: p.targetBand,
        currentLevel: p.currentLevel,
        plan: p.plan,
        xp: p.xp || 0,
        dailyStreak: p.dailyStreak || 0,
        banned: Boolean(p.banned),
        banReason: p.banReason || '',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get single user detailed profile and activity overview.
   */
  async getUserDetail(userId: string) {
    const profile = await collections.profiles().findOne({
      $or: [
        { userId },
        ...(ObjectId.isValid(userId) ? [{ _id: new ObjectId(userId) }] : []),
      ],
    });

    if (!profile) return null;

    const [attemptsCount, vocabCount, bookmarksCount] = await Promise.all([
      collections.attempts().countDocuments({ userId: profile.userId }),
      collections.vocabProgress().countDocuments({ userId: profile.userId }),
      collections.bookmarks().countDocuments({ userId: profile.userId }),
    ]);

    return {
      profile: {
        id: profile._id.toString(),
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        avatarUrl: profile.avatarUrl,
        targetBand: profile.targetBand,
        examDate: profile.examDate,
        currentLevel: profile.currentLevel,
        plan: profile.plan,
        xp: profile.xp || 0,
        dailyStreak: profile.dailyStreak || 0,
        lastActiveDate: profile.lastActiveDate,
        banned: Boolean(profile.banned),
        banReason: profile.banReason,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      stats: {
        attemptsCount,
        vocabCount,
        bookmarksCount,
      },
    };
  },

  /**
   * Ban or unban user, syncing both Better Auth user collection and Fluenty profile.
   */
  async setBanStatus(userId: string, banned: boolean, banReason?: string) {
    const now = new Date();

    // 1. Update Fluenty profile
    const profile = await collections.profiles().findOneAndUpdate(
      {
        $or: [
          { userId },
          ...(ObjectId.isValid(userId) ? [{ _id: new ObjectId(userId) }] : []),
        ],
      },
      {
        $set: {
          banned,
          banReason: banned ? banReason || 'Administrative suspension' : '',
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    if (!profile) return null;

    // 2. Sync Better Auth user collection
    const betterAuthUserColl = db.collection('user');
    await betterAuthUserColl.updateOne(
      { id: profile.userId },
      {
        $set: {
          banned,
          banReason: banned ? banReason || 'Administrative suspension' : null,
          banExpires: null,
          updatedAt: now,
        },
      }
    );

    return profile;
  },

  /**
   * Promote or demote user role, syncing both Better Auth and Fluenty profile.
   */
  async setRole(userId: string, role: UserRole) {
    const now = new Date();

    // 1. Update Fluenty profile
    const profile = await collections.profiles().findOneAndUpdate(
      {
        $or: [
          { userId },
          ...(ObjectId.isValid(userId) ? [{ _id: new ObjectId(userId) }] : []),
        ],
      },
      {
        $set: {
          role,
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    if (!profile) return null;

    // 2. Sync Better Auth user collection
    const betterAuthUserColl = db.collection('user');
    await betterAuthUserColl.updateOne(
      { id: profile.userId },
      {
        $set: {
          role,
          updatedAt: now,
        },
      }
    );

    return profile;
  },

  /**
   * Grant or revoke premium manually on user profile.
   */
  async setPlan(userId: string, plan: PlanType) {
    const now = new Date();

    const profile = await collections.profiles().findOneAndUpdate(
      {
        $or: [
          { userId },
          ...(ObjectId.isValid(userId) ? [{ _id: new ObjectId(userId) }] : []),
        ],
      },
      {
        $set: {
          plan,
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    return profile;
  },
};
