import { ObjectId } from 'mongodb';
import { collections } from '../db/index.js';
import { profileRepository } from './profile.repository.js';
import type {
  PassageDoc,
  QuestionDoc,
  ListeningItemDoc,
  AttemptDoc,
  MistakeDoc,
} from '../types/collections.js';

export interface PracticeQuestionResult {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanationBn: string;
  explanationEn: string;
  evidenceQuote?: string;
  prompt: string;
  type: string;
  order: number;
}

export interface PracticeAttemptResult {
  attemptId: string;
  practiceType: 'reading' | 'listening';
  passageId?: string;
  listeningItemId?: string;
  title: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  xpEarned: number;
  totalXp: number;
  dailyStreak: number;
  timeSpentSeconds: number;
  results: PracticeQuestionResult[];
  transcript?: string; // Revealed for listening items after submission
}

export const practiceRepository = {
  // ================= READING =================
  async getPublishedPassages(): Promise<
    Array<{
      id: string;
      title: string;
      difficulty: string;
      timeLimitMinutes: number;
      questionCount: number;
      createdAt: Date;
    }>
  > {
    const passages = await collections
      .passages()
      .find({ status: 'published' })
      .sort({ createdAt: -1 })
      .toArray();

    const results = await Promise.all(
      passages.map(async (passage) => {
        const questionCount = await collections.questions().countDocuments({
          passageId: passage._id,
          status: 'published',
        });

        return {
          id: passage._id.toString(),
          title: passage.title,
          difficulty: passage.difficulty,
          timeLimitMinutes: passage.timeLimitMinutes,
          questionCount,
          createdAt: passage.createdAt,
        };
      })
    );

    return results;
  },

  async getPassageForPractice(passageId: string): Promise<{
    passage: {
      id: string;
      title: string;
      content: string;
      difficulty: string;
      timeLimitMinutes: number;
    };
    questions: Array<{
      id: string;
      type: string;
      prompt: string;
      options?: string[];
      order: number;
    }>;
  } | null> {
    if (!ObjectId.isValid(passageId)) return null;

    const pId = new ObjectId(passageId);
    const passage = await collections.passages().findOne({ _id: pId, status: 'published' });
    if (!passage) return null;

    const questions = await collections
      .questions()
      .find({ passageId: pId, status: 'published' })
      .sort({ order: 1 })
      .project<{
        _id: ObjectId;
        type: string;
        prompt: string;
        options?: string[];
        order: number;
      }>({
        _id: 1,
        type: 1,
        prompt: 1,
        options: 1,
        order: 1,
        // Deliberately omit correctAnswer, explanationBn, explanationEn, evidenceQuote during practice
      })
      .toArray();

    return {
      passage: {
        id: passage._id.toString(),
        title: passage.title,
        content: passage.content,
        difficulty: passage.difficulty,
        timeLimitMinutes: passage.timeLimitMinutes,
      },
      questions: questions.map((q) => ({
        id: q._id.toString(),
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        order: q.order,
      })),
    };
  },

  async submitReadingAttempt(
    userId: string,
    passageId: string,
    userAnswers: Array<{ questionId: string; userAnswer: string }>,
    timeSpentSeconds: number
  ): Promise<PracticeAttemptResult | null> {
    if (!ObjectId.isValid(passageId)) return null;
    const pId = new ObjectId(passageId);

    const passage = await collections.passages().findOne({ _id: pId, status: 'published' });
    if (!passage) return null;

    const questions = await collections
      .questions()
      .find({ passageId: pId, status: 'published' })
      .sort({ order: 1 })
      .toArray();

    if (questions.length === 0) return null;

    const answersMap = new Map(
      userAnswers.map((a) => [a.questionId, a.userAnswer ? a.userAnswer.trim() : ''])
    );

    let score = 0;
    const evaluatedResults: PracticeQuestionResult[] = [];
    const attemptAnswersToStore: AttemptDoc['answers'] = [];

    for (const q of questions) {
      const qIdStr = q._id.toString();
      const uAnswer = answersMap.get(qIdStr) || '';
      const cAnswer = q.correctAnswer.trim();

      // Flexible matching:
      // For True/False/Not Given and multiple choice: case-insensitive match
      // For fill_in_the_blank: case-insensitive, strip punctuation
      const isCorrect = this.compareAnswers(q.type, uAnswer, cAnswer);

      if (isCorrect) {
        score++;
        // If user previously made a mistake on this question, mark it as resolved
        await collections.mistakes().updateMany(
          { userId, questionId: q._id },
          { $set: { resolved: true, updatedAt: new Date() } }
        );
      } else {
        // Record mistake in mistake notebook
        await collections.mistakes().updateOne(
          { userId, questionId: q._id },
          {
            $set: {
              userId,
              questionId: q._id,
              practiceType: 'reading',
              userAnswer: uAnswer || '(Unanswered)',
              correctAnswer: cAnswer,
              explanationBn: q.explanationBn,
              explanationEn: q.explanationEn,
              resolved: false,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              _id: new ObjectId(),
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      evaluatedResults.push({
        questionId: qIdStr,
        userAnswer: uAnswer || '(Unanswered)',
        correctAnswer: cAnswer,
        isCorrect,
        explanationBn: q.explanationBn,
        explanationEn: q.explanationEn,
        evidenceQuote: q.evidenceQuote,
        prompt: q.prompt,
        type: q.type,
        order: q.order,
      });

      attemptAnswersToStore.push({
        questionId: q._id,
        userAnswer: uAnswer || '(Unanswered)',
        correctAnswer: cAnswer,
        isCorrect,
      });
    }

    const totalQuestions = questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    // Gamification: +15 XP per correct answer + 20 XP completion bonus
    const xpEarned = score * 15 + 20;
    const updatedProfile = await profileRepository.addXpAndStreak(userId, xpEarned);

    // Save attempt record
    const attemptDoc: AttemptDoc = {
      _id: new ObjectId(),
      userId,
      practiceType: 'reading',
      passageId: pId,
      totalQuestions,
      score,
      percentage,
      answers: attemptAnswersToStore,
      timeSpentSeconds: Math.max(1, timeSpentSeconds),
      createdAt: new Date(),
    };

    await collections.attempts().insertOne(attemptDoc);

    return {
      attemptId: attemptDoc._id.toString(),
      practiceType: 'reading',
      passageId,
      title: passage.title,
      score,
      totalQuestions,
      percentage,
      xpEarned,
      totalXp: updatedProfile?.xp || 0,
      dailyStreak: updatedProfile?.dailyStreak || 1,
      timeSpentSeconds: attemptDoc.timeSpentSeconds,
      results: evaluatedResults,
    };
  },

  // ================= LISTENING =================
  async getPublishedListeningItems(): Promise<
    Array<{
      id: string;
      title: string;
      audioUrl: string;
      section: 1 | 2 | 3 | 4;
      questionCount: number;
      createdAt: Date;
    }>
  > {
    const items = await collections
      .listeningItems()
      .find({ status: 'published' })
      .sort({ section: 1, createdAt: -1 })
      .toArray();

    const results = await Promise.all(
      items.map(async (item) => {
        const questionCount = await collections.questions().countDocuments({
          listeningItemId: item._id,
          status: 'published',
        });

        return {
          id: item._id.toString(),
          title: item.title,
          audioUrl: item.audioUrl,
          section: item.section,
          questionCount,
          createdAt: item.createdAt,
        };
      })
    );

    return results;
  },

  async getListeningItemForPractice(itemId: string): Promise<{
    item: {
      id: string;
      title: string;
      audioUrl: string;
      section: number;
    };
    questions: Array<{
      id: string;
      type: string;
      prompt: string;
      options?: string[];
      order: number;
    }>;
  } | null> {
    if (!ObjectId.isValid(itemId)) return null;

    const iId = new ObjectId(itemId);
    const item = await collections.listeningItems().findOne({ _id: iId, status: 'published' });
    if (!item) return null;

    const questions = await collections
      .questions()
      .find({ listeningItemId: iId, status: 'published' })
      .sort({ order: 1 })
      .project<{
        _id: ObjectId;
        type: string;
        prompt: string;
        options?: string[];
        order: number;
      }>({
        _id: 1,
        type: 1,
        prompt: 1,
        options: 1,
        order: 1,
        // Omit correctAnswer, explanations, evidenceQuote
      })
      .toArray();

    return {
      item: {
        id: item._id.toString(),
        title: item.title,
        audioUrl: item.audioUrl,
        section: item.section,
        // Transcript is strictly hidden during test
      },
      questions: questions.map((q) => ({
        id: q._id.toString(),
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        order: q.order,
      })),
    };
  },

  async submitListeningAttempt(
    userId: string,
    itemId: string,
    userAnswers: Array<{ questionId: string; userAnswer: string }>,
    timeSpentSeconds: number
  ): Promise<PracticeAttemptResult | null> {
    if (!ObjectId.isValid(itemId)) return null;
    const iId = new ObjectId(itemId);

    const item = await collections.listeningItems().findOne({ _id: iId, status: 'published' });
    if (!item) return null;

    const questions = await collections
      .questions()
      .find({ listeningItemId: iId, status: 'published' })
      .sort({ order: 1 })
      .toArray();

    if (questions.length === 0) return null;

    const answersMap = new Map(
      userAnswers.map((a) => [a.questionId, a.userAnswer ? a.userAnswer.trim() : ''])
    );

    let score = 0;
    const evaluatedResults: PracticeQuestionResult[] = [];
    const attemptAnswersToStore: AttemptDoc['answers'] = [];

    for (const q of questions) {
      const qIdStr = q._id.toString();
      const uAnswer = answersMap.get(qIdStr) || '';
      const cAnswer = q.correctAnswer.trim();

      const isCorrect = this.compareAnswers(q.type, uAnswer, cAnswer);

      if (isCorrect) {
        score++;
        await collections.mistakes().updateMany(
          { userId, questionId: q._id },
          { $set: { resolved: true, updatedAt: new Date() } }
        );
      } else {
        await collections.mistakes().updateOne(
          { userId, questionId: q._id },
          {
            $set: {
              userId,
              questionId: q._id,
              practiceType: 'listening',
              userAnswer: uAnswer || '(Unanswered)',
              correctAnswer: cAnswer,
              explanationBn: q.explanationBn,
              explanationEn: q.explanationEn,
              resolved: false,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              _id: new ObjectId(),
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      evaluatedResults.push({
        questionId: qIdStr,
        userAnswer: uAnswer || '(Unanswered)',
        correctAnswer: cAnswer,
        isCorrect,
        explanationBn: q.explanationBn,
        explanationEn: q.explanationEn,
        evidenceQuote: q.evidenceQuote,
        prompt: q.prompt,
        type: q.type,
        order: q.order,
      });

      attemptAnswersToStore.push({
        questionId: q._id,
        userAnswer: uAnswer || '(Unanswered)',
        correctAnswer: cAnswer,
        isCorrect,
      });
    }

    const totalQuestions = questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    const xpEarned = score * 15 + 20;
    const updatedProfile = await profileRepository.addXpAndStreak(userId, xpEarned);

    const attemptDoc: AttemptDoc = {
      _id: new ObjectId(),
      userId,
      practiceType: 'listening',
      listeningItemId: iId,
      totalQuestions,
      score,
      percentage,
      answers: attemptAnswersToStore,
      timeSpentSeconds: Math.max(1, timeSpentSeconds),
      createdAt: new Date(),
    };

    await collections.attempts().insertOne(attemptDoc);

    return {
      attemptId: attemptDoc._id.toString(),
      practiceType: 'listening',
      listeningItemId: itemId,
      title: item.title,
      score,
      totalQuestions,
      percentage,
      xpEarned,
      totalXp: updatedProfile?.xp || 0,
      dailyStreak: updatedProfile?.dailyStreak || 1,
      timeSpentSeconds: attemptDoc.timeSpentSeconds,
      results: evaluatedResults,
      transcript: item.transcript, // Transcript is revealed to user upon completion
    };
  },

  // ================= MISTAKE NOTEBOOK =================
  async getMistakes(
    userId: string,
    filters?: { practiceType?: 'reading' | 'listening'; resolved?: boolean }
  ): Promise<
    Array<{
      id: string;
      practiceType: 'reading' | 'listening';
      userAnswer: string;
      correctAnswer: string;
      explanationBn?: string;
      explanationEn?: string;
      resolved: boolean;
      createdAt: Date;
      question: {
        id: string;
        prompt: string;
        type: string;
        options?: string[];
        evidenceQuote?: string;
        contextTitle?: string;
        contextId?: string;
      };
    }>
  > {
    const query: Record<string, any> = { userId };
    if (filters?.practiceType) query.practiceType = filters.practiceType;
    if (typeof filters?.resolved === 'boolean') query.resolved = filters.resolved;

    const mistakes = await collections
      .mistakes()
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const results = await Promise.all(
      mistakes.map(async (m) => {
        const question = await collections.questions().findOne({ _id: m.questionId });
        let contextTitle = '';
        let contextId = '';

        if (question?.passageId) {
          const passage = await collections.passages().findOne({ _id: question.passageId });
          if (passage) {
            contextTitle = passage.title;
            contextId = passage._id.toString();
          }
        } else if (question?.listeningItemId) {
          const item = await collections.listeningItems().findOne({ _id: question.listeningItemId });
          if (item) {
            contextTitle = item.title;
            contextId = item._id.toString();
          }
        }

        return {
          id: m._id.toString(),
          practiceType: m.practiceType,
          userAnswer: m.userAnswer,
          correctAnswer: m.correctAnswer,
          explanationBn: m.explanationBn || question?.explanationBn,
          explanationEn: m.explanationEn || question?.explanationEn,
          resolved: m.resolved,
          createdAt: m.createdAt,
          question: {
            id: m.questionId.toString(),
            prompt: question?.prompt || 'Question prompt unavailable',
            type: question?.type || 'multiple_choice',
            options: question?.options,
            evidenceQuote: question?.evidenceQuote,
            contextTitle,
            contextId,
          },
        };
      })
    );

    return results;
  },

  async toggleMistakeResolved(userId: string, mistakeId: string): Promise<MistakeDoc | null> {
    if (!ObjectId.isValid(mistakeId)) return null;

    const mistake = await collections.mistakes().findOne({ _id: new ObjectId(mistakeId), userId });
    if (!mistake) return null;

    const updated = await collections.mistakes().findOneAndUpdate(
      { _id: mistake._id },
      { $set: { resolved: !mistake.resolved, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    return updated;
  },

  async deleteMistake(userId: string, mistakeId: string): Promise<boolean> {
    if (!ObjectId.isValid(mistakeId)) return false;

    const res = await collections.mistakes().deleteOne({ _id: new ObjectId(mistakeId), userId });
    return res.deletedCount > 0;
  },

  // ================= ATTEMPT HISTORY =================
  async getUserAttempts(
    userId: string,
    limit: number = 10
  ): Promise<
    Array<{
      id: string;
      practiceType: 'reading' | 'listening';
      title: string;
      score: number;
      totalQuestions: number;
      percentage: number;
      timeSpentSeconds: number;
      createdAt: Date;
    }>
  > {
    const attempts = await collections
      .attempts()
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const results = await Promise.all(
      attempts.map(async (att) => {
        let title = 'Practice Session';
        if (att.passageId) {
          const passage = await collections.passages().findOne({ _id: att.passageId });
          if (passage) title = passage.title;
        } else if (att.listeningItemId) {
          const item = await collections.listeningItems().findOne({ _id: att.listeningItemId });
          if (item) title = item.title;
        }

        return {
          id: att._id.toString(),
          practiceType: att.practiceType,
          title,
          score: att.score,
          totalQuestions: att.totalQuestions,
          percentage: att.percentage,
          timeSpentSeconds: att.timeSpentSeconds,
          createdAt: att.createdAt,
        };
      })
    );

    return results;
  },

  // ================= ANSWER COMPARISON HELPER =================
  compareAnswers(type: string, userAnswer: string, correctAnswer: string): boolean {
    if (!userAnswer || !correctAnswer) return false;

    const cleanUser = userAnswer.trim().toLowerCase();
    const cleanCorrect = correctAnswer.trim().toLowerCase();

    // Exact or normalized match
    if (cleanUser === cleanCorrect) return true;

    // Handle True / False / Not Given variations (e.g. T, F, NG)
    if (type === 'true_false_not_given') {
      if (cleanCorrect === 'true' && (cleanUser === 'true' || cleanUser === 't')) return true;
      if (cleanCorrect === 'false' && (cleanUser === 'false' || cleanUser === 'f')) return true;
      if (cleanCorrect === 'not given' && (cleanUser === 'not given' || cleanUser === 'ng')) return true;
      return false;
    }

    // Handle Multiple Choice (e.g., user selected "A. Option" vs "A" or just the option text)
    if (type === 'multiple_choice') {
      // If user selected option letter like "A" and correct answer starts with "A."
      if (cleanCorrect.startsWith(cleanUser + '.') || cleanCorrect.startsWith(cleanUser + ')')) {
        return true;
      }
      if (cleanUser.startsWith(cleanCorrect + '.') || cleanUser.startsWith(cleanCorrect + ')')) {
        return true;
      }
      // If the text without the letter prefix matches
      const stripOptionPrefix = (str: string) => str.replace(/^[a-d][.)]\s*/i, '').trim();
      return stripOptionPrefix(cleanUser) === stripOptionPrefix(cleanCorrect);
    }

    // Handle Fill in the blank
    if (type === 'fill_in_the_blank') {
      // Strip punctuation and multiple spaces
      const normalize = (s: string) =>
        s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').replace(/\s+/g, ' ').trim();
      return normalize(cleanUser) === normalize(cleanCorrect);
    }

    // Matching Headings
    if (type === 'matching_headings') {
      return cleanUser === cleanCorrect;
    }

    return false;
  },
};
