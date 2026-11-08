import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { geminiService } from './gemini.service.js';
import { collections } from '../../db/index.js';
import { newsPortalService, type NewsArticleItem } from '../news/news-portal.service.js';

// ==========================================
// Schemas for Gemini Structured Generation
// ==========================================

export const generatedReadingSchema = z.object({
  title: z.string(),
  topic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  passage: z.string(),
  source: z.string().optional(),
  sourceName: z.string().optional(),
  sourceUrl: z.string().optional(),
  reasonPicked: z.string().optional(),
  headlineSnippet: z.string().optional(),
  questions: z.array(
    z.object({
      order: z.number(),
      prompt: z.string(),
      type: z.enum(['multiple_choice', 'true_false_not_given', 'fill_in_the_blank', 'matching_headings']),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string(),
      evidenceQuote: z.string(),
      explanationBn: z.string(),
      explanationEn: z.string(),
    })
  ),
});

export const generatedListeningSchema = z.object({
  title: z.string(),
  section: z.number(),
  transcript: z.string(),
  questions: z.array(
    z.object({
      order: z.number(),
      prompt: z.string(),
      type: z.enum(['multiple_choice', 'fill_in_the_blank']),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string(),
      evidenceQuote: z.string(),
      explanationBn: z.string(),
      explanationEn: z.string(),
    })
  ),
});

export const generatedWritingSchema = z.object({
  title: z.string(),
  taskType: z.enum(['task1', 'task2']),
  prompt: z.string(),
  modelEssay: z.string(),
});

export const generatedSpeakingSchema = z.object({
  topic: z.string(),
  cueCard: z.string(),
  part1Questions: z.array(z.string()),
  part3Questions: z.array(z.string()),
});

export type GeneratedReading = z.infer<typeof generatedReadingSchema>;
export type GeneratedListening = z.infer<typeof generatedListeningSchema>;
export type GeneratedWriting = z.infer<typeof generatedWritingSchema>;
export type GeneratedSpeaking = z.infer<typeof generatedSpeakingSchema>;

