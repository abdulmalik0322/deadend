import mongoose from 'mongoose';

/**
 * A decision a user is tracking: their situation, expectations, progress,
 * milestones and updates. Completing it snapshots a before/after Outcome.
 */
const decisionSchema = new mongoose.Schema(
  {
    decisionId: { type: String, required: true, unique: true }, // e.g. 'D-10482'
    title: { type: String, required: true, trim: true, maxlength: 160 },
    question: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['planning', 'active', 'completed', 'abandoned'],
      default: 'planning',
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    situation: {
      location: { type: String, default: '' },
      education: { type: String, default: '' },
      experience: { type: String, default: '' },
      budget: { type: String, default: '' },
      timeAvailable: { type: String, default: '' },
      skills: [{ type: String, trim: true }],
    },
    expectations: {
      duration: { type: String, default: '' },
      investment: { type: String, default: '' },
      expectedResult: { type: String, default: '' },
      goal: { type: String, default: '' },
    },
    actual: {
      duration: { type: String, default: '' },
      investment: { type: String, default: '' },
      result: { type: String, default: '' },
    },
    timeline: [
      {
        stage: { type: String, trim: true },
        date: { type: Date },
        note: { type: String, trim: true },
        done: { type: Boolean, default: false },
      },
    ],
    milestones: [
      {
        title: { type: String, required: true, trim: true },
        done: { type: Boolean, default: false },
        dueDate: { type: Date },
      },
    ],
    updates: [
      {
        date: { type: Date, default: Date.now },
        text: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
);

decisionSchema.index({ owner: 1 });
decisionSchema.index({ status: 1 });
decisionSchema.index({ decisionId: 1 });

export const Decision = mongoose.model('Decision', decisionSchema);
