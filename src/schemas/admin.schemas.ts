import { z } from 'zod';

// ==========================================
// 1. Vocabulary Schemas
// ==========================================
export const createVocabSchema = z.object({
  word: z.string().trim().min(1, 'Word is required').max(100),
  partOfSpeech: z.string().trim().min(1).max(30),
  pronunciation: z.string().trim().max(100).optional().default(''),
  meaningEn: z.string().trim().min(1, 'English meaning is required'),
  meaningBn: z.string().trim().min(1, 'Bangla meaning is required'),
  exampleEn: z.string().trim().min(1, 'English example is required'),
  exampleBn: z.string().trim().min(1, 'Bangla example translation is required'),
  topic: z.string().trim().min(1, 'Topic is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateVocabSchema = createVocabSchema.partial();

// ==========================================
// 2. Grammar Lesson Schemas
// ==========================================
export const createLessonSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  titleBn: z.string().trim().min(1, 'Bangla title is required').max(200),
  category: z.enum(['grammar', 'reading', 'listening', 'writing', 'speaking']).default('grammar'),
  subCategory: z.string().trim().max(100).optional().default('general'),
  contentEn: z.string().trim().min(1, 'English content is required'),
  contentBn: z.string().trim().min(1, 'Bangla content is required'),
  commonMistakesBn: z
    .array(
      z.object({
        incorrect: z.string().trim().min(1),
        correct: z.string().trim().min(1),
        explanationBn: z.string().trim().min(1),
      })
    )
    .optional()
    .default([]),
  order: z.number().int().default(1),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateLessonSchema = createLessonSchema.partial();

// ==========================================
// 3. Reading Passage & Question Schemas
// ==========================================
export const createPassageSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().trim().min(1, 'Passage text content is required'),
  difficulty: z.enum(['academic', 'general']).default('academic'),
  timeLimitMinutes: z.number().int().min(1).max(120).default(20),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updatePassageSchema = createPassageSchema.partial();

export const createQuestionSchema = z.object({
  passageId: z.string().optional(),
  listeningItemId: z.string().optional(),
  type: z.enum([
    'multiple_choice',
    'true_false_not_given',
    'fill_in_the_blank',
    'matching_headings',
  ]),
  prompt: z.string().trim().min(1, 'Question prompt is required'),
  options: z.array(z.string().trim()).optional().default([]),
  correctAnswer: z.string().trim().min(1, 'Correct answer is required'),
  explanationBn: z.string().trim().min(1, 'Bangla explanation is required'),
  explanationEn: z.string().trim().min(1, 'English explanation is required'),
  evidenceQuote: z.string().trim().optional().default(''),
  order: z.number().int().default(1),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateQuestionSchema = createQuestionSchema.partial();

// ==========================================
// 4. Listening Item Schemas
// ==========================================
export const createListeningSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  audioUrl: z.string().trim().url('Valid audio URL is required'),
  transcript: z.string().trim().min(1, 'Audio transcript is required'),
  section: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(1),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateListeningSchema = createListeningSchema.partial();

// ==========================================
// 5. Writing Prompt Schemas
// ==========================================
export const createWritingPromptSchema = z.object({
  taskType: z.enum(['task1', 'task2']),
  title: z.string().trim().min(1, 'Title is required').max(200),
  prompt: z.string().trim().min(1, 'Writing prompt text is required'),
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateWritingPromptSchema = createWritingPromptSchema.partial();

// ==========================================
// 6. Speaking Cue Schemas
// ==========================================
export const createSpeakingCueSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(200),
  topicBn: z.string().trim().min(1, 'Bangla topic is required').max(200),
  cueCard: z.string().trim().min(1, 'Cue card prompt is required'),
  cueCardBn: z.string().trim().min(1, 'Bangla cue card prompt is required'),
  bulletPoints: z.array(z.string().trim()).min(1, 'At least 1 bullet point is required'),
  bulletPointsBn: z.array(z.string().trim()).min(1, 'At least 1 Bangla bullet point is required'),
  part: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateSpeakingCueSchema = createSpeakingCueSchema.partial();

// ==========================================
// 7. User Management Schemas
// ==========================================
export const banUserSchema = z.object({
  banned: z.boolean(),
  banReason: z.string().trim().max(500).optional().default('Administrative policy violation'),
});

export const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const updatePlanSchema = z.object({
  plan: z.enum(['free', 'premium']),
});
