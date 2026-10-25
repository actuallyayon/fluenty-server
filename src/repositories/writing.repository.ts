import { ObjectId } from 'mongodb';
import { collections } from '../db/index.js';
import { profileRepository } from './profile.repository.js';
import { geminiService, WritingFeedbackOutput } from '../services/ai/gemini.service.js';
import type { WritingPromptDoc, WritingSubmissionDoc } from '../types/collections.js';

export const writingRepository = {
  async getPublishedPrompts(taskType?: 'task1' | 'task2'): Promise<
    Array<{
      id: string;
      taskType: 'task1' | 'task2';
      title: string;
      prompt: string;
      imageUrl?: string;
      createdAt: Date;
    }>
  > {
    const query: Record<string, any> = { status: 'published' };
    if (taskType) query.taskType = taskType;

    const prompts = await collections
      .writingPrompts()
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return prompts.map((p) => ({
      id: p._id.toString(),
      taskType: p.taskType,
      title: p.title,
      prompt: p.prompt,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
    }));
  },

  async getPromptById(promptId: string): Promise<WritingPromptDoc | null> {
    if (!ObjectId.isValid(promptId)) return null;
    return collections.writingPrompts().findOne({ _id: new ObjectId(promptId), status: 'published' });
  },

  async submitAndEvaluateEssay(params: {
    userId: string;
    promptId: string;
    essay: string;
  }): Promise<{
    submissionId: string;
    promptTitle: string;
    taskType: string;
    wordCount: number;
    feedback: WritingFeedbackOutput;
    xpEarned: number;
    newTotalXp: number;
    newStreak: number;
  } | null> {
    const prompt = await this.getPromptById(params.promptId);
    if (!prompt) return null;

    const wordCount = params.essay.trim().split(/\s+/).filter(Boolean).length;

    // Call Gemini evaluation service
    const feedback = await geminiService.evaluateEssay({
      userId: params.userId,
      taskType: prompt.taskType,
      promptTitle: prompt.title,
      promptDescription: prompt.prompt,
      essay: params.essay,
    });

    // Save submission record
    const submissionDoc: WritingSubmissionDoc = {
      _id: new ObjectId(),
      userId: params.userId,
      promptId: prompt._id,
      essay: params.essay,
      wordCount,
      estimatedBand: feedback.estimatedBand,
      feedback: {
        taskResponse: feedback.criteriaScores.taskResponse,
        coherenceCohesion: feedback.criteriaScores.coherenceCohesion,
        lexicalResource: feedback.criteriaScores.lexicalResource,
        grammaticalAccuracy: feedback.criteriaScores.grammaticalAccuracy,
        correctedSentences: feedback.correctedSentences,
        improvedVersion: feedback.improvedVersion,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collections.writingSubmissions().insertOne(submissionDoc);

    // Gamification: Award 50 XP for writing essay submission
    const xpEarned = 50;
    const updatedProfile = await profileRepository.addXpAndStreak(params.userId, xpEarned);

    return {
      submissionId: submissionDoc._id.toString(),
      promptTitle: prompt.title,
      taskType: prompt.taskType,
      wordCount,
      feedback,
      xpEarned,
      newTotalXp: updatedProfile?.xp || 0,
      newStreak: updatedProfile?.dailyStreak || 1,
    };
  },

  async getUserSubmissions(userId: string, limit: number = 10): Promise<
    Array<{
      id: string;
      promptTitle: string;
      taskType: string;
      wordCount: number;
      estimatedBand?: number;
      createdAt: Date;
    }>
  > {
    const subs = await collections
      .writingSubmissions()
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const results = await Promise.all(
      subs.map(async (s) => {
        const prompt = await collections.writingPrompts().findOne({ _id: s.promptId });
        return {
          id: s._id.toString(),
          promptTitle: prompt?.title || 'IELTS Writing Prompt',
          taskType: prompt?.taskType || 'task2',
          wordCount: s.wordCount,
          estimatedBand: s.estimatedBand,
          createdAt: s.createdAt,
        };
      })
    );

    return results;
  },

  async getSubmissionDetail(userId: string, submissionId: string): Promise<any | null> {
    if (!ObjectId.isValid(submissionId)) return null;
    const sub = await collections
      .writingSubmissions()
      .findOne({ _id: new ObjectId(submissionId), userId });

    if (!sub) return null;

    const prompt = await collections.writingPrompts().findOne({ _id: sub.promptId });

    return {
      id: sub._id.toString(),
      prompt: {
        id: prompt?._id.toString(),
        title: prompt?.title,
        prompt: prompt?.prompt,
        taskType: prompt?.taskType,
      },
      essay: sub.essay,
      wordCount: sub.wordCount,
      estimatedBand: sub.estimatedBand,
      feedback: sub.feedback,
      createdAt: sub.createdAt,
    };
  },
};
