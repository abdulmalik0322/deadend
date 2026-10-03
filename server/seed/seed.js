/**
 * Seed script — run with: npm run seed
 *
 * Connects to the database, clears all collections, then inserts a
 * representative subset: 8 categories, 2 users (demo + admin),
 * 6 sample experiences and 2 sample decisions.
 *
 * NOTE: the full 20-experience dataset lives in the frontend at
 * src/data/seed.js. This backend seed is a smaller representative
 * subset for local development and API testing.
 */
import dotenv from 'dotenv';

dotenv.config();

import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Experience } from '../models/Experience.js';
import { Decision } from '../models/Decision.js';
import { Outcome } from '../models/Outcome.js';
import { Comment } from '../models/Comment.js';
import { SavedExperience } from '../models/SavedExperience.js';
import { Folder } from '../models/Folder.js';
import { Notification } from '../models/Notification.js';
import { Report } from '../models/Report.js';
import { AnalyticsEvent } from '../models/AnalyticsEvent.js';

const CATEGORIES = [
  {
    slug: 'freelancing',
    name: 'Freelancing',
    description: 'Upwork, Fiverr and independent client work — what actually paid off.',
    icon: '💼',
    popularSearches: ['upwork first client', 'fiverr gig pricing', 'freelance taxes'],
    trending: ['AI-proof freelance skills', 'retainer clients'],
  },
  {
    slug: 'study-abroad',
    name: 'Study Abroad',
    description: 'IELTS, admissions, visas and life as an international student.',
    icon: '✈️',
    popularSearches: ['ielts band 7', 'student visa rejected', 'scholarship essay'],
    trending: ['fully funded scholarships', 'visa interview tips'],
  },
  {
    slug: 'startups',
    name: 'Startups & Business',
    description: 'Dropshipping, SaaS and small businesses — launches, failures, lessons.',
    icon: '🚀',
    popularSearches: ['dropshipping profitable', 'first 10 customers', 'startup costs'],
    trending: ['micro-saas', 'one-person business'],
  },
  {
    slug: 'career-switch',
    name: 'Career Switch',
    description: 'Moving into tech or a new field mid-career.',
    icon: '🔄',
    popularSearches: ['learn coding while working', 'career change at 30', 'bootcamp worth it'],
    trending: ['self-taught developers', 'portfolio projects'],
  },
  {
    slug: 'fitness',
    name: 'Fitness & Health',
    description: 'Training, weight loss and habit-building journeys.',
    icon: '💪',
    popularSearches: ['lose 20kg', 'home workout plan', 'marathon training'],
    trending: ['zone 2 training', 'protein on a budget'],
  },
  {
    slug: 'investing',
    name: 'Investing & Money',
    description: 'Stocks, crypto and saving — real returns and real losses.',
    icon: '📈',
    popularSearches: ['crypto losses', 'index funds beginner', 'emergency fund'],
    trending: ['bear market lessons'],
  },
  {
    slug: 'content-creation',
    name: 'Content Creation',
    description: 'YouTube, TikTok and newsletters — growth experiments and monetization.',
    icon: '🎥',
    popularSearches: ['first 1000 subscribers', 'faceless channel', 'tiktok monetization'],
    trending: ['short-form consistency'],
  },
  {
    slug: 'remote-work',
    name: 'Remote Work',
    description: 'Landing and surviving remote jobs across time zones.',
    icon: '🏠',
    popularSearches: ['remote job sites', 'async communication', 'remote salary pakistan'],
    trending: ['global hiring platforms'],
  },
];

