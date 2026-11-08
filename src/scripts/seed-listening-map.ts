import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore
}
import { ObjectId } from 'mongodb';
import { connectDB, collections, client } from '../db/index.js';

async function seedListeningMap() {
  console.log('🗺️ Seeding IELTS Listening Section 2 Map & Plan Direction test...');
  await connectDB();

  const title = 'Greenwood Country Park — Visitor Trails & Map Direction Guide';
  let existingItem = await collections.listeningItems().findOne({ title });

  let itemId: ObjectId;

  if (!existingItem) {
    itemId = new ObjectId();
    await collections.listeningItems().insertOne({
      _id: itemId,
      title,
      section: 2,
      audioUrl: 'ai-speech://auto',
      hasMap: true,
      mapTitle: 'Greenwood Country Park & Wildlife Sanctuary Layout',
      transcript: `Tour Guide: Welcome to the Greenwood Country Park orientation tour. Before you set off exploring the reserve, let me orient you on the layout of our grounds using the visitor map in your hands.

We are currently standing right at the South Gate, which is the main visitor entrance at the bottom of your map.

Immediately to your left as you enter through the South Gate is the Information Kiosk and Ticket Office, labelled as Location A. You can collect trail maps and binoculars here.

Now, if you look straight ahead, a wide gravel footpath leads north towards the river. Before you cross the river, just to the east of this main path, you will see the Children's Adventure Playground, which is marked as Location B on the map.

If you continue walking northward and cross the wooden footbridge over Willow River, the path branches into two. Taking the right-hand path leading towards the north-eastern corner brings you directly to our historic Herb Garden and Victorian Greenhouses, marked as Location C.

Alternatively, if you take the left-hand path from the footbridge, you will walk along the bank of the central lake. Situated directly on the western shore of the lake, secluded among the reeds, is the Bird Watching Hide, indicated by Location D.

Finally, for hot refreshments and homemade pastries, follow the perimeter path to the far north-western boundary where the trail meets the ancient woodland. That large timber building is the Woodland Tea Room and Bakery, marked as Location E on your map.`,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Created listening item: "${title}" (Section 2 with Map)`);
  } else {
    itemId = existingItem._id;
    await collections.listeningItems().updateOne(
      { _id: itemId },
      {
        $set: {
          hasMap: true,
          audioUrl: 'ai-speech://auto',
          mapTitle: 'Greenwood Country Park & Wildlife Sanctuary Layout',
          updatedAt: new Date(),
        },
      }
    );
    console.log(`ℹ️ Updated existing listening item: "${title}"`);
  }

  // Add questions
  const mapQuestions = [
    {
      order: 1,
      type: 'map_labelling' as const,
      prompt: 'Label the map. Choose the correct letter (A-E) for:\nInformation Kiosk and Ticket Office',
      options: ['A', 'B', 'C', 'D', 'E'],
      correctAnswer: 'A',
      evidenceQuote:
        'Immediately to your left as you enter through the South Gate is the Information Kiosk and Ticket Office, labelled as Location A.',
      explanationBn:
        'গাইড স্পষ্টভাবে বলেছেন: সাউথ গেট দিয়ে প্রবেশের সাথে সাথে হাতের বাঁ দিকে (immediately to your left) রয়েছে ইনফরমেশন কিয়স্ক, যা ম্যাপে Location A হিসেবে চিহ্নিত।',
      explanationEn:
        'The guide states: "Immediately to your left as you enter through the South Gate is the Information Kiosk and Ticket Office, labelled as Location A."',
    },
    {
      order: 2,
      type: 'map_labelling' as const,
      prompt: 'Label the map. Choose the correct letter (A-E) for:\nChildren\'s Adventure Playground',
      options: ['A', 'B', 'C', 'D', 'E'],
      correctAnswer: 'B',
      evidenceQuote:
        'Before you cross the river, just to the east of this main path, you will see the Children\'s Adventure Playground, which is marked as Location B on the map.',
      explanationBn:
        'নদী পার হওয়ার আগে, মূল রাস্তার পূর্ব দিকে (just to the east of this main path) শিশুদের খেলার মাঠ রয়েছে, যা ম্যাপে B।',
      explanationEn:
        'The guide notes that before crossing the river, east of the main path is the playground, marked as B.',
    },
    {
      order: 3,
      type: 'map_labelling' as const,
      prompt: 'Label the map. Choose the correct letter (A-E) for:\nHerb Garden and Victorian Greenhouses',
      options: ['A', 'B', 'C', 'D', 'E'],
      correctAnswer: 'C',
      evidenceQuote:
        'Taking the right-hand path leading towards the north-eastern corner brings you directly to our historic Herb Garden and Victorian Greenhouses, marked as Location C.',
      explanationBn:
        'নদীর কাঠের ব্রিজ পার হওয়ার পর ডানদিকের রাস্তা দিয়ে উত্তর-পূর্ব কোণে (north-eastern corner) গেলে ভিক্টোরিয়ান গ্রিনহাউস ও হার্ব গার্ডেন পাওয়া যায়, যা Location C।',
      explanationEn:
        'After crossing the bridge, the right-hand path leading to the north-eastern corner brings you to Location C.',
    },
    {
      order: 4,
      type: 'map_labelling' as const,
      prompt: 'Label the map. Choose the correct letter (A-E) for:\nBird Watching Hide',
      options: ['A', 'B', 'C', 'D', 'E'],
      correctAnswer: 'D',
      evidenceQuote:
        'Situated directly on the western shore of the lake, secluded among the reeds, is the Bird Watching Hide, indicated by Location D.',
      explanationBn:
        'ব্রিজ থেকে বাঁ দিকের রাস্তা ধরে লেকের পশ্চিম তীরে (western shore of the lake) রয়েছে বার্ড ওয়াচিং হাইড, যা ম্যাপে Location D।',
      explanationEn:
        'The left path leads to the western shore of the central lake where the Bird Watching Hide is marked as D.',
    },
    {
      order: 5,
      type: 'map_labelling' as const,
      prompt: 'Label the map. Choose the correct letter (A-E) for:\nWoodland Tea Room and Bakery',
      options: ['A', 'B', 'C', 'D', 'E'],
      correctAnswer: 'E',
      evidenceQuote:
        'follow the perimeter path to the far north-western boundary where the trail meets the ancient woodland. That large timber building is the Woodland Tea Room and Bakery, marked as Location E',
      explanationBn:
        'দূর উত্তর-পশ্চিম সীমান্তে (far north-western boundary) প্রাচীন বনের সাথে মিলিত স্থানে টি-রুম ও বেকারি অবস্থিত, যা ম্যাপে Location E।',
      explanationEn:
        'The perimeter path leads to the far north-western boundary where the Woodland Tea Room is marked as Location E.',
    },
  ];

  let addedQuestions = 0;
  for (const q of mapQuestions) {
    const existingQ = await collections.questions().findOne({
      listeningItemId: itemId,
      prompt: q.prompt,
    });

    if (!existingQ) {
      await collections.questions().insertOne({
        _id: new ObjectId(),
        listeningItemId: itemId,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        correctAnswer: q.correctAnswer,
        evidenceQuote: q.evidenceQuote,
        explanationBn: q.explanationBn,
        explanationEn: q.explanationEn,
        order: q.order,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      addedQuestions++;
    }
  }

  console.log(`🎉 Seeding complete! Added Section 2 Map test with ${addedQuestions} map direction questions.`);
  await client.close();
  process.exit(0);
}

seedListeningMap().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

