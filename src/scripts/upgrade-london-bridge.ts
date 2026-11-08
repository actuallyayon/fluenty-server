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

const LONDON_TRANSCRIPT = `Guide: Good morning and welcome everyone to our London Bridge historical walking tour. Before we begin our walk across the River Thames, please look carefully at the map of the Southwark and City riverside area on your display.
We are currently gathered at the southern approach of London Bridge, marked START HERE at the bottom of the plan. A very common mistake visitors make is confusing London Bridge with the famous twin-towered Tower Bridge situated further downriver. London Bridge is a sleek concrete structure opened in 1973, though crossings have stood here since Roman times.
Now, let me orient you to the key landmarks around us.
First, looking directly to your left—heading west along the south embankment path—you will see Southwark Cathedral at location A. It is one of London's oldest Gothic churches.
If you continue past the cathedral slightly further south-west under the railway arches, you will arrive at Borough Market, marked at location B, renowned for gourmet food and fresh produce.
Now turning towards the south-east, dominating the skyline above the station, stands The Shard at location C—Western Europe's tallest skyscraper.
Next, as we cross London Bridge to the north bank of the Thames, we enter the City of London. Once off the bridge, heading north-east up the pedestrian walkway, you will find the Monument to the Great Fire of London at location D.
Finally, right along the north riverbank immediately east of the bridge stands St. Magnus the Martyr Church at location E, which once served as the medieval gateway to Old London Bridge.`;

async function upgradeAllLondonBridge() {
  await connectDB();
  const items = await collections.listeningItems().find({ title: /London Bridge/i }).toArray();
  console.log(`Found ${items.length} London Bridge items to upgrade`);

  for (const item of items) {
    console.log(`Upgrading item ${item._id.toString()} (${item.title})...`);
    await collections.listeningItems().updateOne(
      { _id: item._id },
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
      }
    );

    // Remove old questions and insert clean map labelling questions
    await collections.questions().deleteMany({ listeningItemId: item._id });

    const questions = [
      {
        _id: new ObjectId(),
        listeningItemId: item._id,
        type: 'map_labelling' as const,
        prompt: 'Label the map below. Choose the correct letter (A-E) for:\nSouthwark Cathedral',
        options: ['A', 'B', 'C', 'D', 'E'],
        correctAnswer: 'A',
        explanationEn: 'The guide points out that looking west along the south embankment path from the starting point leads directly to Southwark Cathedral at location A.',
        explanationBn: 'গাইড উল্লেখ করেছেন যে শুরুর স্থান থেকে দক্ষিণ নদীর পাড় ধরে পশ্চিমে তাকালে লোকেশন A-তে সাউথওয়ার্ক ক্যাথেড্রাল অবস্থিত।',
        evidenceQuote: 'looking directly to your left—heading west along the south embankment path—you will see Southwark Cathedral at location A',
        order: 1,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        listeningItemId: item._id,
        type: 'map_labelling' as const,
        prompt: 'Label the map below. Choose the correct letter (A-E) for:\nBorough Market',
        options: ['A', 'B', 'C', 'D', 'E'],
        correctAnswer: 'B',
        explanationEn: 'Continuing past the cathedral further south-west brings you to Borough Market at location B.',
        explanationBn: 'ক্যাথেড্রাল পার হয়ে আরও দক্ষিণ-পশ্চিমে গেলে লোকেশন B-তে ঐতিহাসিক বরো মার্কেট রয়েছে।',
        evidenceQuote: 'continue past the cathedral slightly further south-west under the railway arches, you will arrive at Borough Market, marked at location B',
        order: 2,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        listeningItemId: item._id,
        type: 'map_labelling' as const,
        prompt: 'Label the map below. Choose the correct letter (A-E) for:\nThe Shard',
        options: ['A', 'B', 'C', 'D', 'E'],
        correctAnswer: 'C',
        explanationEn: 'Gazing south-east above London Bridge station reveals The Shard at location C.',
        explanationBn: 'দক্ষিণ-পূর্বে তাকালে স্টেশনের উপরে ইউরোপের বিখ্যাত আকাশচুম্বী ভবন দ্য শার্ড (লোকেশন C) দেখা যায়।',
        evidenceQuote: 'turning towards the south-east, dominating the skyline above the station, stands The Shard at location C',
        order: 3,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        listeningItemId: item._id,
        type: 'map_labelling' as const,
        prompt: 'Label the map below. Choose the correct letter (A-E) for:\nThe Monument to the Great Fire',
        options: ['A', 'B', 'C', 'D', 'E'],
        correctAnswer: 'D',
        explanationEn: 'Across on the north bank, heading north-east leads to the Monument at location D.',
        explanationBn: 'ব্রিজ পার হয়ে উত্তর তীরে নেমে উত্তর-পূর্ব দিকে গেলে লোকেশন D-তে মনুমেন্ট পাওয়া যাবে।',
        evidenceQuote: 'heading north-east up the pedestrian walkway, you will find the Monument to the Great Fire of London at location D',
        order: 4,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        listeningItemId: item._id,
        type: 'map_labelling' as const,
        prompt: 'Label the map below. Choose the correct letter (A-E) for:\nSt. Magnus the Martyr Church',
        options: ['A', 'B', 'C', 'D', 'E'],
        correctAnswer: 'E',
        explanationEn: 'On the north riverbank immediately east of London Bridge stands St. Magnus Church at location E.',
        explanationBn: 'লন্ডন ব্রিজের ঠিক পূর্ব দিকে উত্তর নদীর পাড়ে লোকেশন E-তে সেন্ট ম্যাগনাস চার্চ অবস্থিত।',
        evidenceQuote: 'right along the north riverbank immediately east of the bridge stands St. Magnus the Martyr Church at location E',
        order: 5,
        status: 'published' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await collections.questions().insertMany(questions);
    console.log(`✅ Item ${item._id.toString()} successfully upgraded with Map SVG, Transcript, and 5 Map Labelling Questions!`);
  }

  await client.close();
  process.exit(0);
}

upgradeAllLondonBridge().catch((err) => {
  console.error('Upgrade error:', err);
  process.exit(1);
});
