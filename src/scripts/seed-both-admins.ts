import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import { connectDB, getDb, collections } from '../db/index.js';
import { auth } from '../auth.js';

async function seedBothAdmins() {
  await connectDB();
  const db = getDb();

  const accounts = [
    { email: 'admin@fluenty.app', password: 'AdminSecret123!', name: 'Admin (Fluenty App)' },
    { email: 'admin@fluenty.app', password: 'AdminStrongPassword123!', name: 'Admin (Fluenty App)' },
    { email: 'admin@fluenty.com', password: 'AdminStrongPassword123!', name: 'Super Admin' },
    { email: 'admin@fluenty.com', password: 'AdminSecret123!', name: 'Super Admin' },
  ];

  for (const acc of [
    { email: 'admin@fluenty.app', password: 'AdminSecret123!', name: 'Admin App' },
    { email: 'admin@fluenty.com', password: 'AdminStrongPassword123!', name: 'Super Admin' },
  ]) {
    console.log(`Setting up ${acc.email}...`);
    try {
      await auth.api.signUpEmail({
        body: {
          email: acc.email,
          password: acc.password,
          name: acc.name,
        },
      });
      console.log(`Created new account: ${acc.email}`);
    } catch (e: any) {
      console.log(`Account ${acc.email} already registered or signup note: ${e.message || e}`);
    }

    const user = await db.collection('user').findOne({ email: acc.email });
    if (user) {
      const uid = user.id || user._id.toString();
      await db.collection('user').updateOne(
        { email: acc.email },
        { $set: { role: 'admin', banned: false, updatedAt: new Date() } }
      );
      await collections.profiles().updateOne(
        { email: acc.email },
        {
          $set: {
            userId: uid,
            name: acc.name,
            email: acc.email,
            role: 'admin',
            plan: 'premium',
            banned: false,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
            xp: 100,
            dailyStreak: 1,
          },
        },
        { upsert: true }
      );
      console.log(`✅ ${acc.email} verified as ADMIN!`);
    }
  }

  process.exit(0);
}

seedBothAdmins().catch((err) => {
  console.error(err);
  process.exit(1);
});
