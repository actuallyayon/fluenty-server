import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import { connectDB, collections, client } from '../db/index.js';

async function updateAudioUrl() {
  await connectDB();
  const res = await collections.listeningItems().updateMany(
    {},
    { $set: { audioUrl: '/audio/library_orientation.wav', updatedAt: new Date() } }
  );
  console.log(`✅ Updated ${res.modifiedCount} listening items with local audio URL.`);
  await client.close();
}

updateAudioUrl().catch((err) => {
  console.error(err);
  process.exit(1);
});
