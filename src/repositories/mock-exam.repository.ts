import { ObjectId } from 'mongodb';
import { collections } from '../db/index.js';
import { profileRepository } from './profile.repository.js';
import { geminiService } from '../services/ai/gemini.service.js';
import type { MockExamDoc, MockExamAttemptDoc } from '../types/collections.js';

export const mockExamRepository = {
  // 1. List published mock exams
  async listPublishedMockExams(): Promise<
    Array<{
      id: string;
      title: string;
      descriptionBn: string;
      descriptionEn: string;
      difficulty: string;
      createdAt: Date;
    }>
  > {
    const exams = await collections
      .mockExams()
      .find({ status: 'published' })
      .sort({ createdAt: -1 })
      .toArray();

    return exams.map((e) => ({
      id: e._id.toString(),
      title: e.title,
      descriptionBn: e.descriptionBn,
      descriptionEn: e.descriptionEn,
      difficulty: e.difficulty,
      createdAt: e.createdAt,
    }));
  },

  // 2. Get full details of a mock exam
  async getMockExamDetail(examId: string) {
    if (!ObjectId.isValid(examId)) return null;
    const exam = await collections.mockExams().findOne({ _id: new ObjectId(examId) });
    if (!exam) return null;

    // Fetch related sections
    const [readingPassage, listeningItem, writingTask1, writingTask2, speakingCue] =
      await Promise.all([
        collections.passages().findOne({ _id: exam.readingPassageId }),
        collections.listeningItems().findOne({ _id: exam.listeningItemId }),
        collections.writingPrompts().findOne({ _id: exam.writingTask1PromptId }),
        collections.writingPrompts().findOne({ _id: exam.writingTask2PromptId }),
        collections.speakingCues().findOne({ _id: exam.speakingCueId }),
      ]);

    const readingQuestions = readingPassage
      ? await collections
          .questions()
          .find({ passageId: readingPassage._id })
          .sort({ order: 1 })
          .toArray()
      : [];

    const listeningQuestions = listeningItem
      ? await collections
          .questions()
          .find({ listeningItemId: listeningItem._id })
          .sort({ order: 1 })
          .toArray()
      : [];

    return {
      id: exam._id.toString(),
      title: exam.title,
      descriptionBn: exam.descriptionBn,
      descriptionEn: exam.descriptionEn,
      difficulty: exam.difficulty,
      reading: readingPassage
        ? {
            id: readingPassage._id.toString(),
            title: readingPassage.title,
            content: readingPassage.content,
            timeLimitMinutes: 20,
            questions: readingQuestions.map((q) => ({
              id: q._id.toString(),
              order: q.order,
              prompt: q.prompt,
              type: q.type,
              options: q.options,
            })),
          }
        : null,
      listening: listeningItem
        ? {
            id: listeningItem._id.toString(),
            title: listeningItem.title,
            audioUrl: listeningItem.audioUrl,
            section: listeningItem.section,
            questions: listeningQuestions.map((q) => ({
              id: q._id.toString(),
              order: q.order,
              prompt: q.prompt,
              type: q.type,
              options: q.options,
            })),
          }
        : null,
      writing: {
        task1: writingTask1
          ? {
              id: writingTask1._id.toString(),
              title: writingTask1.title,
              prompt: writingTask1.prompt,
            }
          : null,
        task2: writingTask2
          ? {
              id: writingTask2._id.toString(),
              title: writingTask2.title,
              prompt: writingTask2.prompt,
            }
          : null,
      },
      speaking: speakingCue
        ? {
            id: speakingCue._id.toString(),
            topic: speakingCue.topic,
            cueCard: speakingCue.cueCard,
          }
        : null,
    };
  },

  // 3. Start a mock exam attempt
  async startAttempt(userId: string, mockExamId: string): Promise<string> {
    const attemptDoc: MockExamAttemptDoc = {
      _id: new ObjectId(),
      userId,
      mockExamId: new ObjectId(mockExamId),
      status: 'in_progress',
      currentSection: 'listening',
      timeSpentSeconds: {
        listening: 0,
        reading: 0,
        writing: 0,
        speaking: 0,
      },
      listeningAnswers: [],
      readingAnswers: [],
      writingSubmissions: {},
      scores: {
        listeningScore: 0,
        listeningTotal: 0,
        listeningBand: 0,
        readingScore: 0,
        readingTotal: 0,
        readingBand: 0,
        writingBand: 0,
        speakingBand: 0,
        overallBand: 0,
      },
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collections.mockExamAttempts().insertOne(attemptDoc);
    return attemptDoc._id.toString();
  },

  // Helper: Raw score to IELTS Band converter
  calculateBand(score: number, total: number): number {
    if (total === 0) return 0;
    const pct = (score / total) * 100;
    if (pct >= 95) return 9.0;
    if (pct >= 88) return 8.5;
    if (pct >= 80) return 8.0;
    if (pct >= 73) return 7.5;
    if (pct >= 65) return 7.0;
    if (pct >= 58) return 6.5;
    if (pct >= 50) return 6.0;
    if (pct >= 43) return 5.5;
    if (pct >= 35) return 5.0;
    if (pct >= 28) return 4.5;
    if (pct >= 20) return 4.0;
    return 3.5;
  },

  // Helper: IELTS Composite Band Calculation (Average rounded to nearest 0.5)
  calculateCompositeBand(bands: number[]): number {
    const valid = bands.filter((b) => b > 0);
    if (valid.length === 0) return 0;
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    return Math.round(avg * 2) / 2;
  },

  // 4. Save Section Progress and Advance
  async submitSection(params: {
    userId: string;
    attemptId: string;
    section: 'listening' | 'reading' | 'writing' | 'speaking';
    timeSpentSeconds: number;
    payload: any;
  }) {
    if (!ObjectId.isValid(params.attemptId)) return null;
    const aId = new ObjectId(params.attemptId);

    const attempt = await collections.mockExamAttempts().findOne({ _id: aId, userId: params.userId });
    if (!attempt) return null;

    const exam = await collections.mockExams().findOne({ _id: attempt.mockExamId });
    if (!exam) return null;

    const updatedTimes = {
      ...attempt.timeSpentSeconds,
      [params.section]: params.timeSpentSeconds,
    };

    const updateFields: Record<string, any> = {
      timeSpentSeconds: updatedTimes,
      updatedAt: new Date(),
    };

    // --- Section 1: Listening ---
    if (params.section === 'listening') {
      const answers: Array<{ questionId: string; userAnswer: string }> = params.payload.answers || [];
      const questions = await collections
        .questions()
        .find({ listeningItemId: exam.listeningItemId })
        .toArray();

      let correctCount = 0;
      const evaluatedAnswers = answers.map((ans) => {
        const q = questions.find((item) => item._id.toString() === ans.questionId);
        const isCorrect = q ? q.correctAnswer.trim().toLowerCase() === ans.userAnswer.trim().toLowerCase() : false;
        if (isCorrect) correctCount++;
        return {
          questionId: new ObjectId(ans.questionId),
          userAnswer: ans.userAnswer,
          isCorrect,
        };
      });

      const band = this.calculateBand(correctCount, questions.length);

      updateFields.listeningAnswers = evaluatedAnswers;
      updateFields['scores.listeningScore'] = correctCount;
      updateFields['scores.listeningTotal'] = questions.length;
      updateFields['scores.listeningBand'] = band;
      updateFields.currentSection = 'reading';
    }

    // --- Section 2: Reading ---
    else if (params.section === 'reading') {
      const answers: Array<{ questionId: string; userAnswer: string }> = params.payload.answers || [];
      const questions = await collections
        .questions()
        .find({ passageId: exam.readingPassageId })
        .toArray();

      let correctCount = 0;
      const evaluatedAnswers = answers.map((ans) => {
        const q = questions.find((item) => item._id.toString() === ans.questionId);
        const isCorrect = q ? q.correctAnswer.trim().toLowerCase() === ans.userAnswer.trim().toLowerCase() : false;
        if (isCorrect) correctCount++;
        return {
          questionId: new ObjectId(ans.questionId),
          userAnswer: ans.userAnswer,
          isCorrect,
        };
      });

      const band = this.calculateBand(correctCount, questions.length);

      updateFields.readingAnswers = evaluatedAnswers;
      updateFields['scores.readingScore'] = correctCount;
      updateFields['scores.readingTotal'] = questions.length;
      updateFields['scores.readingBand'] = band;
      updateFields.currentSection = 'writing';
    }

    // --- Section 3: Writing ---
    else if (params.section === 'writing') {
      const task1Essay: string = params.payload.task1Essay || '';
      const task2Essay: string = params.payload.task2Essay || '';

      const task1Prompt = await collections.writingPrompts().findOne({ _id: exam.writingTask1PromptId });
      const task2Prompt = await collections.writingPrompts().findOne({ _id: exam.writingTask2PromptId });

      const t1WordCount = task1Essay.trim().split(/\s+/).filter(Boolean).length;
      const t2WordCount = task2Essay.trim().split(/\s+/).filter(Boolean).length;

      let t1Band = t1WordCount >= 40 ? 6.0 : (t1WordCount > 5 ? 4.0 : 0);
      let t2Band = t2WordCount >= 40 ? 6.0 : (t2WordCount > 5 ? 4.0 : 0);
      let t1FeedbackBn = t1WordCount >= 40 ? 'টাস্ক সম্পন্ন হয়েছে।' : 'লেখাটি নির্ধারিত দৈর্ঘ্যের তুলনায় অনেক সংক্ষিপ্ত।';
      let t2FeedbackBn = t2WordCount >= 40 ? 'টাস্ক সম্পন্ন হয়েছে।' : 'লেখাটি নির্ধারিত দৈর্ঘ্যের তুলনায় অনেক সংক্ষিপ্ত।';

      try {
        if (t1WordCount >= 40 && task1Prompt) {
          const eval1 = await geminiService.evaluateEssay({
            userId: params.userId,
            taskType: 'task1',
            promptTitle: task1Prompt.title,
            promptDescription: task1Prompt.prompt,
            essay: task1Essay,
          });
          t1Band = eval1.estimatedBand;
          t1FeedbackBn = eval1.criteriaScores.taskResponse.commentsBn;
        }

        if (t2WordCount >= 40 && task2Prompt) {
          const eval2 = await geminiService.evaluateEssay({
            userId: params.userId,
            taskType: 'task2',
            promptTitle: task2Prompt.title,
            promptDescription: task2Prompt.prompt,
            essay: task2Essay,
          });
          t2Band = eval2.estimatedBand;
          t2FeedbackBn = eval2.criteriaScores.taskResponse.commentsBn;
        }
      } catch (err) {
        console.warn('Writing AI eval in mock exam fallback:', err);
      }

      // IELTS Writing Band is 1/3 Task 1 + 2/3 Task 2
      const writingComposite = Math.round(((t1Band + 2 * t2Band) / 3) * 2) / 2;

      updateFields.writingSubmissions = {
        task1: {
          essay: task1Essay,
          wordCount: task1Essay.trim().split(/\s+/).filter(Boolean).length,
          band: t1Band,
          feedbackBn: t1FeedbackBn,
        },
        task2: {
          essay: task2Essay,
          wordCount: task2Essay.trim().split(/\s+/).filter(Boolean).length,
          band: t2Band,
          feedbackBn: t2FeedbackBn,
        },
      };

      updateFields['scores.writingBand'] = writingComposite;
      updateFields.currentSection = 'speaking';
    }

    // --- Section 4: Speaking & Final Completion ---
    else if (params.section === 'speaking') {
      const estimatedSpeakingBand: number = params.payload.speakingBand || 6.5;

      updateFields['scores.speakingBand'] = estimatedSpeakingBand;
      updateFields.currentSection = 'completed';
      updateFields.status = 'completed';
      updateFields.completedAt = new Date();

      // Calculate final composite overall band
      const currentScores = attempt.scores;
      const allBands = [
        currentScores.listeningBand,
        currentScores.readingBand,
        currentScores.writingBand,
        estimatedSpeakingBand,
      ];
      const overall = this.calculateCompositeBand(allBands);
      updateFields['scores.overallBand'] = overall;

      // Award +150 XP and streak
      await profileRepository.addXpAndStreak(params.userId, 150);
    }

    await collections.mockExamAttempts().updateOne({ _id: aId }, { $set: updateFields });

    const updatedAttempt = await collections.mockExamAttempts().findOne({ _id: aId });
    return updatedAttempt;
  },

  // 5. Get complete Scorecard / Report
  async getAttemptScorecard(attemptId: string, userId: string) {
    if (!ObjectId.isValid(attemptId)) return null;
    const aId = new ObjectId(attemptId);

    const attempt = await collections.mockExamAttempts().findOne({ _id: aId, userId });
    if (!attempt) return null;

    const exam = await collections.mockExams().findOne({ _id: attempt.mockExamId });
    if (!exam) return null;

    return {
      attemptId: attempt._id.toString(),
      examTitle: exam.title,
      status: attempt.status,
      currentSection: attempt.currentSection,
      scores: attempt.scores,
      timeSpentSeconds: attempt.timeSpentSeconds,
      writingSubmissions: attempt.writingSubmissions,
      completedAt: attempt.completedAt,
    };
  },
};