async function main() {
  await connectDB();

  // Clear everything for a deterministic dev dataset.
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Experience.deleteMany({}),
    Decision.deleteMany({}),
    Outcome.deleteMany({}),
    Comment.deleteMany({}),
    SavedExperience.deleteMany({}),
    Folder.deleteMany({}),
    Notification.deleteMany({}),
    Report.deleteMany({}),
    AnalyticsEvent.deleteMany({}),
  ]);
  console.log('Cleared all collections.');

  const categories = await Category.insertMany(CATEGORIES);
  const catId = Object.fromEntries(categories.map((c) => [c.slug, c._id]));
  console.log(`Inserted ${categories.length} categories.`);

  // Demo credentials: demo1234 / admin1234 (development only).
  const [demo, admin] = await User.insertMany([
    {
      name: 'Demo User',
      username: 'demo',
      email: 'demo@deadend.app',
      passwordHash: await bcrypt.hash('demo1234', 12),
      bio: 'Trying things so you can see what happened.',
      country: 'Pakistan',
      stats: { experiences: 6, decisionsCompleted: 1, contributions: 6 },
    },
    {
      name: 'Admin',
      username: 'admin',
      email: 'admin@deadend.app',
      passwordHash: await bcrypt.hash('admin1234', 12),
      role: 'admin',
      country: 'Pakistan',
    },
  ]);
  console.log('Inserted demo user (demo@deadend.app / demo1234) and admin (admin@deadend.app / admin1234).');

  const experiences = await Experience.insertMany([
    {
      title: 'I Tried Freelancing on Upwork for 6 Months',
      slug: 'i-tried-freelancing-on-upwork-for-6-months',
      category: catId['freelancing'],
      country: 'Pakistan',
      goal: 'Earn $1,000/month freelancing on Upwork',
      description:
        'After finishing a frontend course I spent six months bidding on Upwork. The first two months were brutal — 80+ proposals, 3 replies. Things turned around when I niched down to landing-page fixes instead of generic "web developer" gigs.',
      duration: '6 months',
      investmentDisplay: '$0 upfront, ~15 hrs/week',
      outcome: 'unsuccessful',
      mainObstacle: 'Could not get past $400/month; client acquisition ate all my time',
      tags: ['upwork', 'freelancing', 'web-development'],
      privacy: 'public',
      status: 'approved',
      author: demo._id,
      startingPoint: {
        education: 'BS Computer Science (in progress)',
        experienceLevel: 'beginner',
        budget: '$0',
        timeAvailable: '15 hours/week',
        location: 'Pakistan',
        skills: ['HTML', 'CSS', 'JavaScript', 'React'],
      },
      timeline: [
        { label: 'Month 1-2', text: 'Sent 80+ proposals, landed 2 tiny $25 jobs.' },
        { label: 'Month 3-4', text: 'Niched into landing-page fixes; reply rate tripled.' },
        { label: 'Month 5-6', text: 'Plateaued at ~$400/month; paused to build portfolio.' },
      ],
      investment: { money: '$0', time: '15 hours/week', tools: ['Upwork connects', 'VS Code'] },
      obstacles: ['No reviews at start', 'Price competition from established sellers', 'Proposals took hours'],
      whatWorked: ['Niching into landing-page fixes', 'Loom video proposals'],
      lessons: ['A narrow offer beats a broad profile', 'First 5 reviews matter more than skills'],
      doDifferently: ['Start with Fiverr gigs to collect reviews faster', 'Charge per project, not per hour'],
      stats: { views: 1240, saves: 86, comments: 12 },
    },
    {
      title: 'From IELTS 5.5 to 7.5 in 4 Months',
      slug: 'from-ielts-5-5-to-7-5-in-4-months',
      category: catId['study-abroad'],
      country: 'Pakistan',
      goal: 'Score IELTS 7.5 for a study-abroad application',
      description:
        'My first mock was a 5.5 and I needed 7.5 for admission. Four months of structured prep — 2 hours daily, writing corrected by a tutor, and speaking practice with a partner — got me to 7.5 (L8 R7.5 W6.5 S7).',
      duration: '4 months',
      investmentDisplay: 'PKR 45,000 total',
      outcome: 'successful',
      mainObstacle: 'Writing stuck at 6.0 for two months',
      tags: ['ielts', 'study-abroad', 'english'],
      privacy: 'public',
      status: 'approved',
      author: demo._id,
      startingPoint: {
        education: 'FSc',
        experienceLevel: 'beginner',
        budget: 'PKR 50,000',
        timeAvailable: '2 hours/day',
        location: 'Pakistan',
        skills: ['English (intermediate)'],
      },
      timeline: [
        { label: 'Month 1', text: 'Diagnostic mock: 5.5. Built a daily routine.' },
        { label: 'Month 2-3', text: 'Writing plateau at 6.0; hired a tutor for corrections.' },
        { label: 'Month 4', text: 'Final mock 7.0, real test 7.5.' },
      ],
      investment: { money: 'PKR 45,000', time: '2 hours/day', tools: ['IELTS Liz', 'tutor', 'Anki'] },
      obstacles: ['Writing plateau', 'Speaking anxiety'],
      whatWorked: ['Daily writing with corrections', 'Recording myself speaking'],
      lessons: ['Feedback loops beat passive study', 'Task 2 structure is learnable'],
      doDifferently: ['Start writing practice in week one, not month two'],
      stats: { views: 2310, saves: 154, comments: 21 },
    },
    {
      title: 'My Dropshipping Store Lost Money in 90 Days',
      slug: 'my-dropshipping-store-lost-money-in-90-days',
      category: catId['startups'],
      country: 'Pakistan',
      goal: 'Build a profitable dropshipping store',
      description:
        'Watched the gurus, picked a "winning product" (LED strip lights), ran TikTok ads for 90 days. Revenue $620, ad spend $890, product costs $310. Net: -$580 and a hard lesson about unit economics.',
      duration: '90 days',
      investmentDisplay: '$1,200 total',
      outcome: 'unsuccessful',
      mainObstacle: 'Customer acquisition cost higher than product margin',
      tags: ['dropshipping', 'ecommerce', 'tiktok-ads'],
      privacy: 'public',
      status: 'approved',
      author: demo._id,
      startingPoint: {
        education: 'BS Computer Science (in progress)',
        experienceLevel: 'beginner',
        budget: '$1,200',
        timeAvailable: '10 hours/week',
        location: 'Pakistan',
        skills: ['basic marketing'],
      },
      timeline: [
        { label: 'Week 1-2', text: 'Store built on Shopify, product sourced.' },
        { label: 'Week 3-8', text: 'TikTok ads: 40k views, 31 orders, CAC $28.' },
        { label: 'Week 9-12', text: 'Killed losing ad sets; shut the store down.' },
      ],
      investment: { money: '$1,200', time: '10 hours/week', tools: ['Shopify', 'TikTok Ads'] },
      obstacles: ['High CAC', 'Long shipping times killed repeat buyers', 'Copycat competitors'],
      whatWorked: ['Organic TikTok videos outperformed paid ads'],
      lessons: ['Do the unit economics BEFORE spending', 'Shipping time is part of the product'],
      doDifferently: ['Test with organic content first', 'Pick products with 3x+ margin'],
      stats: { views: 1875, saves: 97, comments: 18 },
    },
    {
      title: 'Learning to Code While Working Full-Time',
      slug: 'learning-to-code-while-working-full-time',
      category: catId['career-switch'],
      country: 'Pakistan',
      goal: 'Become employable as a frontend developer in one year',
      description:
        'Worked a 9-5 retail job and studied 2 hours every night plus weekends. After 11 months I had 6 portfolio projects and landed a junior frontend internship. Not a FAANG story — a realistic one.',
      duration: '11 months',
      investmentDisplay: '$0, ~14 hrs/week',
      outcome: 'partially_successful',
      mainObstacle: 'Burnout in month 7; nearly quit',
      tags: ['coding', 'career-switch', 'self-taught'],
      privacy: 'public',
      status: 'approved',
      author: demo._id,
      startingPoint: {
        education: 'Intermediate',
        experienceLevel: 'beginner',
        budget: '$0',
        timeAvailable: '14 hours/week',
        location: 'Pakistan',
        skills: [],
      },
      timeline: [
        { label: 'Month 1-4', text: 'HTML/CSS/JS fundamentals, 2 small projects.' },
        { label: 'Month 5-7', text: 'React; burnout hit; took 2 weeks off.' },
        { label: 'Month 8-11', text: 'Built 4 portfolio projects; internship offer.' },
      ],
      investment: { money: '$0', time: '14 hours/week', tools: ['freeCodeCamp', 'YouTube', 'GitHub'] },
      obstacles: ['Burnout', 'Tutorial hell', 'No mentor'],
      whatWorked: ['Building projects from month 2', 'Public GitHub commits for accountability'],
      lessons: ['Consistency beats intensity', 'Rest is part of the plan'],
      doDifferently: ['Schedule rest weeks upfront', 'Join a community earlier'],
      stats: { views: 3120, saves: 203, comments: 34 },
    },
    {
      title: 'I Ran a Marathon After Never Running Before',
      slug: 'i-ran-a-marathon-after-never-running-before',
      category: catId['fitness'],
      country: 'Pakistan',
      goal: 'Finish a full marathon (42.2 km)',
      description:
        'Could barely run 2 km without stopping. Followed a 24-week beginner plan, ran 4x/week, finished the Lahore marathon in 4:47. Slow, but finished.',
      duration: '24 weeks',
      investmentDisplay: 'PKR 12,000 (shoes)',
      outcome: 'successful',
      mainObstacle: 'Knee pain in week 14',
      tags: ['marathon', 'running', 'fitness'],
      privacy: 'public',
      status: 'approved',
      author: demo._id,
      startingPoint: {
        education: 'BS Computer Science (in progress)',
        experienceLevel: 'beginner',
        budget: 'PKR 15,000',
        timeAvailable: '5 hours/week',
        location: 'Pakistan',
        skills: [],
      },
      timeline: [
        { label: 'Week 1-8', text: 'Base building: 2 km to 10 km.' },
        { label: 'Week 9-16', text: 'Long runs; knee pain; added strength work.' },
        { label: 'Week 17-24', text: 'Peak 32 km long run, taper, race day 4:47.' },
      ],
      investment: { money: 'PKR 12,000', time: '5 hours/week', tools: ['running shoes', 'Strava'] },
      obstacles: ['Knee pain', 'Winter smog training days', 'Time management'],
      whatWorked: ['Following a real plan instead of winging it', 'Strength training twice a week'],
      lessons: ['Slow progress is still progress', 'The plan works if you trust it'],
      doDifferently: ['Get fitted shoes from day one'],
      stats: { views: 980, saves: 64, comments: 9 },
    },
    {
      title: 'Investing in Crypto During the Bull Run',
      slug: 'investing-in-crypto-during-the-bull-run',
      category: catId['investing'],
      country: 'Pakistan',
      goal: 'Grow $500 in savings through crypto',
      description:
        'Put $500 into altcoins at the top of the 2024 hype cycle. Watched it go to $900, then to $180. Sold half, kept half. The lesson cost $320 and was worth every cent.',
      duration: '8 months',
      investmentDisplay: '$500',
      outcome: 'abandoned',
      mainObstacle: 'Bought hype at the peak; no exit plan',
      tags: ['crypto', 'investing', 'money'],
      privacy: 'public',
      status: 'approved',
      author: demo._id,
      startingPoint: {
        education: 'BS Computer Science (in progress)',
        experienceLevel: 'beginner',
        budget: '$500',
        timeAvailable: '3 hours/week',
        location: 'Pakistan',
        skills: [],
      },
      timeline: [
        { label: 'Month 1-2', text: '$500 in; portfolio hits $900.' },
        { label: 'Month 3-5', text: 'Crash; portfolio at $300. Froze.' },
        { label: 'Month 6-8', text: 'Sold half at $180; kept the rest as tuition.' },
      ],
      investment: { money: '$500', time: '3 hours/week', tools: ['Binance'] },
      obstacles: ['FOMO entries', 'No exit plan', 'Leverage temptation'],
      whatWorked: ['Position sizing kept the loss survivable'],
      lessons: ['Never invest money you cannot lose', 'Have an exit plan before entry'],
      doDifferently: ['DCA into BTC/ETH only', 'Take profits on the way up'],
      stats: { views: 1540, saves: 71, comments: 15 },
    },
  ]);
  console.log(`Inserted ${experiences.length} sample experiences.`);

  await Decision.insertMany([
    {
      decisionId: 'D-10482',
      title: 'Should I quit my job to freelance full-time?',
      question: 'Is my freelance income stable enough to leave my 9-5 job?',
      status: 'active',
      owner: demo._id,
      progress: 35,
      situation: {
        location: 'Pakistan',
        education: 'BS Computer Science (in progress)',
        experience: '1 year frontend',
        budget: '$800 savings',
        timeAvailable: '15 hours/week',
        skills: ['React', 'JavaScript', 'Tailwind CSS'],
      },
      expectations: {
        duration: '3 months runway',
        investment: '$0 additional',
        expectedResult: '$1,500/month freelance income',
        goal: 'Replace salary with freelance income',
      },
      actual: { duration: '', investment: '', result: '' },
      milestones: [
        { title: 'Reach $800/month freelance income', done: true },
        { title: 'Build 3-month emergency fund', done: false },
        { title: 'Land 2 retainer clients', done: false },
      ],
      updates: [
        { text: 'Hit $400/month. Still far from the $1,500 target — extending timeline.' },
      ],
    },
    {
      decisionId: 'D-10483',
      title: "Master's abroad or a local job?",
      question: 'Should I apply for a funded master\'s abroad or take the local software house offer?',
      status: 'planning',
      owner: demo._id,
      progress: 10,
      situation: {
        location: 'Pakistan',
        education: 'BS Computer Science (final year)',
        experience: 'internship + freelance',
        budget: 'PKR 200,000 family support',
        timeAvailable: '10 hours/week',
        skills: ['React', 'Node.js'],
      },
      expectations: {
        duration: '12 months application cycle',
        investment: 'PKR 150,000 (tests + applications)',
        expectedResult: 'Fully funded admission',
        goal: 'International degree without debt',
      },
      actual: { duration: '', investment: '', result: '' },
      milestones: [{ title: 'Shortlist 10 funded programs', done: false }],
      updates: [],
    },
  ]);
  console.log('Inserted 2 sample decisions.');

  console.log('\nSeed complete.');
  console.log('Demo login:  demo@deadend.app / demo1234');
  console.log('Admin login: admin@deadend.app / admin1234');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
