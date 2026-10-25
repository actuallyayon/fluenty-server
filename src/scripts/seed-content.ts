import { connectDB, collections, client } from '../db/index.js';
import { ObjectId } from 'mongodb';

async function seedContent() {
  console.log('🌱 Starting Phase 2 content seeding...');
  await connectDB();

  // 1. Seed Vocab
  const vocabCount = await collections.vocabItems().countDocuments();
  if (vocabCount === 0) {
    const vocabData = [
      {
        _id: new ObjectId(),
        word: 'Pervasive',
        partOfSpeech: 'adjective',
        pronunciation: '/pərˈveɪsɪv/',
        meaningEn: 'Spreading widely throughout an area or a group of people.',
        meaningBn: 'সর্বব্যাপী বা যা চারদিকে ব্যাপকভাবে ছড়িয়ে পড়ে।',
        exampleEn: 'Smartphone technology has a pervasive influence on modern social interactions.',
        exampleBn: 'আধুনিক সামাজিক যোগাযোগের ওপর স্মার্টফোন প্রযুক্তির একটি সর্বব্যাপী প্রভাব রয়েছে।',
        topic: 'Technology & Society',
        difficulty: 'medium' as const,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        word: 'Ambiguous',
        partOfSpeech: 'adjective',
        pronunciation: '/æmˈbɪɡjuəs/',
        meaningEn: 'Open to more than one interpretation; not having one obvious meaning.',
        meaningBn: 'দ্ব্যর্থবোধক বা অস্পষ্ট, যার একাধিক অর্থ হতে পারে।',
        exampleEn: 'The instructions provided by the examiner were somewhat ambiguous.',
        exampleBn: 'পরীক্ষকের দেওয়া নির্দেশনাগুলো কিছুটা অস্পষ্ট বা দ্ব্যর্থবোধক ছিল।',
        topic: 'Academic Writing',
        difficulty: 'medium' as const,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        word: 'Pragmatic',
        partOfSpeech: 'adjective',
        pronunciation: '/præɡˈmætɪk/',
        meaningEn: 'Dealing with things sensibly and realistically in a practical way.',
        meaningBn: 'বাস্তবধর্মী বা প্রায়োগিক দৃষ্টিভঙ্গিসম্পন্ন।',
        exampleEn: 'A pragmatic approach is necessary to tackle urban traffic congestion.',
        exampleBn: 'শহরের যানজট নিরসনে একটি বাস্তবসম্মত বা প্রায়োগিক দৃষ্টিভঙ্গি প্রয়োজন।',
        topic: 'Urban Planning',
        difficulty: 'hard' as const,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        word: 'Mitigate',
        partOfSpeech: 'verb',
        pronunciation: '/ˈmɪtɪɡeɪt/',
        meaningEn: 'Make something bad less severe, serious, or painful.',
        meaningBn: 'তীব্রতা কমানো বা উপশম করা।',
        exampleEn: 'Planting more trees can significantly mitigate the effects of carbon emissions.',
        exampleBn: 'অধিক গাছ লাগানো কার্বন নিঃসরণের ক্ষতিকর প্রভাব উল্লেখযোগ্যভাবে কমাতে পারে।',
        topic: 'Environment',
        difficulty: 'hard' as const,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        word: 'Detrimental',
        partOfSpeech: 'adjective',
        pronunciation: '/ˌdetrɪˈmentl/',
        meaningEn: 'Tending to cause harm or damage.',
        meaningBn: 'ক্ষতিকর বা অপকারী।',
        exampleEn: 'Excessive consumption of fast food is detrimental to cardiovascular health.',
        exampleBn: 'অতিরিক্ত ফাস্টফুড গ্রহণ হৃদযন্ত্রের স্বাস্থ্যের জন্য অত্যন্ত ক্ষতিকর।',
        topic: 'Health & Diet',
        difficulty: 'easy' as const,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await collections.vocabItems().insertMany(vocabData);
    console.log(`✅ Seeded ${vocabData.length} vocabulary items.`);
  } else {
    console.log(`ℹ️ Vocab items already seeded (${vocabCount} items).`);
  }

  // 2. Seed Grammar Lessons (Bangla speaker common mistakes)
  const lessonsCount = await collections.lessons().countDocuments();
  if (lessonsCount === 0) {
    const lessonsData = [
      {
        _id: new ObjectId(),
        title: 'Definite & Indefinite Articles (A, An, The)',
        titleBn: 'আর্টিকেল ব্যবহারের সঠিক নিয়ম ও ভুল সংশোধন',
        category: 'grammar' as const,
        subCategory: 'articles',
        contentEn:
          'Bangla does not have direct equivalents of English articles (a/an/the), which leads to frequent omission or overuse in IELTS writing.',
        contentBn:
          'বাংলা ভাষায় কোনো সুনির্দিষ্ট আর্টিকেল কাঠামো না থাকায় বাঙালি শিক্ষার্থীরা প্রায়শই আনকাউন্টেবল নাউনের আগে "the" অথবা প্রথমবার উল্লেখিত স্পেসিফিক নাউনে আর্টিকেল বাদ দেন।',
        commonMistakesBn: [
          {
            incorrect: 'She works as teacher in school.',
            correct: 'She works as a teacher in a school.',
            explanationBn:
              'পেশা (profession) উল্লেখ করার সময় Singular Countable Noun-এর পূর্বে সর্বদা a/an বসাতে হয়।',
          },
          {
            incorrect: 'The pollution is a major problem.',
            correct: 'Pollution is a major problem.',
            explanationBn:
              'সাধারণভাবে কোনো Uncountable Noun (যেমন Pollution, Water, Education) সম্পর্কে সার্বিক সত্য কথা বললে "The" বসে না।',
          },
        ],
        order: 1,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        title: 'Mastering Prepositions (In, On, At, To, With)',
        titleBn: 'প্রিপজিশনের জটিলতা ও বাঙালির চিরচেনা ভুল',
        category: 'grammar' as const,
        subCategory: 'prepositions',
        contentEn:
          'Prepositions must be learned as natural collocations rather than through literal Bangla translation.',
        contentBn:
          'বাংলা বিভক্তি (এ, য়, তে) থেকে আক্ষরিক অনুবাদ করতে গিয়ে বাঙালি শিক্ষার্থীরা "married with" কিংবা "discuss about" জাতীয় গুরুতর ভুল করে থাকেন।',
        commonMistakesBn: [
          {
            incorrect: 'He is married with a doctor.',
            correct: 'He is married to a doctor.',
            explanationBn:
              'ইংরেজি ব্যাকরণে বিবাহ বন্ধন বোঝাতে "married"-এর সাথে সর্বদা "to" বসে, "with" নয়।',
          },
          {
            incorrect: 'We will discuss about this issue.',
            correct: 'We will discuss this issue.',
            explanationBn:
              '"Discuss" একটি Transitive Verb। এর পরে সরাসরি Object বসে, "about" প্রিপজিশন বসে না।',
          },
        ],
        order: 2,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        title: 'Subject-Verb Agreement in Complex Sentences',
        titleBn: 'সাবজেক্ট ও ভার্বের সঙ্গতি রক্ষা',
        category: 'grammar' as const,
        subCategory: 'subject-verb-agreement',
        contentEn:
          'Identifying the true grammatical subject when prepositional phrases or relative clauses intervene.',
        contentBn:
          'সাবজেক্ট ও ভার্বের মাঝখানে যখন বড় কোনো ফ্রেজ থাকে (যেমন: "one of the students"), তখন অনেকেই শেষের Plural শব্দ দেখে বহুবচন ভার্ব ব্যবহার করেন যা IELTS Band score কমিয়ে দেয়।',
        commonMistakesBn: [
          {
            incorrect: 'One of my friends are coming today.',
            correct: 'One of my friends is coming today.',
            explanationBn:
              'এখানে মূল সাবজেক্ট হলো "One" (একবচন), "friends" নয়। সুতরাং ভার্ব হবে "is"।',
          },
        ],
        order: 3,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        title: 'Present Perfect vs. Simple Past',
        titleBn: 'প্রেজেন্ট পারফেক্ট বনাম পাস্ট সিম্পল টেন্সের সূক্ষ্ম পার্থক্য',
        category: 'grammar' as const,
        subCategory: 'tenses',
        contentEn:
          'Bangla uses the same past tense form where English strictly distinguishes between finished time periods and ongoing relevance.',
        contentBn:
          'বাংলায় "আমি গতকাল এসেছি" এবং "আমি এইমাত্র এসেছি" উভয়েই অতীত ক্রিয়া হলেও ইংরেজিতে সুনির্দিষ্ট অতীত সময় (yesterday, last year) থাকলে শুধুমাত্র Simple Past ব্যবহার করতে হয়।',
        commonMistakesBn: [
          {
            incorrect: 'I have completed my graduation last year.',
            correct: 'I completed my graduation last year.',
            explanationBn:
              '"Last year" একটি সুনির্দিষ্ট সমাপ্ত সময় (Finished time)। এর সাথে কখনো Present Perfect (have completed) বসে না, Past Simple (completed) বসে।',
          },
        ],
        order: 4,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await collections.lessons().insertMany(lessonsData);
    console.log(`✅ Seeded ${lessonsData.length} grammar lessons.`);
  } else {
    console.log(`ℹ️ Lessons already seeded (${lessonsCount} items).`);
  }

  // 3. Seed Reading Passage and Questions
  const passageCount = await collections.passages().countDocuments();
  if (passageCount === 0) {
    const passageId = new ObjectId();
    const passageDoc = {
      _id: passageId,
      title: 'The Rise of Urban Agriculture in Modern Megacities',
      content: `As the global population approaches eight billion, urban centers are experiencing unprecedented strain on their traditional food supply chains. Transporting perishable agricultural goods over hundreds of kilometers contributes significantly to greenhouse gas emissions and leads to substantial nutrient loss before reaching consumers. In response to these pressing ecological challenges, architects, agricultural engineers, and municipal policymakers have pioneered innovative urban farming models, predominantly vertical hydroponics and rooftop cooperatives.

Vertical hydroponic facilities cultivate leafy greens and vegetables in stacked, climate-controlled indoor environments without soil. Plants receive nutrient-rich water solutions while artificial LED illumination mimics optimal photosynthetic solar wavelengths. This indoor architecture reduces freshwater consumption by up to ninety percent compared to traditional field irrigation, as the circulating water is continuously recycled through closed-loop filtration systems. Furthermore, eliminating soil effectively mitigates the risk of soil-borne pathogens and pests, thereby eliminating the necessity for chemical synthetic pesticides.

Despite these notable ecological advantages, critics question the economic scalability of high-tech vertical farms. The capital expenditure required for automated robotics, thermal regulation, and high-intensity LED fixtures remains formidable. Additionally, their operational reliance on municipal electricity grids can inadvertently offset environmental gains unless powered exclusively by renewable energy sources. Conversely, community-managed rooftop gardens represent a lower-cost, highly accessible alternative, providing urban neighborhoods with organic nutrition while fostering social cohesion among diverse demographics.`,
      difficulty: 'academic' as const,
      timeLimitMinutes: 20,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collections.passages().insertOne(passageDoc);

    const questionsData = [
      {
        _id: new ObjectId(),
        passageId,
        type: 'true_false_not_given' as const,
        prompt:
          'Vertical hydroponic systems consume more freshwater than conventional agriculture.',
        correctAnswer: 'False',
        explanationEn:
          'The passage explicitly states that vertical hydroponics reduces freshwater consumption by up to ninety percent compared to traditional field irrigation.',
        explanationBn:
          'প্যাসেজের দ্বিতীয় প্যারায় সরাসরি উল্লেখ আছে যে উল্লম্ব হাইড্রোপনিক ব্যবস্থা প্রচলিত মাঠের সেচের তুলনায় শতকরা ৯০ ভাগ পর্যন্ত সুপেয় পানির অপচয় কমায়। অতএব উত্তরটি False।',
        evidenceQuote:
          'This indoor architecture reduces freshwater consumption by up to ninety percent compared to traditional field irrigation.',
        order: 1,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        passageId,
        type: 'true_false_not_given' as const,
        prompt:
          'Synthetic pesticides are avoided in vertical farms because crops are grown without soil.',
        correctAnswer: 'True',
        explanationEn:
          'The text mentions that eliminating soil eliminates the risk of soil-borne pathogens, thereby removing the necessity for synthetic pesticides.',
        explanationBn:
          'প্যাসেজে বলা হয়েছে মাটি বাদ দেওয়ার ফলে মাটিবাহিত জীবাণু দূর হয় এবং কৃত্রিম কীটনাশক ব্যবহারের আর কোনো প্রয়োজন থাকে না। তাই এটি True।',
        evidenceQuote:
          'eliminating soil effectively mitigates the risk of soil-borne pathogens and pests, thereby eliminating the necessity for chemical synthetic pesticides.',
        order: 2,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        passageId,
        type: 'multiple_choice' as const,
        prompt: 'According to the author, what is a primary limitation of high-tech vertical farms?',
        options: [
          'A. They produce lower quality produce than soil-based farming.',
          'B. The initial capital expenditure and electricity costs are substantial.',
          'C. They fail to reduce carbon emissions under any circumstances.',
          'D. Urban workers lack the botanical training to operate them.',
        ],
        correctAnswer: 'B. The initial capital expenditure and electricity costs are substantial.',
        explanationEn:
          'The third paragraph discusses the high capital expenditure for equipment and continuous operational reliance on the power grid as main concerns.',
        explanationBn:
          'তৃতীয় প্যারায় স্পষ্টভাবে বলা হয়েছে যে উল্লম্ব খামারের জন্য প্রাথমিক মূলধন ব্যয় (Capital expenditure) এবং বিদ্যুৎ গ্রিডের ওপর অতিমাত্রায় নির্ভরতা এর অন্যতম প্রধান সীমাবদ্ধতা।',
        evidenceQuote:
          'The capital expenditure required for automated robotics, thermal regulation, and high-intensity LED fixtures remains formidable.',
        order: 3,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await collections.questions().insertMany(questionsData);
    console.log(`✅ Seeded reading passage and ${questionsData.length} questions.`);
  } else {
    console.log(`ℹ️ Reading passages already seeded (${passageCount} items).`);
  }

  // 4. Seed Listening Item
  const listeningCount = await collections.listeningItems().countDocuments();
  if (listeningCount === 0) {
    const listeningDoc = {
      _id: new ObjectId(),
      title: 'University Library Orientation & Borrowing Regulations',
      audioUrl: 'https://cdn.example.com/audio/ielts_section1_library.mp3',
      transcript:
        'Librarian: Good morning, welcome to Central University Library. How may I assist you today?\nStudent: Hello! I am an international post-graduate student, and I would like to register for my library borrowing privileges.\nLibrarian: Wonderful. You will need your student identification card and proof of local address in the city. Under our borrowing policy, masters students are permitted to check out up to twelve books simultaneously for a duration of three weeks.\nStudent: Is there any penalty if I return a book overdue?\nLibrarian: Yes, standard loans incur a fine of fifty pence per day, whereas reserve books kept overnight carry a penalty of two pounds per hour.',
      section: 1 as const,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await collections.listeningItems().insertOne(listeningDoc);
    console.log('✅ Seeded 1 listening module.');
  } else {
    console.log(`ℹ️ Listening items already seeded (${listeningCount} items).`);
  }

  // 5. Seed Writing Prompts
  const writingCount = await collections.writingPrompts().countDocuments();
  if (writingCount === 0) {
    const writingData = [
      {
        _id: new ObjectId(),
        taskType: 'task1' as const,
        title: 'Energy Production by Source (1995-2025)',
        prompt:
          'The chart illustrates the proportion of total energy generated from coal, natural gas, nuclear power, and renewable energy in a European country between 1995 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        taskType: 'task2' as const,
        title: 'Remote Work vs. Traditional Office Environments',
        prompt:
          'Some people believe that working remotely from home improves employees’ productivity and work-life balance. Others argue that physical office environments are indispensable for collaboration and team cohesion. Discuss both views and give your own opinion. Give reasons for your answer and include relevant examples from your knowledge or experience. Write at least 250 words.',
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await collections.writingPrompts().insertMany(writingData);
    console.log(`✅ Seeded ${writingData.length} writing prompts.`);
  } else {
    console.log(`ℹ️ Writing prompts already seeded (${writingCount} items).`);
  }

  // 6. Seed Speaking Cue Cards
  const speakingCount = await collections.speakingCues().countDocuments();
  if (speakingCount === 0) {
    const speakingData = [
      {
        _id: new ObjectId(),
        topic: 'Describe an inspiring teacher who influenced your life',
        topicBn: 'এমন একজন শিক্ষকের বর্ণনা দিন যিনি আপনার জীবনে গভীর অনুপ্রেরণা জুগিয়েছেন',
        cueCard:
          'Describe a teacher from your past who positively impacted your education or personal development.\nYou should say:\n- Who this teacher was and which subject they taught\n- When and where you met them\n- What special qualities or teaching methods made them memorable\nAnd explain how they influenced your perspective or career goals.',
        cueCardBn:
          'আপনার অতীতের এমন একজন শিক্ষকের কথা বলুন যিনি আপনার পড়াশোনা বা ব্যক্তিত্ব গঠনে ইতিবাচক প্রভাব ফেলেছিলেন।\nআপনার বলা উচিত:\n- এই শিক্ষক কে ছিলেন এবং তিনি কোন বিষয়ে পড়াতেন\n- আপনি কোথায় এবং কখন তাঁর সান্নিধ্যে এসেছিলেন\n- কোন বিশেষ গুণাবলি বা পাঠদান পদ্ধতির কারণে তিনি স্মরণীয়\nএবং ব্যাখ্যা করুন কীভাবে তিনি আপনার চিন্তাভাবনা বা ক্যারিয়ারের লক্ষ্যে প্রভাব ফেলেছিলেন।',
        bulletPoints: [
          'Who the teacher was and the subject',
          'When and where you took their classes',
          'Their unique pedagogical methods',
          'How their mentorship influenced your journey',
        ],
        bulletPointsBn: [
          'শিক্ষকের পরিচয় এবং পঠিত বিষয়',
          'কবে ও কোথায় তাঁর ক্লাস করেছিলেন',
          'তাঁর পাঠদানের অনন্য বৈশিষ্ট্য',
          'কীভাবে তাঁর দিকনির্দেশনা আপনার জীবনকে প্রভাবিত করেছিল',
        ],
        part: 2 as const,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await collections.speakingCues().insertMany(speakingData);
    console.log(`✅ Seeded ${speakingData.length} speaking cue card.`);
  } else {
    console.log(`ℹ️ Speaking cue cards already seeded (${speakingCount} items).`);
  }

  console.log('🎉 Phase 2 content seeding completed successfully!');
  await client.close();
}

seedContent().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
