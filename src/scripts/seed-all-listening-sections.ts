import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import { connectDB, collections, client } from '../db/index.js';
import { ObjectId } from 'mongodb';

async function seedAllListeningSections() {
  console.log('🌱 Seeding authentic IELTS Listening Sections 3 and 4...');
  await connectDB();

  // 1. Check Section 3 (Educational/Training Discussion: 2-3 university students/tutor)
  const existingSec3 = await collections.listeningItems().findOne({ section: 3 });
  if (!existingSec3) {
    const sec3Id = new ObjectId();
    const sec3Doc = {
      _id: sec3Id,
      title: 'University Marine Biology Field Trip — Research Planning Discussion',
      audioUrl: 'ai-speech://auto',
      section: 3 as const,
      status: 'published' as const,
      transcript: `Tutor: Good afternoon Sarah and Mark. Thanks for coming in to discuss your field project proposal for the coastal marine biology module. Have you finalized your sampling methodology?
Sarah: Yes, Dr. Henderson. We've decided to examine microplastic concentrations in intertidal rock pool sediments along the south bay. We initially considered comparing fish stomach contents, but obtaining the necessary ethical clearances would have taken four to six weeks.
Mark: Exactly. And rock pool invertebrates, particularly barnacles and blue mussels, act as reliable bio-indicators without requiring invasive sampling.
Tutor: That's a sensible and pragmatic choice. What about your statistical analysis? Are you planning to use regression modeling or variance analysis?
Sarah: Mark suggested one-way ANOVA across three distinct tidal zones—upper, mid, and low littoral zones—with six replicate samples per zone to ensure statistical robustness.
Tutor: Excellent. Keep in mind that wave exposure on the eastern headland differs markedly from the sheltered western inlet. You must control for that confounding variable.
Mark: We've factored that in. We will sample both exposed and sheltered sites simultaneously on day two during the spring low tide.`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await collections.listeningItems().insertOne(sec3Doc);

    const sec3Questions = [
      {
        _id: new ObjectId(),
        listeningItemId: sec3Id,
        type: 'multiple_choice' as const,
        prompt: 'Why did the students decide against analyzing fish stomach contents?',
        options: [
          'A. Equipment costs were prohibitively high.',
          'B. Obtaining ethical approval would have caused excessive delay.',
          'C. Fish populations were depleted in the south bay.',
          'D. Laboratory freezer storage was unavailable.',
        ],
        correctAnswer: 'B. Obtaining ethical approval would have caused excessive delay.',
        explanationEn:
          'Sarah states that obtaining ethical clearances would have taken four to six weeks, so they chose rock pool invertebrates instead.',
        explanationBn:
          'সারাহ উল্লেখ করেছেন যে এথিক্যাল অনুমোদন (ethical clearances) পেতে ৪ থেকে ৬ সপ্তাহ সময় লাগত, যা প্রকল্পের কাজকে অনেক পিছিয়ে দিত।',
        evidenceQuote:
          'obtaining the necessary ethical clearances would have taken four to six weeks.',
        order: 1,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        listeningItemId: sec3Id,
        type: 'multiple_choice' as const,
        prompt: 'Which organisms did Sarah and Mark choose as their primary bio-indicators?',
        options: [
          'A. Sea urchins and crabs',
          'B. Barnacles and blue mussels',
          'C. Green algae and sea grass',
          'D. Rock pool shrimp',
        ],
        correctAnswer: 'B. Barnacles and blue mussels',
        explanationEn:
          'Mark specifies that rock pool invertebrates, particularly barnacles and blue mussels, act as reliable bio-indicators.',
        explanationBn:
          'মার্ক স্পষ্টভাবে বলেন যে বার্নাকল এবং ব্লু মাসেলস (barnacles and blue mussels) নির্ভরযোগ্য নির্দেশক হিসেবে কাজ করে।',
        evidenceQuote:
          'rock pool invertebrates, particularly barnacles and blue mussels, act as reliable bio-indicators',
        order: 2,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        listeningItemId: sec3Id,
        type: 'fill_in_the_blank' as const,
        prompt:
          'Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER:\nThe students plan to collect __________ replicate samples per tidal zone.',
        correctAnswer: 'six',
        explanationEn:
          'Sarah confirms six replicate samples per zone to ensure statistical robustness.',
        explanationBn:
          'অডিওতে সারাহ জানান যে প্রতিটি জোনে ছয়টি (six) নমুনা নেওয়া হবে।',
        evidenceQuote: 'with six replicate samples per zone to ensure statistical robustness',
        order: 3,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        listeningItemId: sec3Id,
        type: 'true_false_not_given' as const,
        prompt: 'Dr. Henderson advised the students to account for differences in wave exposure between sites.',
        correctAnswer: 'True',
        explanationEn:
          'Dr. Henderson points out that wave exposure on the eastern headland differs from the sheltered western inlet and must be controlled.',
        explanationBn:
          'ডক্টর হেন্ডারসন শিক্ষার্থীদের ঢেউয়ের প্রভাব (wave exposure) নিয়ন্ত্রণ করার জন্য বিশেষ পরামর্শ দেন। তাই এটি True।',
        evidenceQuote:
          'wave exposure on the eastern headland differs markedly from the sheltered western inlet. You must control for that confounding variable.',
        order: 4,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await collections.questions().insertMany(sec3Questions);
    console.log(`✅ Seeded Section 3 test with ${sec3Questions.length} questions.`);
  } else {
    console.log('ℹ️ Section 3 already exists in database.');
  }

  // 2. Check Section 4 (Academic Lecture / Monograph: 1 university speaker)
  const existingSec4 = await collections.listeningItems().findOne({ section: 4 });
  if (!existingSec4) {
    const sec4Id = new ObjectId();
    const sec4Doc = {
      _id: sec4Id,
      title: 'The Evolution of Subterranean Mycelial Networks in Forest Ecosystems',
      audioUrl: 'ai-speech://auto',
      section: 4 as const,
      status: 'published' as const,
      transcript: `Lecturer: Good morning everyone. In today's lecture on evolutionary botany and soil microbiology, we will explore subterranean mycorrhizal networks—often popularized in modern science media as the "wood wide web."
Contrary to the 19th-century Darwinian paradigm which viewed individual forest trees purely as fierce competitors for sunlight and groundwater, isotopic tracing experiments over the past two decades have demonstrated an astonishing degree of inter-species cooperation.
Through microscopic fungal threads known as hyphae, mature canopy trees actively redistribute surplus photosynthetic carbon to understory seedlings. Remarkable isotope studies using carbon-14 reveal that veteran "mother trees" do not merely nourish their own offspring; they also channel nutrients to entirely distinct species during seasonal stress. For instance, Douglas firs transfer significant sugars to paper birch trees during early spring before the birch has fully developed its canopy. In reciprocal fashion, the deciduous birch returns carbon to evergreen firs during late autumn when fir saplings require supplementary energy.
Beyond nutrient allocation, these fungal highways function as biochemical early-warning alarm systems. When a tree is attacked by foliar pests like aphids or pine beetles, it synthesizes volatile distress compounds that travel through fungal hyphae within forty-eight hours, prompting neighboring unaffected trees to pre-emptively elevate protective tannin and resin production.`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await collections.listeningItems().insertOne(sec4Doc);

    const sec4Questions = [
      {
        _id: new ObjectId(),
        listeningItemId: sec4Id,
        type: 'multiple_choice' as const,
        prompt: 'What did traditional 19th-century botanical theory assume about forest trees?',
        options: [
          'A. They operated in mutualistic symbiosis with soil fungi.',
          'B. They acted primarily as aggressive competitors for light and water.',
          'C. They communicated biochemically across root systems.',
          'D. They shared photosynthetic sugars during severe droughts.',
        ],
        correctAnswer: 'B. They acted primarily as aggressive competitors for light and water.',
        explanationEn:
          'The lecturer notes the 19th-century paradigm viewed trees purely as fierce competitors for sunlight and groundwater.',
        explanationBn:
          'লেকচারার বলেন যে উনিশ শতকের প্রচলিত মতবাদে মনে করা হতো যে বনের গাছগুলো শুধুমাত্র সূর্যালোক ও পানির জন্য একে অপরের সাথে তীব্র প্রতিযোগিতা করে।',
        evidenceQuote:
          'viewed individual forest trees purely as fierce competitors for sunlight and groundwater',
        order: 1,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        listeningItemId: sec4Id,
        type: 'fill_in_the_blank' as const,
        prompt:
          'Complete the lecture summary. Write NO MORE THAN TWO WORDS:\nMicroscopic fungal filaments that connect tree roots are scientifically termed __________.',
        correctAnswer: 'hyphae',
        explanationEn:
          'The speaker introduces "microscopic fungal threads known as hyphae".',
        explanationBn:
          'গাছের শিকড় সংযোগকারী আণুবীক্ষণিক ছত্রাকের সুতাকে hyphae (হাইফি) বলা হয়।',
        evidenceQuote: 'microscopic fungal threads known as hyphae',
        order: 2,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        listeningItemId: sec4Id,
        type: 'fill_in_the_blank' as const,
        prompt:
          'Complete the notes. Write A NUMBER:\nBiochemical pest warnings travel through fungal pathways within __________ hours.',
        correctAnswer: 'forty-eight',
        explanationEn:
          'The lecturer mentions distress compounds travel through fungal hyphae within forty-eight hours.',
        explanationBn:
          'অডিওতে বলা হয়েছে সতর্কতামূলক রাসায়নিক সংকেত ৪৮ ঘণ্টার (forty-eight hours) মধ্যে প্রতিবেশীর কাছে পৌঁছায়।',
        evidenceQuote: 'travel through fungal hyphae within forty-eight hours',
        order: 3,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        listeningItemId: sec4Id,
        type: 'true_false_not_given' as const,
        prompt: 'Mother trees only transfer photosynthetic nutrients to saplings of their own biological species.',
        correctAnswer: 'False',
        explanationEn:
          'The lecturer refutes this directly, noting that mother trees also channel nutrients to distinct species, like Douglas firs sharing with paper birches.',
        explanationBn:
          'লেকচারার স্পষ্ট করেন যে মাদার ট্রি কেবল নিজের জাত নয়, বরং ভিন্ন প্রজাতির গাছেও খাদ্য সরবরাহ করে। সুতরাং উত্তরটি False।',
        evidenceQuote:
          'mother trees do not merely nourish their own offspring; they also channel nutrients to entirely distinct species',
        order: 4,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await collections.questions().insertMany(sec4Questions);
    console.log(`✅ Seeded Section 4 test with ${sec4Questions.length} questions.`);
  } else {
    console.log('ℹ️ Section 4 already exists in database.');
  }

  console.log('🎉 All IELTS Listening sections verified!');
  await client.close();
}

seedAllListeningSections().catch((e) => {
  console.error(e);
  process.exit(1);
});

