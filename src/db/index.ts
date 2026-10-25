import dns from 'node:dns';
import { MongoClient, Db, Collection } from 'mongodb';
import { env } from '../config/env.js';

// Ensure reliable DNS resolution for MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if custom DNS cannot be set
}
import type {
  ProfileDoc,
  VocabItemDoc,
  VocabProgressDoc,
  LessonDoc,
  PassageDoc,
  QuestionDoc,
  ListeningItemDoc,
  WritingPromptDoc,
  SpeakingCueDoc,
  WritingSubmissionDoc,
  SpeakingSessionDoc,
  AttemptDoc,
  MistakeDoc,
  BookmarkDoc,
  PaymentDoc,
  AiExplanationDoc,
  TutorChatDoc,
  StudyPlanDoc,
  AiUsageDoc,
  MockExamDoc,
  MockExamAttemptDoc,
} from '../types/collections.js';

// ONE shared MongoClient reused everywhere including Better Auth's MongoDB adapter
export const client: MongoClient = new MongoClient(env.MONGODB_URI, {
  maxPoolSize: 20,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 8000,
});

export const db: Db = client.db();

let isConnected = false;

export async function connectDB(): Promise<{ client: MongoClient; db: Db }> {
  if (isConnected) {
    return { client, db };
  }

  await client.connect();
  isConnected = true;
  console.log(`✅ Connected to MongoDB Atlas database: ${db.databaseName}`);
  return { client, db };
}

export function getClient(): MongoClient {
  return client;
}

export function getDb(): Db {
  return db;
}

// Strongly typed collection getters
export const collections = {
  profiles: (): Collection<ProfileDoc> => db.collection<ProfileDoc>('profiles'),
  vocabItems: (): Collection<VocabItemDoc> => db.collection<VocabItemDoc>('vocab_items'),
  vocabProgress: (): Collection<VocabProgressDoc> => db.collection<VocabProgressDoc>('vocab_progress'),
  lessons: (): Collection<LessonDoc> => db.collection<LessonDoc>('lessons'),
  passages: (): Collection<PassageDoc> => db.collection<PassageDoc>('passages'),
  questions: (): Collection<QuestionDoc> => db.collection<QuestionDoc>('questions'),
  listeningItems: (): Collection<ListeningItemDoc> => db.collection<ListeningItemDoc>('listening_items'),
  writingPrompts: (): Collection<WritingPromptDoc> => db.collection<WritingPromptDoc>('writing_prompts'),
  speakingCues: (): Collection<SpeakingCueDoc> => db.collection<SpeakingCueDoc>('speaking_cues'),
  writingSubmissions: (): Collection<WritingSubmissionDoc> => db.collection<WritingSubmissionDoc>('writing_submissions'),
  speakingSessions: (): Collection<SpeakingSessionDoc> => db.collection<SpeakingSessionDoc>('speaking_sessions'),
  attempts: (): Collection<AttemptDoc> => db.collection<AttemptDoc>('attempts'),
  mistakes: (): Collection<MistakeDoc> => db.collection<MistakeDoc>('mistakes'),
  bookmarks: (): Collection<BookmarkDoc> => db.collection<BookmarkDoc>('bookmarks'),
  payments: (): Collection<PaymentDoc> => db.collection<PaymentDoc>('payments'),
  aiExplanations: (): Collection<AiExplanationDoc> => db.collection<AiExplanationDoc>('ai_explanations'),
  tutorChats: (): Collection<TutorChatDoc> => db.collection<TutorChatDoc>('tutor_chats'),
  studyPlans: (): Collection<StudyPlanDoc> => db.collection<StudyPlanDoc>('study_plans'),
  aiUsage: (): Collection<AiUsageDoc> => db.collection<AiUsageDoc>('ai_usage'),
  mockExams: (): Collection<MockExamDoc> => db.collection<MockExamDoc>('mock_exams'),
  mockExamAttempts: (): Collection<MockExamAttemptDoc> => db.collection<MockExamAttemptDoc>('mock_exam_attempts'),
};
