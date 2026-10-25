import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore
}
import { connectDB, collections, client } from '../db/index.js';
import { ObjectId } from 'mongodb';

async function seedPracticeContent() {
  console.log('🌱 Checking and enriching Phase 4 practice content...');
  await connectDB();

  // 1. Reading Passage Check
  let passage = await collections.passages().findOne({ status: 'published' });
  if (!passage) {
    console.log('No published passage found, creating default IELTS academic passage...');
    const passageId = new ObjectId();
    await collections.passages().insertOne({
      _id: passageId,
      title: 'The Rise of Urban Agriculture in Modern Megacities',
      content: `[Paragraph A] As the global population approaches eight billion, urban centers are experiencing unprecedented strain on their traditional food supply chains. Transporting perishable agricultural goods over hundreds of kilometers contributes significantly to greenhouse gas emissions and leads to substantial nutrient loss before reaching consumers. In response to these pressing ecological challenges, architects, agricultural engineers, and municipal policymakers have pioneered innovative urban farming models, predominantly vertical hydroponics and rooftop cooperatives.

[Paragraph B] Vertical hydroponic facilities cultivate leafy greens and vegetables in stacked, climate-controlled indoor environments without soil. Plants receive nutrient-rich water solutions while artificial LED illumination mimics optimal photosynthetic solar wavelengths. This indoor architecture reduces freshwater consumption by up to ninety percent compared to traditional field irrigation, as the circulating water is continuously recycled through closed-loop filtration systems. Furthermore, eliminating soil effectively mitigates the risk of soil-borne pathogens and pests, thereby eliminating the necessity for chemical synthetic pesticides.

[Paragraph C] Despite these notable ecological advantages, critics question the economic scalability of high-tech vertical farms. The capital expenditure required for automated robotics, thermal regulation, and high-intensity LED fixtures remains formidable. Additionally, their operational reliance on municipal electricity grids can inadvertently offset environmental gains unless powered exclusively by renewable energy sources.

[Paragraph D] Conversely, community-managed rooftop gardens represent a lower-cost, highly accessible alternative, providing urban neighborhoods with organic nutrition while fostering social cohesion among diverse demographics.`,
      difficulty: 'academic',
      timeLimitMinutes: 20,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    passage = await collections.passages().findOne({ _id: passageId });
  }

  const passageId = passage!._id;

  // Check existing questions for this passage
  const existingQuestions = await collections.questions().find({ passageId }).toArray();
  const existingTypes = new Set(existingQuestions.map((q) => q.type));

  console.log(`Current reading questions count: ${existingQuestions.length}, types:`, Array.from(existingTypes));

  const questionsToAdd = [];

  // Add Fill in the blank if missing
  if (!existingTypes.has('fill_in_the_blank')) {
    questionsToAdd.push({
      _id: new ObjectId(),
      passageId,
      type: 'fill_in_the_blank' as const,
      prompt:
        'Complete the sentence below. Write NO MORE THAN TWO WORDS from the passage:\nClosed-loop filtration systems enable vertical farms to reduce __________ consumption by ninety percent.',
      correctAnswer: 'freshwater',
      explanationEn:
        'Paragraph B mentions that closed-loop filtration enables reducing freshwater consumption by up to ninety percent.',
      explanationBn:
        'প্যারাগ্রাফ B-তে স্পষ্টভাবে লেখা আছে: "This indoor architecture reduces freshwater consumption by up to ninety percent..."। সুতরাং সঠিক শব্দ হলো freshwater।',
      evidenceQuote:
        'This indoor architecture reduces freshwater consumption by up to ninety percent compared to traditional field irrigation',
      order: 4,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Add Matching Headings if missing
  if (!existingTypes.has('matching_headings')) {
    questionsToAdd.push({
      _id: new ObjectId(),
      passageId,
      type: 'matching_headings' as const,
      prompt:
        'Choose the correct heading for [Paragraph C] from the list of headings below:\ni. Technological challenges and financial hurdles\nii. Nutritional superiority of organic crops\niii. Government subsidies for urban agriculture\niv. Community participation in local parks',
      options: [
        'i. Technological challenges and financial hurdles',
        'ii. Nutritional superiority of organic crops',
        'iii. Government subsidies for urban agriculture',
        'iv. Community participation in local parks',
      ],
      correctAnswer: 'i. Technological challenges and financial hurdles',
      explanationEn:
        'Paragraph C focuses on criticism regarding high capital expenditure, electricity dependence, and economic scalability.',
      explanationBn:
        'প্যারাগ্রাফ C-এর মূল আলোচ্য বিষয় হলো উল্লম্ব খামারের উচ্চ মূলধনী খরচ (capital expenditure), বিদ্যুৎ গ্রিডের উপর নির্ভরতা এবং আর্থিক সীমাবদ্ধতা। তাই শিরোনাম "Technological challenges and financial hurdles" যথার্থ।',
      evidenceQuote:
        'critics question the economic scalability of high-tech vertical farms. The capital expenditure required... remains formidable.',
      order: 5,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  if (questionsToAdd.length > 0) {
    await collections.questions().insertMany(questionsToAdd);
    console.log(`✅ Added ${questionsToAdd.length} questions to reading passage (now has all 4 types).`);
  }

  // 2. Listening Module & Questions Check
  let listeningItem = await collections.listeningItems().findOne({ status: 'published' });
  if (!listeningItem) {
    const lId = new ObjectId();
    await collections.listeningItems().insertOne({
      _id: lId,
      title: 'University Library Orientation & Borrowing Regulations',
      // High-availability speech audio URL
      audioUrl: '/audio/library_orientation.wav',
      transcript: `Librarian: Good morning, welcome to Central University Library. How may I assist you today?
Student: Hello! I am an international post-graduate student, and I would like to register for my library borrowing privileges.
Librarian: Wonderful. You will need your student identification card and proof of local address in the city. Under our borrowing policy, masters students are permitted to check out up to twelve books simultaneously for a duration of three weeks.
Student: Is there any penalty if I return a book overdue?
Librarian: Yes, standard loans incur a fine of fifty pence per day, whereas reserve books kept overnight carry a penalty of two pounds per hour.
Student: And what time does the reference section close on weekdays?
Librarian: The reference wing is accessible until nine thirty PM from Monday through Thursday, and until eight PM on Fridays.`,
      section: 1,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    listeningItem = await collections.listeningItems().findOne({ _id: lId });
  }

  const listeningItemId = listeningItem!._id;

  // Check questions for listening item
  const existingListeningQuestions = await collections
    .questions()
    .find({ listeningItemId })
    .toArray();

  if (existingListeningQuestions.length === 0) {
    const listeningQuestions = [
      {
        _id: new ObjectId(),
        listeningItemId,
        type: 'multiple_choice' as const,
        prompt: 'How many books are masters students permitted to borrow at one time?',
        options: [
          'A. Eight books',
          'B. Ten books',
          'C. Twelve books',
          'D. Fifteen books',
        ],
        correctAnswer: 'C. Twelve books',
        explanationEn:
          'The librarian clearly states: "masters students are permitted to check out up to twelve books simultaneously".',
        explanationBn:
          'লাইব্রেরিয়ান স্পষ্টভাবে উল্লেখ করেছেন যে মাস্টার্স শিক্ষার্থীরা একসাথে সর্বোচ্চ ১২টি বই ধার নিতে পারবেন।',
        evidenceQuote:
          'masters students are permitted to check out up to twelve books simultaneously for a duration of three weeks.',
        order: 1,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        listeningItemId,
        type: 'fill_in_the_blank' as const,
        prompt:
          'Complete the notes. Write ONE WORD AND/OR A NUMBER:\nOverdue penalty for standard loans: __________ pence per day.',
        correctAnswer: 'fifty',
        explanationEn:
          'The librarian says: "standard loans incur a fine of fifty pence per day".',
        explanationBn:
          'অডিও ট্রান্সক্রিপ্টে লাইব্রেরিয়ান জানান সাধারণ বই দেরিতে জমা দিলে প্রতিদিন পঞ্চাশ পেন্স (fifty pence) জরিমানা দিতে হয়।',
        evidenceQuote: 'standard loans incur a fine of fifty pence per day',
        order: 2,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        listeningItemId,
        type: 'true_false_not_given' as const,
        prompt: 'Reserve books kept overnight carry a penalty of two pounds per day.',
        correctAnswer: 'False',
        explanationEn:
          'The librarian explains the penalty is two pounds PER HOUR, not per day.',
        explanationBn:
          'লাইব্রেরিয়ান বলেছেন রিজার্ভ বইয়ের ক্ষেত্রে জরিমানা প্রতি ঘণ্টায় ২ পাউন্ড (two pounds per hour), প্রতি দিনে নয়। অতএব উত্তর False।',
        evidenceQuote: 'reserve books kept overnight carry a penalty of two pounds per hour',
        order: 3,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await collections.questions().insertMany(listeningQuestions);
    console.log(`✅ Seeded ${listeningQuestions.length} listening questions.`);
  } else {
    console.log(`ℹ️ Listening questions already exist (${existingListeningQuestions.length} items).`);
  }

  console.log('🎉 Phase 4 practice content verified successfully!');
  await client.close();
}

seedPracticeContent().catch((err) => {
  console.error('Failed to seed practice content:', err);
  process.exit(1);
});
