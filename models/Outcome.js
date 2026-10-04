import mongoose from 'mongoose';

/**
 * Before-vs-after record created when a Decision is completed.
 * Snapshots what the user expected against what actually happened.
 */
const outcomeSchema = new mongoose.Schema(
  {
    decision: { type: mongoose.Schema.Types.ObjectId, ref: 'Decision', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expected: {
      duration: { type: String, default: '' },
      investment: { type: String, default: '' },
      result: { type: String, default: '' },
    },
    actual: {
      duration: { type: String, default: '' },
      investment: { type: String, default: '' },
      result: { type: String, default: '' },
    },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

outcomeSchema.index({ decision: 1 });
outcomeSchema.index({ owner: 1 });

export const Outcome = mongoose.model('Outcome', outcomeSchema);
