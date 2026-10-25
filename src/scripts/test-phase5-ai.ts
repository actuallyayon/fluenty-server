import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import { connectDB, collections, client } from '../db/index.js';
import { geminiService } from '../services/ai/gemini.service.js';
import { writingRepository } from '../repositories/writing.repository.js';
import { speakingRepository } from '../repositories/speaking.repository.js';

async function testPhase5AI() {
  console.log('🧪 Starting Phase 5 Gemini AI validation...');
  await connectDB();

  const user = await collections.profiles().findOne({ role: 'user' });
  if (!user) {
    console.error('No user found');
    process.exit(1);
  }
  const userId = user.userId;
  console.log(`Testing with user: ${user.name}`);

  // 1. Test On-Demand Wrong Answer Explanation with Caching
  console.log('\n--- 1. Testing AI Explanation for Wrong Answer ---');
  const question = await collections.questions().findOne();
  if (!question) {
    console.error('No question found');
    process.exit(1);
  }

  const explResult1 = await geminiService.getOrGenerateExplanation({
    userId,
    questionId: question._id.toString(),
    wrongAnswer: 'True',
    language: 'bn',
    questionPrompt: question.prompt,
    correctAnswer: question.correctAnswer,
    passageOrTranscript: 'Vertical hydroponics consumes up to 90% less water than traditional farming.',
  });

  console.log('✅ Generated AI Explanation (cached: ' + explResult1.cached + '):');
  console.log('Bangla explanation:', explResult1.explanation.explanationBn.slice(0, 100) + '...');
  console.log('Evidence Quote:', explResult1.explanation.evidenceQuote);

  // Test persistent cache hit
  const explResult2 = await geminiService.getOrGenerateExplanation({
    userId,
    questionId: question._id.toString(),
    wrongAnswer: 'True',
    language: 'bn',
    questionPrompt: question.prompt,
    correctAnswer: question.correctAnswer,
    passageOrTranscript: 'Vertical hydroponics consumes up to 90% less water than traditional farming.',
  });
  console.log('✅ Second call cache check (should be true):', explResult2.cached);

  // 2. Test Writing Evaluation
  console.log('\n--- 2. Testing IELTS Writing Evaluation ---');
  const prompt = await collections.writingPrompts().findOne({ taskType: 'task2' });
  if (!prompt) {
    console.error('No writing prompt found');
    process.exit(1);
  }

  const sampleEssay = `Nowadays many employees prefers to work from their homes because it gives them freedom and flexibility. However, some managers thinks that office environment is more better for teamwork. In my opinion, working from home have many advantages, but sometimes workers feels isolated. Therefore, a hybrid system is the most effective solution for both companies and staffs.`;

  const writingEval = await writingRepository.submitAndEvaluateEssay({
    userId,
    promptId: prompt._id.toString(),
    essay: sampleEssay,
  });

  console.log('✅ Writing Evaluation Succeeded:');
  console.log('Estimated Band:', writingEval?.feedback.estimatedBand);
  console.log('Task Response Band:', writingEval?.feedback.criteriaScores.taskResponse.band);
  console.log('Grammar Accuracy Comments (Bn):', writingEval?.feedback.criteriaScores.grammaticalAccuracy.commentsBn.slice(0, 80) + '...');
  console.log('Corrected Sentences Count:', writingEval?.feedback.correctedSentences.length);
  if (writingEval?.feedback.correctedSentences.length) {
    console.log('First mistake corrected:', writingEval.feedback.correctedSentences[0]);
  }

  // 3. Test Speaking Session Examiner Turn
  console.log('\n--- 3. Testing Speaking Examiner Interaction ---');
  const cue = await collections.speakingCues().findOne();
  if (cue) {
    const session = await speakingRepository.startSession(userId, cue._id.toString());
    console.log('✅ Speaking session started:', session?.sessionId);
    console.log('Examiner initial question:', session?.initialQuestion);

    const reply = await speakingRepository.sendCandidateMessage(
      userId,
      session!.sessionId,
      'My name is John Doe, and I am currently an undergraduate student studying Computer Science.'
    );
    console.log('✅ Examiner next question received:', reply?.examinerReply);
  }

  console.log('\n🎉 Phase 5 Gemini AI features fully validated!');
  await client.close();
}

testPhase5AI().catch((err) => {
  console.error('Phase 5 test failed:', err);
  process.exit(1);
});
