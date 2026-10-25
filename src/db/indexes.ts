import { collections } from './index.js';

export async function setupIndexes(): Promise<void> {
  try {
    console.log('🔄 Setting up database indexes...');

    // 1. Unique index on profile's userId and email
    await collections.profiles().createIndex({ userId: 1 }, { unique: true });
    await collections.profiles().createIndex({ email: 1 });

    // 2. Vocab progress: user + item (unique), user + nextReviewDate
    await collections.vocabProgress().createIndex({ userId: 1, vocabItemId: 1 }, { unique: true });
    await collections.vocabProgress().createIndex({ userId: 1, nextReviewDate: 1 });

    // 3. Attempts: user + practiceType + createdAt
    await collections.attempts().createIndex({ userId: 1, practiceType: 1, createdAt: -1 });

    // 4. Mistakes: user + resolved + createdAt
    await collections.mistakes().createIndex({ userId: 1, resolved: 1, createdAt: -1 });
    await collections.mistakes().createIndex({ userId: 1, questionId: 1 });

    // 5. Bookmarks: user + itemType + itemId
    await collections.bookmarks().createIndex({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });

    // 6. Writing submissions: user + promptId + createdAt
    await collections.writingSubmissions().createIndex({ userId: 1, promptId: 1, createdAt: -1 });

    // 7. Tutor chats: user + updatedAt
    await collections.tutorChats().createIndex({ userId: 1, updatedAt: -1 });

    // 8. Study plans: user + weekStartDate
    await collections.studyPlans().createIndex({ userId: 1, weekStartDate: -1 });

    // 9. AI usage: user + dateStr + feature (unique compound index for atomic upserts)
    await collections.aiUsage().createIndex({ userId: 1, dateStr: 1, feature: 1 }, { unique: true });

    // 10. AI explanations cache: questionId + wrongAnswer + language
    await collections.aiExplanations().createIndex(
      { questionId: 1, wrongAnswer: 1, language: 1 },
      { unique: true }
    );

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Failed to create database indexes:', error);
    // Don't crash server if indexes already exist or fail on minor conflict
  }
}
