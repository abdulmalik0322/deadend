/**
 * Seed script — idempotent demo-data bootstrap.
 *
 * Run with: npm run seed  (node seed/seed.js)
 * Or programmatically: import { seedDatabase } from './seed/seed.js'
 *
 * Content is ported faithfully from the frontend fixture at
 * src/data/seed.js (10 fictional users, 10 categories, 20 experiences,
 * decisions, comments, folders):
 * - 10 fictional users (u1..u10) with random unguessable passwords
 *   (32-char hex, bcrypt 12) — there are no known demo logins by design.
 * - the 18 experiences with status 'approved' (16 public + 2 anonymous),
 *   category slugs mapped to Category ObjectIds.
 * - the 10 decisions, owned by the seeded users (mixed statuses),
 * - threaded comments on the seeded experiences,
 * - 4 folders for the first seeded user.
 *
 * Idempotency: if any users already exist, the seed is skipped and
 * `{ ok: true, skipped: true, reason: 'users exist' }` is returned.
 * Otherwise `{ ok: true, seeded: { ...counts } }` is returned.
 */
import dotenv from 'dotenv';

dotenv.config();

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Experience } from '../models/Experience.js';
import { Comment } from '../models/Comment.js';
import { Decision } from '../models/Decision.js';
import { Folder } from '../models/Folder.js';
import * as frontendSeed from '../../src/data/seed.js';

export async function seedDatabase() {
  // Idempotent guard — never double-seed a database that has users.
  if ((await User.countDocuments()) > 0) {
    return { ok: true, skipped: true, reason: 'users exist' };
  }

  // --- 1. Categories (10) -------------------------------------------------
  const categories = await Category.insertMany(
    frontendSeed.categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description || '',
      icon: c.icon || '',
      popularSearches: c.popularSearches || [],
      trending: c.trending || [],
    }))
  );
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c._id]));

  // --- 2. Users: the 10 fictional users (u1..u10) --------------------------
  const fictional = frontendSeed.users.filter((u) => /^u\d+$/.test(u.id)).slice(0, 10);
  const createdUsers = [];
  const userBySeedId = {};
  for (const u of fictional) {
    // Random unguessable password: 32-char hex, bcrypt 12.
    const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);
    // eslint-disable-next-line no-await-in-loop
    const doc = await User.create({
      name: u.name,
      username: u.username,
      email: u.email,
      passwordHash,
      bio: u.bio || '',
      country: u.country || '',
      role: u.role || 'user',
      publicProfile: u.publicProfile !== false,
      stats: u.stats || {},
      createdAt: u.joinedAt ? new Date(u.joinedAt) : undefined,
    });
    createdUsers.push(doc);
    userBySeedId[u.id] = doc._id;
  }

  // --- 3. Experiences: the 18 approved ones (16 public + 2 anonymous) -------
  const approved = frontendSeed.experiences.filter((e) => e.status === 'approved');
  const createdExps = [];
  const expBySeedId = {};
  for (const e of approved) {
    if (!catBySlug[e.category] || !userBySeedId[e.authorId]) continue;
    // eslint-disable-next-line no-await-in-loop
    const doc = await Experience.create({
      title: e.title,
      slug: e.slug,
      category: catBySlug[e.category],
      country: e.country || '',
      goal: e.goal,
      description: e.description,
      duration: e.duration || '',
      investmentDisplay: e.investmentDisplay || '',
      outcome: e.outcome,
      mainObstacle: e.mainObstacle || '',
      tags: e.tags || [],
      privacy: e.privacy || 'public',
      status: 'approved',
      author: userBySeedId[e.authorId],
      startingPoint: e.startingPoint || {},
      timeline: e.timeline || [],
      investment: e.investment || {},
      obstacles: e.obstacles || [],
      whatWorked: e.whatWorked || [],
      lessons: e.lessons || [],
      doDifferently: e.doDifferently || [],
      stats: e.stats || {},
      createdAt: e.createdAt ? new Date(e.createdAt) : undefined,
    });
    createdExps.push(doc);
    expBySeedId[e.id] = doc._id;
  }

  // --- 4. Comments: threaded, only on seeded experiences -------------------
  const commentBySeedId = {};
  let commentCount = 0;
  for (const c of frontendSeed.comments) {
    const experience = expBySeedId[c.experienceId];
    const author = userBySeedId[c.authorId];
    if (!experience || !author) continue; // skip comments on unseeded experiences
    // eslint-disable-next-line no-await-in-loop
    const doc = await Comment.create({
      experience,
      author,
      body: c.body,
      likes: c.likes || 0,
      parent: null,
      createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
    });
    commentBySeedId[c.id] = doc._id;
    commentCount += 1;

    for (const r of c.replies || []) {
      const replyAuthor = userBySeedId[r.authorId];
      if (!replyAuthor) continue;
      // eslint-disable-next-line no-await-in-loop
      await Comment.create({
        experience,
        author: replyAuthor,
        body: r.body,
        likes: r.likes || 0,
        parent: doc._id,
        createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
      });
      commentCount += 1;
    }
  }

  // --- 5. Decisions (10): owners are the seeded users ----------------------
  const ownerIds = createdUsers.map((u) => u._id);
  let roundRobin = 0;
  const createdDecisions = [];
  for (const d of frontendSeed.decisions) {
    const owner = userBySeedId[d.authorId] || ownerIds[roundRobin++ % ownerIds.length];
    // eslint-disable-next-line no-await-in-loop
    const doc = await Decision.create({
      decisionId: d.id,
      title: d.title,
      question: d.question || d.title,
      status: d.status || 'planning',
      owner,
      progress: d.progress || 0,
      situation: d.situation || {},
      expectations: d.expectations || {},
      actual: d.actual || {},
      timeline: d.timeline || [],
      milestones: d.milestones || [],
      updates: d.updates || [],
      createdAt: d.createdAt ? new Date(d.createdAt) : undefined,
    });
    createdDecisions.push(doc);
  }

  // --- 6. Folders (a few) for the first seeded user ------------------------
  const createdFolders = [];
  for (const f of frontendSeed.folders || []) {
    // eslint-disable-next-line no-await-in-loop
    const doc = await Folder.create({ user: createdUsers[0]._id, name: f.name });
    createdFolders.push(doc);
  }

  const seeded = {
    users: createdUsers.length,
    categories: categories.length,
    experiences: createdExps.length,
    comments: commentCount,
    decisions: createdDecisions.length,
    folders: createdFolders.length,
  };
  console.log('Seeded demo data:', JSON.stringify(seeded));
  return { ok: true, seeded };
}

async function main() {
  try {
    await connectDB();
  } catch (err) {
    console.error(`Seed failed to connect: ${err.message}`);
    process.exit(1);
  }

  try {
    const result = await seedDatabase();
    console.log(JSON.stringify(result, null, 2));
    if (result.skipped) {
      console.log('Nothing to do: users already exist.');
    } else {
      console.log(
        'Note: seeded users have random unguessable passwords — use the password-reset flow or /api/setup/promote to manage access.'
      );
    }
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

// CLI entry: `node seed/seed.js` (also `npm run seed`).
if (process.argv[1] && process.argv[1].endsWith('seed/seed.js')) {
  main();
}
