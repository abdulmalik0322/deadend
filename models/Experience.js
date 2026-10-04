import mongoose from 'mongoose';

/**
 * A structured, before/after experience shared by a user:
 * what they tried, what it cost, what actually happened, what they learned.
 */
const timelineSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    text: { type: String, trim: true },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    country: { type: String, trim: true, default: '' },
    goal: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, required: true },
    duration: { type: String, trim: true, default: '' },
    investmentDisplay: { type: String, trim: true, default: '' },
    outcome: {
      type: String,
      enum: ['successful', 'partially_successful', 'unsuccessful', 'abandoned'],
      required: true,
    },
    mainObstacle: { type: String, trim: true, default: '' },
    tags: [{ type: String, trim: true, lowercase: true }],
    privacy: { type: String, enum: ['public', 'anonymous', 'private'], default: 'public' },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'pending',
    },
    aiStructured: { type: Boolean, default: false },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startingPoint: {
      education: { type: String, default: '' },
      experienceLevel: { type: String, default: '' },
      budget: { type: String, default: '' },
      timeAvailable: { type: String, default: '' },
      location: { type: String, default: '' },
      skills: [{ type: String, trim: true }],
    },
    timeline: [timelineSchema],
    investment: {
      money: { type: String, default: '' },
      time: { type: String, default: '' },
      tools: [{ type: String, trim: true }],
    },
    obstacles: [{ type: String, trim: true }],
    whatWorked: [{ type: String, trim: true }],
    lessons: [{ type: String, trim: true }],
    doDifferently: [{ type: String, trim: true }],
    stats: {
      views: { type: Number, default: 0 },
      saves: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
    },
    rejectionNote: { type: String, default: '' },
  },
  { timestamps: true }
);

experienceSchema.index({ slug: 1 });
experienceSchema.index({ category: 1 });
experienceSchema.index({ country: 1 });
experienceSchema.index({ outcome: 1 });
experienceSchema.index({ author: 1 });
experienceSchema.index({ createdAt: -1 });
experienceSchema.index({ tags: 1 });
experienceSchema.index({ status: 1 });
experienceSchema.index({ title: 'text', description: 'text', goal: 'text', tags: 'text' });

export const Experience = mongoose.model('Experience', experienceSchema);
