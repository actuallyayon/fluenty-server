import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import { connectDB, collections, client } from '../db/index.js';
import { ObjectId } from 'mongodb';

const LONDON_MAP_SVG = `<svg viewBox="0 0 650 380" className="w-full max-w-xl h-auto rounded-xl shadow-xs" xmlns="http://www.w3.org/2000/svg">
  <rect width="650" height="380" fill="#F0F4F1" rx="16" />
  
  <!-- River Thames -->
  <path d="M 0 160 C 180 130 350 210 650 170 L 650 250 C 350 290 180 210 0 240 Z" fill="#BAE6FD" stroke="#38BDF8" stroke-width="2" />
  <text x="320" y="215" text-anchor="middle" font-size="14" font-weight="bold" fill="#0284C7" letter-spacing="3">RIVER THAMES</text>
  
  <!-- Bridges -->
  <!-- London Bridge -->
  <rect x="230" y="130" width="45" height="135" rx="4" fill="#94A3B8" stroke="#475569" stroke-width="2" />
  <text x="252" y="200" text-anchor="middle" font-size="10" font-weight="bold" fill="#0F172A" transform="rotate(-90 252 200)">LONDON BRIDGE</text>
  
  <!-- Footpaths / Roads -->
  <path d="M 50 330 L 252 265 L 580 330" fill="none" stroke="#D1B894" stroke-width="16" stroke-linecap="round" />
  <path d="M 252 130 L 252 40 L 480 40" fill="none" stroke="#D1B894" stroke-width="16" stroke-linecap="round" />
  <path d="M 252 265 L 252 360" fill="none" stroke="#D1B894" stroke-width="16" stroke-linecap="round" />

  <!-- Meeting Point -->
  <rect x="210" y="340" width="85" height="30" rx="6" fill="#0F4C5C" />
  <text x="252" y="359" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">START HERE</text>

  <!-- Compass Rose -->
  <g transform="translate(580, 60)">
    <circle cx="0" cy="0" r="26" fill="#ffffff" stroke="#0F4C5C" stroke-width="2" />
    <polygon points="0,-22 5,-5 0,0 -5,-5" fill="#EF4444" />
    <polygon points="0,22 5,5 0,0 -5,5" fill="#64748B" />
    <polygon points="22,0 5,5 0,0 5,-5" fill="#64748B" />
    <polygon points="-22,0 -5,5 0,0 -5,-5" fill="#64748B" />
    <text x="0" y="-12" text-anchor="middle" font-size="9" font-weight="bold" fill="#B91C1C">N</text>
    <text x="0" y="20" text-anchor="middle" font-size="9" font-weight="bold" fill="#334155">S</text>
    <text x="17" y="3" text-anchor="middle" font-size="9" font-weight="bold" fill="#334155">E</text>
    <text x="-17" y="3" text-anchor="middle" font-size="9" font-weight="bold" fill="#334155">W</text>
  </g>

  <!-- Location Markers -->
  <!-- A: Southwark Cathedral (South West) -->
  <g transform="translate(130, 290)">
    <circle cx="0" cy="0" r="16" fill="#0F4C5C" />
    <text x="0" y="5" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">A</text>
  </g>

  <!-- B: Borough Market (South, further West) -->
  <g transform="translate(80, 340)">
    <circle cx="0" cy="0" r="16" fill="#0F4C5C" />
    <text x="0" y="5" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">B</text>
  </g>

  <!-- C: The Shard (South East) -->
  <g transform="translate(420, 310)">
    <circle cx="0" cy="0" r="16" fill="#0F4C5C" />
    <text x="0" y="5" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">C</text>
  </g>

  <!-- D: The Monument (North East) -->
  <g transform="translate(360, 60)">
    <circle cx="0" cy="0" r="16" fill="#0F4C5C" />
    <text x="0" y="5" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">D</text>
  </g>

  <!-- E: Old St. Magnus Church (North Bank, East of bridge) -->
  <g transform="translate(490, 110)">
    <circle cx="0" cy="0" r="16" fill="#0F4C5C" />
    <text x="0" y="5" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">E</text>
  </g>
</svg>`;

const LONDON_TRANSCRIPT = `Tour Guide: Good morning everyone, and a warm welcome to our London Bridge historical walking tour. Before we set off across the river, please take a look at the map of the Southwark and City riverside area in front of you.
We are currently gathering at the southern approach of London Bridge, marked "START HERE" on your plan. Now, a very common misconception visitors have is confusing London Bridge with the famous twin-towered Tower Bridge further downriver. London Bridge is a modern, clean-lined concrete structure completed in nineteen seventy-three, though bridges have stood on this exact site since Roman times.
Let me direct you to several key landmarks you will see today.
First, if you look directly to your left—that is, heading slightly west along the south embankment path—you will find Southwark Cathedral, marked as location A on your plan. It is one of London's oldest Gothic churches.
Continuing past the cathedral further to the south-west, just behind the railway arches, is the historic Borough Market at location B, famous for its artisanal foods and Victorian glass roof.
Now, if you turn around and gaze south-east, towering over the railway terminus, you cannot miss The Shard at location C—Western Europe's tallest skyscraper at over three hundred meters.
When we cross over London Bridge to the north bank of the Thames, we will reach the City of London. Once you step off the northern end of the bridge and head north-east along the pedestrian walkway, you will encounter the Great Fire of London Monument, designed by Sir Christopher Wren, indicated at location D.
Finally, nestled right on the riverbank to the east of the bridge stands St. Magnus the Martyr Church at location E, which once marked the medieval entrance to old London Bridge.`;

