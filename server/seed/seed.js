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
 * Resumable: every step upserts by unique key (category slug, user email,
 * experience slug, decision decisionId), so the seed can be re-run safely and
 * in chunks via `seedDatabase({ only })`. Bulk inserts keep each step fast
 * enough for serverless time limits. Seeded users get random passwords
 * (bcrypt 10) and cannot log in — use /api/setup/promote for admin access.
 * Returns `{ ok: true, seeded: { ...counts } }` with per-run inserted counts.
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

export async function seedDatabase({ only = null } = {}) {
  const ALL_STEPS = ['categories', 'users', 'experiences', 'comments', 'decisions', 'folders'];
  const steps = only
    ? String(only).split(',').map((s) => s.trim()).filter(Boolean)
    : ALL_STEPS;
  const want = (name) => steps.includes(name);
  const seeded = { categories: 0, users: 0, experiences: 0, comments: 0, decisions: 0, folders: 0 };

  const fictional = frontendSeed.users.filter((u) => /^u\d+$/.test(u.id)).slice(0, 10);

  // --- 1. Categories (upsert by slug) --------------------------------------
  if (want('categories')) {
    const have = new Set((await Category.find({}, 'slug').lean()).map((c) => c.slug));
    const missing = frontendSeed.categories.filter((c) => !have.has(c.slug));
    if (missing.length) {
      await Category.insertMany(
        missing.map((c) => ({
          slug: c.slug,
          name: c.name,
          description: c.description || '',
          icon: c.icon || '',
          popularSearches: c.popularSearches || [],
          trending: c.trending || [],
        }))
      );
    }
    seeded.categories = missing.length;
  }
  const catBySlug = Object.fromEntries(
    (await Category.find({}, 'slug').lean()).map((c) => [c.slug, c._id])
  );

  // --- 2. Users (skip existing emails; hashes computed in parallel) --------
  if (want('users')) {
    const emails = fictional.map((u) => u.email);
    const have = new Set((await User.find({ email: { $in: emails } }, 'email').lean()).map((u) => u.email));
    const missing = fictional.filter((u) => !have.has(u.email));
    if (missing.length) {
      const hashes = await Promise.all(
        missing.map(() => bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10))
      );
      await User.insertMany(
        missing.map((u, i) => ({
          name: u.name,
          username: u.username,
          email: u.email,
          passwordHash: hashes[i],
          bio: u.bio || '',
          country: u.country || '',
          role: u.role || 'user',
          publicProfile: u.publicProfile !== false,
          stats: u.stats || {},
          ...(u.joinedAt ? { createdAt: new Date(u.joinedAt) } : {}),
        }))
      );
    }
    seeded.users = missing.length;
  }
  const userBySeedId = Object.fromEntries(
    (await User.find({ email: { $in: fictional.map((u) => u.email) } }, 'email').lean()).map(
      (doc) => {
        const f = fictional.find((u) => u.email === doc.email);
        return [f.id, doc._id];
      }
    )
  );

  // --- 3. Experiences (skip existing slugs; bulk insert) --------------------
  if (want('experiences')) {
    const approved = frontendSeed.experiences.filter((e) => e.status === 'approved');
    const have = new Set(
      (await Experience.find({ slug: { $in: approved.map((e) => e.slug) } }, 'slug').lean()).map((e) => e.slug)
    );
    const docs = [];
    for (const e of approved) {
      if (have.has(e.slug) || !catBySlug[e.category] || !userBySeedId[e.authorId]) continue;
      docs.push({
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
        ...(e.createdAt ? { createdAt: new Date(e.createdAt) } : {}),
      });
    }
    if (docs.length) await Experience.insertMany(docs);
    seeded.experiences = docs.length;
  }
  const expBySeedId = Object.fromEntries(
    (await Experience.find({}, 'slug').lean()).map((doc) => {
      const f = frontendSeed.experiences.find((e) => e.slug === doc.slug);
      return f ? [f.id, doc._id] : [doc.slug, doc._id];
    })
  );

  // --- 4. Comments (skip when any exist; two bulk inserts for threads) ------
  if (want('comments') && (await Comment.countDocuments()) === 0) {
    const topLevel = [];
    const replies = [];
    for (const c of frontendSeed.comments) {
      const experience = expBySeedId[c.experienceId];
      const author = userBySeedId[c.authorId];
      if (!experience || !author) continue;
      topLevel.push({
        _seedId: c.id,
        experience,
        author,
        body: c.body,
        likes: c.likes || 0,
        parent: null,
        ...(c.createdAt ? { createdAt: new Date(c.createdAt) } : {}),
      });
      for (const r of c.replies || []) {
        const replyAuthor = userBySeedId[r.authorId];
        if (!replyAuthor) continue;
        replies.push({
          _seedParent: c.id,
          experience,
          author: replyAuthor,
          body: r.body,
          likes: r.likes || 0,
          ...(r.createdAt ? { createdAt: new Date(r.createdAt) } : {}),
        });
      }
    }
    let inserted = 0;
    if (topLevel.length) {
      const docs = await Comment.insertMany(topLevel.map(({ _seedId, ...rest }) => rest));
      inserted += docs.length;
      const idBySeed = {};
      topLevel.forEach((t, i) => { idBySeed[t._seedId] = docs[i]._id; });
      const replyDocs = replies
        .filter((r) => idBySeed[r._seedParent])
        .map(({ _seedParent, ...rest }) => ({ ...rest, parent: idBySeed[_seedParent] }));
      if (replyDocs.length) inserted += (await Comment.insertMany(replyDocs)).length;
    }
    seeded.comments = inserted;
  }

  // --- 5. Decisions (skip existing decisionIds; bulk insert) ----------------
  if (want('decisions')) {
    const have = new Set((await Decision.find({}, 'decisionId').lean()).map((d) => d.decisionId));
    const ownerIds = Object.values(userBySeedId);
    let roundRobin = 0;
    const docs = [];
    for (const d of frontendSeed.decisions) {
      if (!d.id || have.has(d.id)) continue;
      const owner = userBySeedId[d.authorId] || ownerIds[roundRobin++ % Math.max(ownerIds.length, 1)];
      if (!owner) continue;
      docs.push({
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
        ...(d.createdAt ? { createdAt: new Date(d.createdAt) } : {}),
      });
    }
    if (docs.length) await Decision.insertMany(docs);
    seeded.decisions = docs.length;
  }

  // --- 6. Folders (skip when the first user already has folders) ------------
  if (want('folders') && Object.values(userBySeedId).length > 0) {
    const firstUser = Object.values(userBySeedId)[0];
    if ((await Folder.countDocuments({ user: firstUser })) === 0 && (frontendSeed.folders || []).length) {
      await Folder.insertMany((frontendSeed.folders || []).map((f) => ({ user: firstUser, name: f.name })));
      seeded.folders = (frontendSeed.folders || []).length;
    }
  }

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
