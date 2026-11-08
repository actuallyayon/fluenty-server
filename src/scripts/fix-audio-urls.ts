import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import { connectDB, collections, client } from '../db/index.js';

async function fixAudioUrls() {
  await connectDB();
  const allItems = await collections.listeningItems().find().toArray();
  console.log(`Found ${allItems.length} listening items:`);

  for (const item of allItems) {
    console.log(`- [${item.section}] "${item.title}": audioUrl = "${item.audioUrl}"`);

    // If it's NOT the library orientation, set audioUrl to 'ai-speech://auto'
    const isLibrary = item.title.toLowerCase().includes('library');
    if (!isLibrary) {
      await collections.listeningItems().updateOne(
        { _id: item._id },
        { $set: { audioUrl: 'ai-speech://auto' } }
      );
      console.log(`   ==> FIXED to "ai-speech://auto"`);
    } else {
      console.log(`   ==> Kept as library audio`);
    }
  }

  console.log('✅ All audio URLs cleaned up in MongoDB Atlas!');
  await client.close();
}

fixAudioUrls().catch((e) => {
  console.error(e);
  process.exit(1);
});

