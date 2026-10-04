import mongoose from 'mongoose';

/**
 * Lightweight product analytics event (e.g. 'signup', 'search', 'experience_view').
 * Kept deliberately simple: type + optional user + free-form meta.
 *
 * NOTE: no TTL index is enabled. If event volume grows, add one, e.g.:
 *   analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
 * to auto-expire events after 90 days.
 */
const analyticsEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

analyticsEventSchema.index({ type: 1, createdAt: -1 });

export const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
