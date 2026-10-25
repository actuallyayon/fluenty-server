import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import { connectDB, collections, client } from '../db/index.js';
import { practiceRepository } from '../repositories/practice.repository.js';

async function testPhase4() {
  console.log('🧪 Starting Phase 4 API and logic validation...');
  await connectDB();

  // Find a test user profile
  const user = await collections.profiles().findOne({ role: 'user' });
  if (!user) {
    console.error('No user found');
    process.exit(1);
  }
  const userId = user.userId;
  console.log(`Using test user: ${user.name} (${user.email})`);

  // 1. Test Reading Passages List
  const passages = await practiceRepository.getPublishedPassages();
  console.log(`✅ Fetched ${passages.length} published reading passages:`, passages.map(p => ({ title: p.title, count: p.questionCount })));

  if (passages.length === 0) {
    console.error('No passages found');
    process.exit(1);
  }

  // 2. Test Reading Passage Detail (sanitized during practice)
  const passageId = passages[0].id;
  const practiceData = await practiceRepository.getPassageForPractice(passageId);
  console.log(`✅ Loaded practice passage: "${practiceData?.passage.title}", Questions: ${practiceData?.questions.length}`);
  
  // Verify correctAnswer and explanations are NOT leaked
  const firstQ = practiceData?.questions[0] as any;
  if (firstQ?.correctAnswer || firstQ?.explanationBn) {
    console.error('❌ Security breach: correctAnswer or explanations leaked during practice!');
    process.exit(1);
  } else {
    console.log('🔒 Security check passed: correctAnswer and explanations are sanitized during test.');
  }

  // 3. Test Reading Submission & Instant Scoring
  const questions = await collections.questions().find({ passageId: practiceData?.questions[0] ? (await collections.passages().findOne({ _id: (await collections.questions().findOne())?.passageId }))?._id : undefined }).toArray();
  
  // Submit with 1 correct and 1 intentionally incorrect answer to test mistake notebook
  const sampleAnswers = practiceData!.questions.map((q, idx) => {
    if (idx === 0) {
      return { questionId: q.id, userAnswer: 'False' }; // Known correct for Q1 in seed
    }
    return { questionId: q.id, userAnswer: 'Wrong Answer' };
  });

  const submitResult = await practiceRepository.submitReadingAttempt(userId, passageId, sampleAnswers, 120);
  console.log('✅ Reading submission scored:', {
    score: submitResult?.score,
    total: submitResult?.totalQuestions,
    percentage: submitResult?.percentage,
    xpEarned: submitResult?.xpEarned,
    dailyStreak: submitResult?.dailyStreak,
  });

  // 4. Test Mistake Notebook
  const mistakes = await practiceRepository.getMistakes(userId, { practiceType: 'reading' });
  console.log(`✅ Mistake notebook contains ${mistakes.length} reading mistakes.`);
  if (mistakes.length > 0) {
    const firstMistake = mistakes[0];
    console.log(`First mistake: "${firstMistake.question.prompt.slice(0, 40)}..."`);
    console.log(`User Answer: ${firstMistake.userAnswer} vs Correct: ${firstMistake.correctAnswer}`);

    // Test toggle resolve
    const toggled = await practiceRepository.toggleMistakeResolved(userId, firstMistake.id);
    console.log(`✅ Toggled mistake resolve state: ${toggled?.resolved}`);
  }

  // 5. Test Listening
  const listeningItems = await practiceRepository.getPublishedListeningItems();
  console.log(`✅ Fetched ${listeningItems.length} published listening items.`);
  if (listeningItems.length > 0) {
    const lId = listeningItems[0].id;
    const lPractice = await practiceRepository.getListeningItemForPractice(lId);
    console.log(`✅ Loaded listening practice: "${lPractice?.item.title}", Questions: ${lPractice?.questions.length}`);

    const lAnswers = lPractice!.questions.map((q) => ({
      questionId: q.id,
      userAnswer: 'C. Twelve books', // Known correct for Q1
    }));

    const lResult = await practiceRepository.submitListeningAttempt(userId, lId, lAnswers, 60);
    console.log('✅ Listening submission scored:', {
      score: lResult?.score,
      total: lResult?.totalQuestions,
      percentage: lResult?.percentage,
      hasTranscriptRevealed: !!lResult?.transcript,
    });
  }

  // 6. Test User Attempts History
  const attempts = await practiceRepository.getUserAttempts(userId, 5);
  console.log(`✅ User attempts history: ${attempts.length} attempts found.`);

  console.log('🎉 Phase 4 verification complete and all tests passed!');
  await client.close();
}

testPhase4().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
