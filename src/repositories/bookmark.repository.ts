import { ObjectId } from 'mongodb';
import { collections } from '../db/index.js';
import type { BookmarkDoc } from '../types/collections.js';

export const bookmarkRepository = {
  /**
   * Toggle a bookmark: Adds if not saved, removes if already saved.
   */
  async toggleBookmark(
    userId: string,
    itemType: 'vocab' | 'question' | 'lesson',
    itemIdStr: string
  ): Promise<{ bookmarked: boolean }> {
    if (!ObjectId.isValid(itemIdStr)) {
      throw new Error('Invalid item ID');
    }
    const itemId = new ObjectId(itemIdStr);

    const existing = await collections.bookmarks().findOne({
      userId,
      itemType,
      itemId,
    });

    if (existing) {
      await collections.bookmarks().deleteOne({ _id: existing._id });
      return { bookmarked: false };
    } else {
      const doc: BookmarkDoc = {
        _id: new ObjectId(),
        userId,
        itemType,
        itemId,
        createdAt: new Date(),
      };
      await collections.bookmarks().insertOne(doc);
      return { bookmarked: true };
    }
  },

  /**
   * List all bookmarks for user with populated content details.
   */
  async listUserBookmarks(userId: string, itemType?: 'vocab' | 'question' | 'lesson') {
    const query: any = { userId };
    if (itemType) {
      query.itemType = itemType;
    }

    const bookmarkDocs = await collections
      .bookmarks()
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Group itemIds by type for batch lookups
    const vocabIds: ObjectId[] = [];
    const lessonIds: ObjectId[] = [];
    const questionIds: ObjectId[] = [];

    for (const b of bookmarkDocs) {
      if (b.itemType === 'vocab') vocabIds.push(b.itemId);
      else if (b.itemType === 'lesson') lessonIds.push(b.itemId);
      else if (b.itemType === 'question') questionIds.push(b.itemId);
    }

    const [vocabItems, lessonItems, questionItems] = await Promise.all([
      vocabIds.length
        ? collections.vocabItems().find({ _id: { $in: vocabIds } }).toArray()
        : [],
      lessonIds.length
        ? collections.lessons().find({ _id: { $in: lessonIds } }).toArray()
        : [],
      questionIds.length
        ? collections.questions().find({ _id: { $in: questionIds } }).toArray()
        : [],
    ]);

    const vocabMap = new Map(vocabItems.map((v) => [v._id.toString(), v]));
    const lessonMap = new Map(lessonItems.map((l) => [l._id.toString(), l]));
    const questionMap = new Map(questionItems.map((q) => [q._id.toString(), q]));

    return bookmarkDocs.map((b) => {
      const itemIdStr = b.itemId.toString();
      let itemData: any = null;

      if (b.itemType === 'vocab') {
        const v = vocabMap.get(itemIdStr);
        if (v) {
          itemData = {
            id: v._id.toString(),
            word: v.word,
            partOfSpeech: v.partOfSpeech,
            meaningBn: v.meaningBn,
            meaningEn: v.meaningEn,
            exampleEn: v.exampleEn,
            difficulty: v.difficulty,
          };
        }
      } else if (b.itemType === 'lesson') {
        const l = lessonMap.get(itemIdStr);
        if (l) {
          itemData = {
            id: l._id.toString(),
            title: l.title,
            titleBn: l.titleBn,
            category: l.category,
            subCategory: l.subCategory,
            commonMistakesCount: l.commonMistakesBn?.length || 0,
          };
        }
      } else if (b.itemType === 'question') {
        const q = questionMap.get(itemIdStr);
        if (q) {
          itemData = {
            id: q._id.toString(),
            prompt: q.prompt,
            type: q.type,
            correctAnswer: q.correctAnswer,
          };
        }
      }

      return {
        id: b._id.toString(),
        itemType: b.itemType,
        itemId: itemIdStr,
        createdAt: b.createdAt,
        item: itemData,
      };
    }).filter((b) => b.item !== null);
  },
};
