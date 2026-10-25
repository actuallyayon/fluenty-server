import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import { connectDB, collections, client } from '../db/index.js';
import { ObjectId } from 'mongodb';

async function seedMockExam() {
  await connectDB();

  const existingMock = await collections.mockExams().findOne();
  if (existingMock) {
    console.log('✅ Mock exam already exists:', existingMock.title);
    await client.close();
    return;
  }

  const passage = await collections.passages().findOne();
  const listening = await collections.listeningItems().findOne();
  let task1 = await collections.writingPrompts().findOne({ taskType: 'task1' });
  let task2 = await collections.writingPrompts().findOne({ taskType: 'task2' });
  const speaking = await collections.speakingCues().findOne();

  if (!task1) {
    const t1Doc = {
      _id: new ObjectId(),
      title: 'Water Consumption Chart Analysis',
      taskType: 'task1' as const,
      prompt: 'The chart below shows global agricultural and industrial water usage from 2000 to 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\nWrite at least 150 words.',
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await collections.writingPrompts().insertOne(t1Doc);
    task1 = t1Doc;
  }

  if (!task2) {
    const t2Doc = {
      _id: new ObjectId(),
      title: 'Remote Work vs Traditional Office Work',
      taskType: 'task2' as const,
      prompt: 'Some people believe that employees should be allowed to work from home whenever possible, while others argue that working in an office is better for company productivity.\n\nDiscuss both views and give your own opinion.\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\nWrite at least 250 words.',
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await collections.writingPrompts().insertOne(t2Doc);
    task2 = t2Doc;
  }

  if (!passage || !listening || !speaking) {
    console.error('Missing core passage, listening, or speaking items. Run seed-practice-content first.');
    await client.close();
    return;
  }

  const mockExamDoc = {
    _id: new ObjectId(),
    title: 'IELTS Academic Full Mock Exam 01',
    descriptionBn: 'লিসেনিং, রিডিং, রাইটিং এবং স্পিকিং—চারটি মডিউলের সম্পূর্ণ অফিসিয়াল টাইমিং ও স্কোরকার্ড সহ মক টেস্ট।',
    descriptionEn: 'Official timed 4-skill simulation covering Listening, Reading, Writing, and Speaking with composite band scoring.',
    readingPassageId: passage._id,
    listeningItemId: listening._id,
    writingTask1PromptId: task1._id,
    writingTask2PromptId: task2._id,
    speakingCueId: speaking._id,
    difficulty: 'standard' as const,
    status: 'published' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collections.mockExams().insertOne(mockExamDoc);
  console.log('🎉 Successfully created Full Mock Exam:', mockExamDoc.title);
  await client.close();
}

seedMockExam().catch((err) => {
  console.error('Seed mock exam failed:', err);
  process.exit(1);
});
