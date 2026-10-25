import { ObjectId } from 'mongodb';
import { collections } from '../db/index.js';
import type {
  VocabItemDoc,
  LessonDoc,
  PassageDoc,
  QuestionDoc,
  ListeningItemDoc,
  WritingPromptDoc,
  SpeakingCueDoc,
} from '../types/collections.js';

export const contentRepository = {
  // ==========================================
  // Overview Counts & Stats
  // ==========================================
  async getOverviewStats() {
    const [vocab, lessons, passages, questions, listening, writing, speaking, profiles] =
      await Promise.all([
        collections.vocabItems().countDocuments(),
        collections.lessons().countDocuments(),
        collections.passages().countDocuments(),
        collections.questions().countDocuments(),
        collections.listeningItems().countDocuments(),
        collections.writingPrompts().countDocuments(),
        collections.speakingCues().countDocuments(),
        collections.profiles().countDocuments(),
      ]);

    const activeUsers = await collections.profiles().countDocuments({ banned: false });
    const premiumUsers = await collections.profiles().countDocuments({ plan: 'premium' });

    return {
      vocab,
      lessons,
      passages,
      questions,
      listening,
      writing,
      speaking,
      totalUsers: profiles,
      activeUsers,
      premiumUsers,
    };
  },

  // ==========================================
  // 1. Vocabulary CRUD
  // ==========================================
  async listVocab(filter?: { status?: string; search?: string; difficulty?: string }) {
    const query: any = {};
    if (filter?.status && filter.status !== 'all') {
      query.status = filter.status;
    }
    if (filter?.difficulty && filter.difficulty !== 'all') {
      query.difficulty = filter.difficulty;
    }
    if (filter?.search) {
      query.$or = [
        { word: { $regex: filter.search, $options: 'i' } },
        { meaningBn: { $regex: filter.search, $options: 'i' } },
        { meaningEn: { $regex: filter.search, $options: 'i' } },
        { topic: { $regex: filter.search, $options: 'i' } },
      ];
    }
    return collections.vocabItems().find(query).sort({ createdAt: -1 }).toArray();
  },

  async getVocabById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return collections.vocabItems().findOne({ _id: new ObjectId(id) });
  },

  async createVocab(data: Omit<VocabItemDoc, '_id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const doc: VocabItemDoc = {
      _id: new ObjectId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await collections.vocabItems().insertOne(doc);
    return doc;
  },

  async updateVocab(id: string, data: Partial<Omit<VocabItemDoc, '_id' | 'createdAt'>>) {
    if (!ObjectId.isValid(id)) return null;
    const result = await collections.vocabItems().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async deleteVocab(id: string) {
    if (!ObjectId.isValid(id)) return false;
    const res = await collections.vocabItems().deleteOne({ _id: new ObjectId(id) });
    return res.deletedCount > 0;
  },

  // ==========================================
  // 2. Lessons CRUD
  // ==========================================
  async listLessons(filter?: { category?: string; status?: string; search?: string }) {
    const query: any = {};
    if (filter?.category && filter.category !== 'all') {
      query.category = filter.category;
    }
    if (filter?.status && filter.status !== 'all') {
      query.status = filter.status;
    }
    if (filter?.search) {
      query.$or = [
        { title: { $regex: filter.search, $options: 'i' } },
        { titleBn: { $regex: filter.search, $options: 'i' } },
        { subCategory: { $regex: filter.search, $options: 'i' } },
      ];
    }
    return collections.lessons().find(query).sort({ order: 1, createdAt: -1 }).toArray();
  },

  async getLessonById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return collections.lessons().findOne({ _id: new ObjectId(id) });
  },

  async createLesson(data: Omit<LessonDoc, '_id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const doc: LessonDoc = {
      _id: new ObjectId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await collections.lessons().insertOne(doc);
    return doc;
  },

  async updateLesson(id: string, data: Partial<Omit<LessonDoc, '_id' | 'createdAt'>>) {
    if (!ObjectId.isValid(id)) return null;
    const result = await collections.lessons().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async deleteLesson(id: string) {
    if (!ObjectId.isValid(id)) return false;
    const res = await collections.lessons().deleteOne({ _id: new ObjectId(id) });
    return res.deletedCount > 0;
  },

  // ==========================================
  // 3. Reading Passages CRUD
  // ==========================================
  async listPassages(filter?: { difficulty?: string; status?: string; search?: string }) {
    const query: any = {};
    if (filter?.difficulty && filter.difficulty !== 'all') {
      query.difficulty = filter.difficulty;
    }
    if (filter?.status && filter.status !== 'all') {
      query.status = filter.status;
    }
    if (filter?.search) {
      query.$or = [
        { title: { $regex: filter.search, $options: 'i' } },
        { content: { $regex: filter.search, $options: 'i' } },
      ];
    }
    return collections.passages().find(query).sort({ createdAt: -1 }).toArray();
  },

  async getPassageById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return collections.passages().findOne({ _id: new ObjectId(id) });
  },

  async createPassage(data: Omit<PassageDoc, '_id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const doc: PassageDoc = {
      _id: new ObjectId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await collections.passages().insertOne(doc);
    return doc;
  },

  async updatePassage(id: string, data: Partial<Omit<PassageDoc, '_id' | 'createdAt'>>) {
    if (!ObjectId.isValid(id)) return null;
    const result = await collections.passages().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async deletePassage(id: string) {
    if (!ObjectId.isValid(id)) return false;
    const pid = new ObjectId(id);
    await collections.questions().deleteMany({ passageId: pid });
    const res = await collections.passages().deleteOne({ _id: pid });
    return res.deletedCount > 0;
  },

  // ==========================================
  // 4. Questions CRUD
  // ==========================================
  async listQuestions(filter?: { passageId?: string; listeningItemId?: string; status?: string }) {
    const query: any = {};
    if (filter?.passageId && ObjectId.isValid(filter.passageId)) {
      query.passageId = new ObjectId(filter.passageId);
    }
    if (filter?.listeningItemId && ObjectId.isValid(filter.listeningItemId)) {
      query.listeningItemId = new ObjectId(filter.listeningItemId);
    }
    if (filter?.status && filter.status !== 'all') {
      query.status = filter.status;
    }
    return collections.questions().find(query).sort({ order: 1, createdAt: 1 }).toArray();
  },

  async getQuestionById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return collections.questions().findOne({ _id: new ObjectId(id) });
  },

  async createQuestion(data: Omit<QuestionDoc, '_id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const doc: QuestionDoc = {
      _id: new ObjectId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await collections.questions().insertOne(doc);
    return doc;
  },

  async updateQuestion(id: string, data: Partial<Omit<QuestionDoc, '_id' | 'createdAt'>>) {
    if (!ObjectId.isValid(id)) return null;
    const result = await collections.questions().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async deleteQuestion(id: string) {
    if (!ObjectId.isValid(id)) return false;
    const res = await collections.questions().deleteOne({ _id: new ObjectId(id) });
    return res.deletedCount > 0;
  },

  // ==========================================
  // 5. Listening Items CRUD
  // ==========================================
  async listListening(filter?: { section?: number; status?: string; search?: string }) {
    const query: any = {};
    if (filter?.section) {
      query.section = filter.section;
    }
    if (filter?.status && filter.status !== 'all') {
      query.status = filter.status;
    }
    if (filter?.search) {
      query.$or = [
        { title: { $regex: filter.search, $options: 'i' } },
        { transcript: { $regex: filter.search, $options: 'i' } },
      ];
    }
    return collections.listeningItems().find(query).sort({ section: 1, createdAt: -1 }).toArray();
  },

  async getListeningById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return collections.listeningItems().findOne({ _id: new ObjectId(id) });
  },

  async createListening(data: Omit<ListeningItemDoc, '_id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const doc: ListeningItemDoc = {
      _id: new ObjectId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await collections.listeningItems().insertOne(doc);
    return doc;
  },

  async updateListening(id: string, data: Partial<Omit<ListeningItemDoc, '_id' | 'createdAt'>>) {
    if (!ObjectId.isValid(id)) return null;
    const result = await collections.listeningItems().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async deleteListening(id: string) {
    if (!ObjectId.isValid(id)) return false;
    const lid = new ObjectId(id);
    await collections.questions().deleteMany({ listeningItemId: lid });
    const res = await collections.listeningItems().deleteOne({ _id: lid });
    return res.deletedCount > 0;
  },

  // ==========================================
  // 6. Writing Prompts CRUD
  // ==========================================
  async listWritingPrompts(filter?: { taskType?: string; status?: string; search?: string }) {
    const query: any = {};
    if (filter?.taskType && filter.taskType !== 'all') {
      query.taskType = filter.taskType;
    }
    if (filter?.status && filter.status !== 'all') {
      query.status = filter.status;
    }
    if (filter?.search) {
      query.$or = [
        { title: { $regex: filter.search, $options: 'i' } },
        { prompt: { $regex: filter.search, $options: 'i' } },
      ];
    }
    return collections.writingPrompts().find(query).sort({ createdAt: -1 }).toArray();
  },

  async getWritingPromptById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return collections.writingPrompts().findOne({ _id: new ObjectId(id) });
  },

  async createWritingPrompt(data: Omit<WritingPromptDoc, '_id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const doc: WritingPromptDoc = {
      _id: new ObjectId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await collections.writingPrompts().insertOne(doc);
    return doc;
  },

  async updateWritingPrompt(
    id: string,
    data: Partial<Omit<WritingPromptDoc, '_id' | 'createdAt'>>
  ) {
    if (!ObjectId.isValid(id)) return null;
    const result = await collections.writingPrompts().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async deleteWritingPrompt(id: string) {
    if (!ObjectId.isValid(id)) return false;
    const res = await collections.writingPrompts().deleteOne({ _id: new ObjectId(id) });
    return res.deletedCount > 0;
  },

  // ==========================================
  // 7. Speaking Cues CRUD
  // ==========================================
  async listSpeakingCues(filter?: { part?: number; status?: string; search?: string }) {
    const query: any = {};
    if (filter?.part) {
      query.part = filter.part;
    }
    if (filter?.status && filter.status !== 'all') {
      query.status = filter.status;
    }
    if (filter?.search) {
      query.$or = [
        { topic: { $regex: filter.search, $options: 'i' } },
        { topicBn: { $regex: filter.search, $options: 'i' } },
        { cueCard: { $regex: filter.search, $options: 'i' } },
      ];
    }
    return collections.speakingCues().find(query).sort({ part: 1, createdAt: -1 }).toArray();
  },

  async getSpeakingCueById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return collections.speakingCues().findOne({ _id: new ObjectId(id) });
  },

  async createSpeakingCue(data: Omit<SpeakingCueDoc, '_id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    const doc: SpeakingCueDoc = {
      _id: new ObjectId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await collections.speakingCues().insertOne(doc);
    return doc;
  },

  async updateSpeakingCue(id: string, data: Partial<Omit<SpeakingCueDoc, '_id' | 'createdAt'>>) {
    if (!ObjectId.isValid(id)) return null;
    const result = await collections.speakingCues().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return result;
  },

  async deleteSpeakingCue(id: string) {
    if (!ObjectId.isValid(id)) return false;
    const res = await collections.speakingCues().deleteOne({ _id: new ObjectId(id) });
    return res.deletedCount > 0;
  },
};
