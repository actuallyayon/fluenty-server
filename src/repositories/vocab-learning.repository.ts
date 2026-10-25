import { ObjectId } from 'mongodb';
import { collections } from '../db/index.js';
import { profileRepository } from './profile.repository.js';
import type { VocabItemDoc, VocabProgressDoc } from '../types/collections.js';

export const vocabLearningRepository = {
  /**
   * Get flashcard deck for review:
   * Prioritizes words due for review (nextReviewDate <= now), then unstudied words.
   */
  async getFlashcardDeck(userId: string, limit = 20) {
    const now = new Date();

    // 1. Fetch user's existing progress
    const progressDocs = await collections
      .vocabProgress()
      .find({ userId })
      .toArray();

    const progressMap = new Map<string, VocabProgressDoc>();
    for (const p of progressDocs) {
      progressMap.set(p.vocabItemId.toString(), p);
    }

    // 2. Fetch user's bookmarks for vocab
    const bookmarks = await collections
      .bookmarks()
      .find({ userId, itemType: 'vocab' })
      .toArray();
    const bookmarkedIds = new Set(bookmarks.map((b) => b.itemId.toString()));

    // 3. Fetch all published vocab items
    const allVocab = await collections
      .vocabItems()
      .find({ status: 'published' })
      .sort({ createdAt: -1 })
      .toArray();

    // 4. Categorize into Due, New, and Future
    const dueCards: any[] = [];
    const newCards: any[] = [];
    const futureCards: any[] = [];

    for (const item of allVocab) {
      const idStr = item._id.toString();
      const progress = progressMap.get(idStr);
      const isBookmarked = bookmarkedIds.has(idStr);

      const card = {
        id: idStr,
        word: item.word,
        partOfSpeech: item.partOfSpeech,
        pronunciation: item.pronunciation || '',
        meaningEn: item.meaningEn,
        meaningBn: item.meaningBn,
        exampleEn: item.exampleEn,
        exampleBn: item.exampleBn,
        topic: item.topic,
        difficulty: item.difficulty,
        isBookmarked,
        progress: progress
          ? {
              repetition: progress.repetition,
              interval: progress.interval,
              easeFactor: progress.easeFactor,
              nextReviewDate: progress.nextReviewDate,
              lastReviewedDate: progress.lastReviewedDate,
              isDue: progress.nextReviewDate <= now,
            }
          : null,
      };

      if (!progress) {
        newCards.push(card);
      } else if (progress.nextReviewDate <= now) {
        dueCards.push(card);
      } else {
        futureCards.push(card);
      }
    }

    // Combine due cards first, then new unstudied cards, then remaining
    const sessionDeck = [...dueCards, ...newCards, ...futureCards].slice(0, limit);

    return {
      deck: sessionDeck,
      stats: {
        totalWords: allVocab.length,
        dueCount: dueCards.length,
        newCount: newCards.length,
        learnedCount: progressDocs.length,
      },
    };
  },

  /**
   * Process SM-2 Spaced Repetition rating for a vocabulary card:
   * Rating scale:
   * 1 = Again (failed to recall, reset interval to 1 day)
   * 2 = Hard (recalled with difficulty, lower ease)
   * 3 = Good (correct recall, standard ease progression)
   * 4 = Easy (instant effortless recall, bonus interval)
   */
  async recordReview(userId: string, vocabItemIdStr: string, rating: 1 | 2 | 3 | 4) {
    if (!ObjectId.isValid(vocabItemIdStr)) {
      throw new Error('Invalid vocabulary ID');
    }
    const vocabItemId = new ObjectId(vocabItemIdStr);
    const now = new Date();

    // 1. Fetch current progress or default
    const existing = await collections.vocabProgress().findOne({
      userId,
      vocabItemId,
    });

    let repetition = existing?.repetition || 0;
    let interval = existing?.interval || 1;
    let easeFactor = existing?.easeFactor || 2.5;

    // Quality mapping for SM-2: rating 1 -> quality 2, 2 -> 3, 3 -> 4, 4 -> 5
    const quality = rating + 1;

    // Update easeFactor
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) {
      easeFactor = 1.3;
    }

    // Calculate new interval
    if (rating === 1) {
      // Again: reset progress
      repetition = 0;
      interval = 1;
    } else {
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = rating === 4 ? 8 : 6;
      } else {
        const factor = rating === 4 ? easeFactor * 1.3 : rating === 2 ? easeFactor * 0.85 : easeFactor;
        interval = Math.max(1, Math.round(interval * factor));
      }
      repetition += 1;
    }

    const nextReviewDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    // 2. Persist updated progress atomically
    await collections.vocabProgress().updateOne(
      { userId, vocabItemId },
      {
        $set: {
          userId,
          vocabItemId,
          repetition,
          interval,
          easeFactor: Math.round(easeFactor * 100) / 100,
          nextReviewDate,
          lastReviewedDate: now,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // 3. Award XP (+10 XP per reviewed word) & increment daily streak
    const updatedProfile = await profileRepository.addXpAndStreak(userId, 10);

    return {
      success: true,
      progress: {
        repetition,
        interval,
        easeFactor,
        nextReviewDate,
        lastReviewedDate: now,
      },
      xpEarned: 10,
      totalXp: updatedProfile?.xp || 0,
      dailyStreak: updatedProfile?.dailyStreak || 1,
    };
  },

  /**
   * Get user vocabulary mastery stats
   */
  async getVocabStats(userId: string) {
    const now = new Date();

    const [totalVocab, userProgress] = await Promise.all([
      collections.vocabItems().countDocuments({ status: 'published' }),
      collections.vocabProgress().find({ userId }).toArray(),
    ]);

    let dueToday = 0;
    let mastered = 0; // interval >= 21 or repetition >= 4
    let learning = 0;

    for (const p of userProgress) {
      if (p.nextReviewDate <= now) {
        dueToday += 1;
      }
      if (p.repetition >= 4 || p.interval >= 21) {
        mastered += 1;
      } else {
        learning += 1;
      }
    }

    return {
      totalVocab,
      studiedVocab: userProgress.length,
      dueToday,
      learning,
      mastered,
      retentionRate: userProgress.length > 0 ? Math.round((mastered / userProgress.length) * 100) : 0,
    };
  },
};
