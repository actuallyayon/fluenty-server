import { ObjectId } from 'mongodb';

export type UserRole = 'user' | 'admin';
export type TargetBand = 6.0 | 6.5 | 7.0 | 7.5 | 8.0 | 8.5 | 9.0;
export type UserLevel = 'beginner' | 'intermediate' | 'advanced';
export type PlanType = 'free' | 'premium';

export interface ProfileDoc {
  _id: ObjectId;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  targetBand?: TargetBand;
  examDate?: Date;
  currentLevel?: UserLevel;
  plan: PlanType;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  xp: number;
  dailyStreak: number;
  lastActiveDate?: Date;
  banned: boolean;
  banReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VocabItemDoc {
  _id: ObjectId;
  word: string;
  partOfSpeech: string;
  pronunciation?: string;
  meaningEn: string;
  meaningBn: string;
  exampleEn: string;
  exampleBn: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export interface VocabProgressDoc {
  _id: ObjectId;
  userId: string;
  vocabItemId: ObjectId;
  repetition: number;
  interval: number; // days
  easeFactor: number; // SM-2 ease factor
  nextReviewDate: Date;
  lastReviewedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonDoc {
  _id: ObjectId;
  title: string;
  titleBn: string;
  category: 'grammar' | 'reading' | 'listening' | 'writing' | 'speaking';
  subCategory?: 'articles' | 'prepositions' | 'tenses' | 'subject-verb-agreement' | string;
  contentEn: string;
  contentBn: string;
  commonMistakesBn?: Array<{
    incorrect: string;
    correct: string;
    explanationBn: string;
  }>;
  order: number;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export interface PassageDoc {
  _id: ObjectId;
  title: string;
  content: string;
  difficulty: 'academic' | 'general';
  timeLimitMinutes: number;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export type QuestionType = 'multiple_choice' | 'true_false_not_given' | 'fill_in_the_blank' | 'matching_headings';

export interface QuestionDoc {
  _id: ObjectId;
  passageId?: ObjectId;
  listeningItemId?: ObjectId;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanationBn: string;
  explanationEn: string;
  evidenceQuote?: string;
  order: number;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export interface ListeningItemDoc {
  _id: ObjectId;
  title: string;
  audioUrl: string;
  transcript: string;
  section: 1 | 2 | 3 | 4;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export interface WritingPromptDoc {
  _id: ObjectId;
  taskType: 'task1' | 'task2';
  title: string;
  prompt: string;
  imageUrl?: string;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export interface SpeakingCueDoc {
  _id: ObjectId;
  topic: string;
  topicBn: string;
  cueCard: string;
  cueCardBn: string;
  bulletPoints: string[];
  bulletPointsBn: string[];
  part: 1 | 2 | 3;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export interface WritingSubmissionDoc {
  _id: ObjectId;
  userId: string;
  promptId: ObjectId;
  essay: string;
  wordCount: number;
  estimatedBand?: number;
  feedback?: {
    taskResponse: { band: number; commentsBn: string; commentsEn: string };
    coherenceCohesion: { band: number; commentsBn: string; commentsEn: string };
    lexicalResource: { band: number; commentsBn: string; commentsEn: string };
    grammaticalAccuracy: { band: number; commentsBn: string; commentsEn: string };
    correctedSentences: Array<{ original: string; corrected: string; explanationBn: string }>;
    improvedVersion: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SpeakingSessionDoc {
  _id: ObjectId;
  userId: string;
  cueCardPrompt: string;
  transcript: Array<{
    role: 'examiner' | 'user';
    part: 1 | 2 | 3;
    content: string;
    timestamp: Date;
  }>;
  feedback?: {
    estimatedBand: number;
    fluencyCommentsBn: string;
    vocabCommentsBn: string;
    grammarCommentsBn: string;
    improvementTipsBn: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AttemptDoc {
  _id: ObjectId;
  userId: string;
  practiceType: 'reading' | 'listening';
  passageId?: ObjectId;
  listeningItemId?: ObjectId;
  totalQuestions: number;
  score: number;
  percentage: number;
  answers: Array<{
    questionId: ObjectId;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
  timeSpentSeconds: number;
  createdAt: Date;
}

export interface MistakeDoc {
  _id: ObjectId;
  userId: string;
  questionId: ObjectId;
  practiceType: 'reading' | 'listening';
  userAnswer: string;
  correctAnswer: string;
  explanationBn?: string;
  explanationEn?: string;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookmarkDoc {
  _id: ObjectId;
  userId: string;
  itemType: 'vocab' | 'question' | 'lesson';
  itemId: ObjectId;
  createdAt: Date;
}

export interface PaymentDoc {
  _id: ObjectId;
  userId: string;
  paymentMethod: 'stripe' | 'bkash' | 'nagad' | 'rocket';
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  trxId?: string;
  accountNumber?: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed' | 'refunded';
  plan: PlanType;
  createdAt: Date;
}

export interface AiExplanationDoc {
  _id: ObjectId;
  questionId: ObjectId;
  wrongAnswer: string;
  language: 'bn' | 'en';
  explanation: string;
  evidenceQuote?: string;
  createdAt: Date;
}

export interface TutorChatDoc {
  _id: ObjectId;
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyPlanDoc {
  _id: ObjectId;
  userId: string;
  weekStartDate: Date;
  generatedBandTarget: number;
  days: Array<{
    dayNumber: number;
    titleBn: string;
    titleEn: string;
    tasks: Array<{
      id: string;
      contentType: 'vocab' | 'grammar' | 'reading' | 'listening' | 'writing';
      contentId?: string;
      descriptionBn: string;
      descriptionEn: string;
      completed: boolean;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiUsageDoc {
  _id: ObjectId;
  userId: string;
  dateStr: string; // YYYY-MM-DD
  feature: 'explanation' | 'writing' | 'speaking' | 'tutor' | 'study_plan' | 'admin_gen';
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockExamDoc {
  _id: ObjectId;
  title: string;
  descriptionBn: string;
  descriptionEn: string;
  readingPassageId: ObjectId;
  listeningItemId: ObjectId;
  writingTask1PromptId: ObjectId;
  writingTask2PromptId: ObjectId;
  speakingCueId: ObjectId;
  difficulty: 'standard' | 'challenging';
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export interface MockExamAttemptDoc {
  _id: ObjectId;
  userId: string;
  mockExamId: ObjectId;
  status: 'in_progress' | 'completed' | 'abandoned';
  currentSection: 'listening' | 'reading' | 'writing' | 'speaking' | 'completed';
  timeSpentSeconds: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
  };
  listeningAnswers: Array<{ questionId: ObjectId; userAnswer: string; isCorrect: boolean }>;
  readingAnswers: Array<{ questionId: ObjectId; userAnswer: string; isCorrect: boolean }>;
  writingSubmissions: {
    task1?: { essay: string; wordCount: number; band: number; feedbackBn?: string };
    task2?: { essay: string; wordCount: number; band: number; feedbackBn?: string };
  };
  speakingSessionId?: ObjectId;
  scores: {
    listeningScore: number;
    listeningTotal: number;
    listeningBand: number;
    readingScore: number;
    readingTotal: number;
    readingBand: number;
    writingBand: number;
    speakingBand: number;
    overallBand: number;
  };
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