async function upgradeLondonBridge() {
  await connectDB();
  const targetId = new ObjectId('6af02edf9f0374780c07f530');

  await collections.listeningItems().updateOne(
    { _id: targetId },
    {
      $set: {
        title: 'London Bridge Walking Tour',
        section: 2,
        audioUrl: 'ai-speech://auto',
        hasMap: true,
        mapTitle: 'London Bridge & Riverside Historical Walking Map',
        mapSvgData: LONDON_MAP_SVG,
        transcript: LONDON_TRANSCRIPT,
        status: 'published',
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  const updatedItem = await collections.listeningItems().findOne({ _id: targetId });
  if (!updatedItem) {
    console.error('Could not find or create item');
    process.exit(1);
  }

  // Add Map labelling questions
  const questions = [
    {
      _id: new ObjectId(),
      listeningItemId: updatedItem._id,
      type: 'multiple_choice' as const,
      prompt: 'What common mistake do visitors often make regarding London Bridge?',
      options: [
        'A. They think it was built by the Romans.',
        'B. They confuse it with Tower Bridge.',
        'C. They believe it is the oldest bridge in the world.',
      ],
      correctAnswer: 'B. They confuse it with Tower Bridge.',
      explanationEn: 'The guide explains that visitors often confuse London Bridge with the twin-towered Tower Bridge downriver.',
      explanationBn: 'গাইড উল্লেখ করেন যে দর্শনার্থীরা প্রায়শই লন্ডন ব্রিজকে টাওয়ার ব্রিজের সাথে গুলিয়ে ফেলেন।',
      evidenceQuote: 'a very common misconception visitors have is confusing London Bridge with the famous twin-towered Tower Bridge',
      order: 1,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId(),
      listeningItemId: updatedItem._id,
      type: 'map_labelling' as const,
      prompt: 'Label the map. Choose the correct letter (A-E) for:\nSouthwark Cathedral',
      options: ['A', 'B', 'C', 'D', 'E'],
      correctAnswer: 'A',
      explanationEn: 'The guide states heading slightly west along the south embankment path brings you to Southwark Cathedral at location A.',
      explanationBn: 'গাইড বলেন দক্ষিণ তীর ধরে কিছুটা পশ্চিমে গেলেই লোকেশন A-তে সাউথওয়ার্ক ক্যাথেড্রাল দেখা যায়।',
      evidenceQuote: 'heading slightly west along the south embankment path—you will find Southwark Cathedral, marked as location A',
      order: 2,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId(),
      listeningItemId: updatedItem._id,
      type: 'map_labelling' as const,
      prompt: 'Label the map. Choose the correct letter (A-E) for:\nBorough Market',
      options: ['A', 'B', 'C', 'D', 'E'],
      correctAnswer: 'B',
      explanationEn: 'Continuing past the cathedral to the south-west is Borough Market at location B.',
      explanationBn: 'ক্যাথেড্রাল পেরিয়ে দক্ষিণ-পশ্চিমে গেলেই লোকেশন B-তে বরো মার্কেট অবস্থিত।',
      evidenceQuote: 'Continuing past the cathedral further to the south-west, just behind the railway arches, is the historic Borough Market at location B',
      order: 3,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId(),
      listeningItemId: updatedItem._id,
      type: 'map_labelling' as const,
      prompt: 'Label the map. Choose the correct letter (A-E) for:\nThe Shard',
      options: ['A', 'B', 'C', 'D', 'E'],
      correctAnswer: 'C',
      explanationEn: 'Looking south-east towers The Shard at location C.',
      explanationBn: 'দক্ষিণ-পূর্বে তাকালে লোকেশন C-তে দ্য শার্ড স্কাইস্ক্র্যাপার দেখা যায়।',
      evidenceQuote: 'turn around and gaze south-east, towering over the railway terminus, you cannot miss The Shard at location C',
      order: 4,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: new ObjectId(),
      listeningItemId: updatedItem._id,
      type: 'map_labelling' as const,
      prompt: 'Label the map. Choose the correct letter (A-E) for:\nThe Monument to the Great Fire',
      options: ['A', 'B', 'C', 'D', 'E'],
      correctAnswer: 'D',
      explanationEn: 'On the north bank heading north-east is the Monument at location D.',
      explanationBn: 'উত্তর তীরে নেমে উত্তর-পূর্বে গেলে লোকেশন D-তে মনুমেন্ট পাওয়া যাবে।',
      evidenceQuote: 'head north-east along the pedestrian walkway, you will encounter the Great Fire of London Monument... indicated at location D',
      order: 5,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Remove old questions and insert clean map questions
  await collections.questions().deleteMany({ listeningItemId: updatedItem._id });
  await collections.questions().insertMany(questions);

  console.log(`✅ Successfully upgraded London Bridge Walking Tour with authentic Map SVG and 5 questions!`);
  await client.close();
  process.exit(0);
}

upgradeLondonBridge().catch((e) => {
  console.error(e);
  process.exit(1);
});