export const adminGeneratorService = {
  // 1. Generate Reading Passage & Questions
  async generateReading(params: {
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    questionCount?: number;
  }): Promise<GeneratedReading> {
    const qCount = params.questionCount || 4;
    const prompt = `You are a Senior Cambridge IELTS Test Writer.
Create an authentic, high-quality IELTS Academic Reading Passage and ${qCount} realistic questions.
TOPIC: ${params.topic}
DIFFICULTY: ${params.difficulty}

REQUIREMENTS:
1. Passage must be 500-700 words, formal academic register with well-structured paragraphs.
2. Generate exactly ${qCount} questions mixed between:
   - "multiple_choice" (4 options: A, B, C, D)
   - "true_false_not_given" (options: ["True", "False", "Not Given"])
   - "fill_in_the_blank" (single word or short phrase from the passage)
3. For EACH question provide:
   - exact 'evidenceQuote' verbatim from the passage that justifies the answer.
   - in-depth 'explanationBn' in Bengali explaining why the correct answer is correct and why traps/distractors fail.
   - in-depth 'explanationEn' in English.

OUTPUT STRICT JSON FORMAT:
{
  "title": "Clear IELTS Title",
  "topic": "${params.topic}",
  "difficulty": "${params.difficulty}",
  "passage": "Full passage text...",
  "questions": [
    {
      "order": 1,
      "prompt": "Question text here",
      "type": "multiple_choice",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correctAnswer": "A. Option 1",
      "evidenceQuote": "exact quote from text",
      "explanationBn": "বাংলায় ব্যাখ্যা...",
      "explanationEn": "English explanation..."
    }
  ]
}`;

    const raw = await geminiService.generateContentWithRetry(prompt);
    const clean = geminiService.cleanJsonText(raw);
    return generatedReadingSchema.parse(JSON.parse(clean));
  },

  // 1B. Generate Reading Passage from Selected News Article / British Council Lines
  async generateReadingFromNews(params: {
    article: NewsArticleItem;
    difficulty: 'easy' | 'medium' | 'hard';
    questionCount?: number;
  }): Promise<GeneratedReading> {
    const qCount = params.questionCount || 4;
    const linesFormatted = params.article.lines
      .map((line, idx) => `  ${idx + 1}. "${line}"`)
      .join('\n');

    const prompt = `You are a Senior Cambridge IELTS Test Writer.
Your task is to transform authentic journalism lines and British Council academic content into an authentic, rigorous IELTS Academic Reading Passage with ${qCount} realistic questions.

AUTHENTIC SOURCE:
- Portal / Outlet: ${params.article.portalName}
- Original Headline: "${params.article.title}"
- Key Newspaper Lines & Verbatim Quotes:
${linesFormatted}
- Summary & Context: ${params.article.snippet}
- Target Difficulty: ${params.difficulty}

REQUIREMENTS:
1. PASSAGE (500-750 words):
   - Academic register with formal discourse markers.
   - Divided into labelled paragraphs: [Paragraph A], [Paragraph B], [Paragraph C], [Paragraph D] (and [Paragraph E] if appropriate).
   - Must incorporate the authentic newspaper lines and key facts directly into the narrative.
   - Include analytical discussion, scientific or socio-economic implications, and contrasting perspectives typical of British Council / Cambridge IELTS tests.
2. QUESTIONS (Exactly ${qCount} questions):
   - Mix between:
     * "multiple_choice" (4 distinct options with letters A, B, C, D)
     * "true_false_not_given" (options: ["True", "False", "Not Given"])
     * "fill_in_the_blank" (requires exact word or short phrase from text)
     * "matching_headings" (choose the correct paragraph heading from options)
3. For EACH question provide:
   - 'evidenceQuote': Verbatim sentence from the passage proving the answer.
   - 'explanationBn': Detailed, pedagogical explanation in Bengali explaining the logic, trap evasion, and grammar/vocabulary connections for Bangladeshi IELTS candidates.
   - 'explanationEn': Clear academic explanation in English.

OUTPUT STRICT JSON FORMAT:
{
  "title": "${params.article.title.replace(/"/g, '\\"')}",
  "topic": "${params.article.suggestedTopic.replace(/"/g, '\\"')}",
  "difficulty": "${params.difficulty}",
  "source": "${params.article.portalId}",
  "sourceName": "${params.article.portalName.replace(/"/g, '\\"')}",
  "sourceUrl": "${params.article.url}",
  "headlineSnippet": "${params.article.title.replace(/"/g, '\\"')}",
  "reasonPicked": "Selected from ${params.article.portalName} due to its rich analytical vocabulary and strong thematic relevance to IELTS Academic topics.",
  "passage": "Full passage text with [Paragraph A], [Paragraph B], etc.",
  "questions": [
    {
      "order": 1,
      "prompt": "Question text here",
      "type": "multiple_choice",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correctAnswer": "A. Option 1",
      "evidenceQuote": "exact quote from text",
      "explanationBn": "বাংলায় বিস্তারিত ব্যাখ্যা...",
      "explanationEn": "English explanation..."
    }
  ]
}`;

    const raw = await geminiService.generateContentWithRetry(prompt);
    const clean = geminiService.cleanJsonText(raw);
    return generatedReadingSchema.parse(JSON.parse(clean));
  },

  // 1C. Auto-Pick from Connected News Portals / British Council and Generate Reading
  async autoPickAndGenerateNewsReading(params: {
    portalId?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    questionCount?: number;
  }): Promise<{ pickedArticle: NewsArticleItem; reasonPicked: string; reading: GeneratedReading }> {
    const targetDifficulty = params.difficulty || 'medium';
    const qCount = params.questionCount || 4;

    // Fetch candidate articles from news portals
    let candidateArticles: NewsArticleItem[] = [];
    if (params.portalId && params.portalId !== 'all') {
      const portalData = await newsPortalService.fetchArticlesFromPortal(params.portalId);
      candidateArticles = portalData.articles;
    } else {
      const allData = await newsPortalService.fetchAllPortalsArticles();
      candidateArticles = allData.articles;
    }

    if (candidateArticles.length === 0) {
      throw new Error('No news articles available from the connected portals.');
    }

    // Step 1: Let Gemini inspect the candidates and autonomously pick the most pedagogically valuable news story
    const candidateSummaries = candidateArticles.map((art, idx) => ({
      index: idx,
      id: art.id,
      portal: art.portalName,
      title: art.title,
      topic: art.suggestedTopic,
      sampleLine: art.lines[0] || art.snippet,
    }));

    const pickerPrompt = `You are a Chief Cambridge IELTS Academic Content Curator.
Review the following authentic news items and British Council feeds:

${JSON.stringify(candidateSummaries, null, 2)}

SELECT the SINGLE BEST article candidate for creating an authentic, high-band IELTS Academic Reading test.
Criteria:
- Depth of topic (science, ecology, psychology, linguistics, or technology)
- Richness of lexical resource and argumentative structure
- Suitability for IELTS question types (Heading Matching, True/False/Not Given)

OUTPUT STRICT JSON FORMAT:
{
  "selectedIndex": 0,
  "reasonPicked": "2-3 sentences explaining why this article offers superior IELTS Academic reading rigor and vocabulary."
}`;

    let pickedArticle = candidateArticles[0];
    let reasonPicked = 'Selected for high academic relevance and vocabulary density.';

    try {
      const pickerRaw = await geminiService.generateContentWithRetry(pickerPrompt, { fastMode: true });
      const pickerClean = geminiService.cleanJsonText(pickerRaw);
      const parsedPicker = JSON.parse(pickerClean);
      if (
        typeof parsedPicker.selectedIndex === 'number' &&
        candidateArticles[parsedPicker.selectedIndex]
      ) {
        pickedArticle = candidateArticles[parsedPicker.selectedIndex];
        reasonPicked = parsedPicker.reasonPicked || reasonPicked;
      }
    } catch (err) {
      console.warn('AI news picker fallback to first item:', err);
      // Defaults to the first curated candidate
      pickedArticle = candidateArticles[0];
    }

    // Step 2: Transform the picked article into the IELTS Reading Test
    const reading = await this.generateReadingFromNews({
      article: pickedArticle,
      difficulty: targetDifficulty,
      questionCount: qCount,
    });

    reading.reasonPicked = reasonPicked;

    return {
      pickedArticle,
      reasonPicked,
      reading,
    };
  },

  // 2. Generate Listening Script & Questions
  async generateListening(params: {
    topic: string;
    section: 1 | 2 | 3 | 4;
    questionCount?: number;
  }): Promise<GeneratedListening> {
    const qCount = params.questionCount || 3;
    const prompt = `You are an expert Cambridge IELTS Listening Test Designer.
Create an authentic IELTS Listening audio script and ${qCount} questions.
TOPIC: ${params.topic}
SECTION: Section ${params.section} (${params.section === 1 ? 'Social dialogue e.g. booking or enquiry' : params.section === 2 ? 'Monologue on general topic' : params.section === 3 ? 'Academic discussion between 2-3 students/tutor' : 'Academic lecture'})

REQUIREMENTS:
1. Dialogue script must be natural British/International English, approximately 350-500 words with clear speaker turns.
2. Generate ${qCount} questions (multiple_choice or fill_in_the_blank).
3. Include verbatim evidenceQuote and detailed explanation in both Bengali and English.

OUTPUT STRICT JSON FORMAT:
{
  "title": "Title of Listening Test",
  "section": ${params.section},
  "transcript": "Speaker A: ...\\nSpeaker B: ...",
  "questions": [
    {
      "order": 1,
      "prompt": "Question prompt",
      "type": "multiple_choice",
      "options": ["A. ...", "B. ...", "C. ..."],
      "correctAnswer": "A. ...",
      "evidenceQuote": "exact sentence from transcript",
      "explanationBn": "বাংলায় ব্যাখ্যা...",
      "explanationEn": "English explanation..."
    }
  ]
}`;

    const raw = await geminiService.generateContentWithRetry(prompt);
    const clean = geminiService.cleanJsonText(raw);
    return generatedListeningSchema.parse(JSON.parse(clean));
  },

  // 3. Generate Writing Prompt & Model Essay
  async generateWriting(params: {
    taskType: 'task1' | 'task2';
    topic: string;
  }): Promise<GeneratedWriting> {
    const prompt = `You are a Cambridge IELTS Senior Examiner.
Create an official-style IELTS Writing prompt and a Band 8.5+ model essay.
TASK TYPE: ${params.taskType.toUpperCase()}
TOPIC: ${params.topic}

REQUIREMENTS:
1. For Task 1: Generate a detailed report prompt (chart/graph/process description) or letter prompt with minimum 150 words requirement.
2. For Task 2: Generate an essay prompt (e.g. Discuss both views, Agree or Disagree, Causes & Solutions) with minimum 250 words requirement.
3. Write a Band 8.5+ model essay illustrating sophisticated lexical range, clear cohesion, and flawless grammar.

OUTPUT STRICT JSON FORMAT:
{
  "title": "Concise Prompt Title",
  "taskType": "${params.taskType}",
  "prompt": "Full IELTS prompt with instructions...",
  "modelEssay": "Full Band 8.5+ model response..."
}`;

    const raw = await geminiService.generateContentWithRetry(prompt);
    const clean = geminiService.cleanJsonText(raw);
    return generatedWritingSchema.parse(JSON.parse(clean));
  },

  // 4. Generate Speaking Cue Card & Discussion
  async generateSpeaking(params: { topic: string }): Promise<GeneratedSpeaking> {
    const prompt = `You are an IELTS Speaking Examiner.
Create a complete 3-part IELTS Speaking test package for:
TOPIC: ${params.topic}

REQUIREMENTS:
1. Part 1: 3-4 introductory questions.
2. Part 2: Official Cue Card with "Describe..." followed by "You should say:" with 4 bullet points and "And explain why...".
3. Part 3: 3-4 deep, two-way discussion questions expanding on societal and global aspects of this topic.

OUTPUT STRICT JSON FORMAT:
{
  "topic": "${params.topic}",
  "cueCard": "Describe ...\\n\\nYou should say:\\n- ...\\n- ...\\n- ...\\n\\nAnd explain why ...",
  "part1Questions": ["Question 1", "Question 2", "Question 3"],
  "part3Questions": ["Discussion Q1", "Discussion Q2", "Discussion Q3"]
}`;

    const raw = await geminiService.generateContentWithRetry(prompt);
    const clean = geminiService.cleanJsonText(raw);
    return generatedSpeakingSchema.parse(JSON.parse(clean));
  },

  // 5. Direct Save of Approved Generated Reading Passage & Questions
  async publishReading(generated: GeneratedReading): Promise<{ passageId: string; questionsCount: number }> {
    const passageDoc = {
      _id: new ObjectId(),
      title: generated.title,
      content: generated.passage,
      timeLimitMinutes: 20,
      difficulty: 'academic' as const,
      status: 'published' as const,
      source: generated.source || 'news_portal',
      sourceName: generated.sourceName || 'Authentic News Source',
      sourceUrl: generated.sourceUrl || '',
      topic: generated.topic || '',
      headlineSnippet: generated.headlineSnippet || '',
      reasonPicked: generated.reasonPicked || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collections.passages().insertOne(passageDoc);

    const questionDocs = generated.questions.map((q) => ({
      _id: new ObjectId(),
      passageId: passageDoc._id,
      prompt: q.prompt,
      type: q.type,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      explanationBn: q.explanationBn,
      explanationEn: q.explanationEn,
      evidenceQuote: q.evidenceQuote,
      order: q.order,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    if (questionDocs.length > 0) {
      await collections.questions().insertMany(questionDocs);
    }

    return {
      passageId: passageDoc._id.toString(),
      questionsCount: questionDocs.length,
    };
  },

  // 6. Direct Save of Approved Generated Listening Item
  async publishListening(
    generated: GeneratedListening,
    audioUrl?: string
  ): Promise<{ listeningId: string; questionsCount: number }> {
    const sectionNum = (generated.section >= 1 && generated.section <= 4 ? generated.section : 1) as 1 | 2 | 3 | 4;
    const listeningDoc = {
      _id: new ObjectId(),
      title: generated.title,
      section: sectionNum,
      audioUrl: audioUrl || '/audio/library_orientation.wav',
      transcript: generated.transcript,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collections.listeningItems().insertOne(listeningDoc);

    const questionDocs = generated.questions.map((q) => ({
      _id: new ObjectId(),
      listeningItemId: listeningDoc._id,
      prompt: q.prompt,
      type: q.type,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      explanationBn: q.explanationBn,
      explanationEn: q.explanationEn,
      evidenceQuote: q.evidenceQuote,
      order: q.order,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    if (questionDocs.length > 0) {
      await collections.questions().insertMany(questionDocs);
    }

    return {
      listeningId: listeningDoc._id.toString(),
      questionsCount: questionDocs.length,
    };
  },

  // 7. Direct Save of Approved Writing Prompt
  async publishWriting(generated: GeneratedWriting): Promise<{ promptId: string }> {
    const promptDoc = {
      _id: new ObjectId(),
      title: generated.title,
      taskType: generated.taskType,
      prompt: generated.prompt,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collections.writingPrompts().insertOne(promptDoc);
    return { promptId: promptDoc._id.toString() };
  },

  // 8. Direct Save of Approved Speaking Cue
  async publishSpeaking(generated: GeneratedSpeaking): Promise<{ cueId: string }> {
    const cueDoc = {
      _id: new ObjectId(),
      topic: generated.topic,
      topicBn: generated.topic,
      cueCard: generated.cueCard,
      cueCardBn: generated.cueCard,
      bulletPoints: generated.part1Questions || [],
      bulletPointsBn: [],
      part: 2 as const,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collections.speakingCues().insertOne(cueDoc);
    return { cueId: cueDoc._id.toString() };
  },
};
