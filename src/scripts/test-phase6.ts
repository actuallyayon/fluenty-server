import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import { connectDB, collections, client } from '../db/index.js';
import { adminGeneratorService } from '../services/ai/admin-generator.service.js';
import { mockExamRepository } from '../repositories/mock-exam.repository.js';

async function testPhase6() {
  console.log('🧪 Starting Phase 6 Admin AI Generator & Mock Exam validation...');
  await connectDB();

  const user = await collections.profiles().findOne({ role: 'user' });
  if (!user) {
    console.error('No learner user found');
    process.exit(1);
  }
  const userId = user.userId;
  console.log(`Testing with user: ${user.name}`);

  // 1. Test Admin AI Generator (Writing prompt)
  console.log('\n--- 1. Testing Admin AI Writing Generator ---');
  const genWriting = await adminGeneratorService.generateWriting({
    taskType: 'task2',
    topic: 'Sustainable Public Transportation in Megacities',
  });
  console.log('✅ Generated Writing Title:', genWriting.title);
  console.log('Prompt preview:', genWriting.prompt.slice(0, 100) + '...');
  console.log('Band 8.5+ Model Essay preview:', genWriting.modelEssay.slice(0, 100) + '...');

  // Publish to database
  const pubWriting = await adminGeneratorService.publishWriting(genWriting);
  console.log('✅ Published Writing Prompt ID:', pubWriting.promptId);

  // 2. Test Full Mock Exam Flow
  console.log('\n--- 2. Testing Full IELTS Mock Exam Flow ---');
  const mockExams = await mockExamRepository.listPublishedMockExams();
  if (mockExams.length === 0) {
    console.error('No published mock exams found');
    process.exit(1);
  }
  const testExam = mockExams[0];
  console.log(`Found published mock exam: "${testExam.title}" (ID: ${testExam.id})`);

  // Start attempt
  const attemptId = await mockExamRepository.startAttempt(userId, testExam.id);
  console.log('✅ Started Mock Exam Attempt:', attemptId);

  // Submit Section 1: Listening
  console.log('Submitting Section 1 (Listening)...');
  const examDetail = await mockExamRepository.getMockExamDetail(testExam.id);
  const listeningAnswers = examDetail?.listening?.questions.map((q) => ({
    questionId: q.id,
    userAnswer: 'True',
  })) || [];

  const lResult = await mockExamRepository.submitSection({
    userId,
    attemptId,
    section: 'listening',
    timeSpentSeconds: 600,
    payload: { answers: listeningAnswers },
  });
  console.log('✅ Listening section completed. Next section:', lResult?.currentSection);
  console.log('Listening Band:', lResult?.scores.listeningBand);

  // Submit Section 2: Reading
  console.log('Submitting Section 2 (Reading)...');
  const readingAnswers = examDetail?.reading?.questions.map((q) => ({
    questionId: q.id,
    userAnswer: 'True',
  })) || [];

  const rResult = await mockExamRepository.submitSection({
    userId,
    attemptId,
    section: 'reading',
    timeSpentSeconds: 900,
    payload: { answers: readingAnswers },
  });
  console.log('✅ Reading section completed. Next section:', rResult?.currentSection);
  console.log('Reading Band:', rResult?.scores.readingBand);

  // Submit Section 3: Writing
  console.log('Submitting Section 3 (Writing)...');
  const wResult = await mockExamRepository.submitSection({
    userId,
    attemptId,
    section: 'writing',
    timeSpentSeconds: 2400,
    payload: {
      task1Essay: 'The graph illustrates key metrics of consumption over two decades. In summary, noticeable trends emerged.',
      task2Essay: 'Public transportation is essential for environmental preservation. While critics argue costs are high, long term benefits surpass investments.',
    },
  });
  console.log('✅ Writing section completed. Next section:', wResult?.currentSection);
  console.log('Writing Band:', wResult?.scores.writingBand);

  // Submit Section 4: Speaking
  console.log('Submitting Section 4 (Speaking)...');
  const sResult = await mockExamRepository.submitSection({
    userId,
    attemptId,
    section: 'speaking',
    timeSpentSeconds: 600,
    payload: { speakingBand: 7.0 },
  });
  console.log('✅ Speaking section completed. Status:', sResult?.status);

  // Get Scorecard
  const scorecard = await mockExamRepository.getAttemptScorecard(attemptId, userId);
  console.log('\n--- Final Exam Scorecard ---');
  console.log('Exam Title:', scorecard?.examTitle);
  console.log('Status:', scorecard?.status);
  console.log('Scores:');
  console.log('  Listening:', scorecard?.scores.listeningBand);
  console.log('  Reading:', scorecard?.scores.readingBand);
  console.log('  Writing:', scorecard?.scores.writingBand);
  console.log('  Speaking:', scorecard?.scores.speakingBand);
  console.log('🏆 OVERALL COMPOSITE BAND:', scorecard?.scores.overallBand);

  console.log('\n🎉 Phase 6 Admin AI Generator & Mock Exam Simulation validated successfully!');
  await client.close();
}

testPhase6().catch((err) => {
  console.error('Phase 6 test failed:', err);
  process.exit(1);
});
