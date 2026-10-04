import mongoose from 'mongoose';

/**
 * Moderation report against an experience, comment or user.
 * Admins triage these via the admin routes (open -> resolved/dismissed).
 */
const reportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ['experience', 'comment', 'user'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: {
      type: String,
      enum: [
        'spam',
        'harassment',
        'false_information',
        'privacy_violation',
        'dangerous_content',
        'other',
      ],
      required: true,
    },
    details: { type: String, default: '', maxlength: 1000 },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1 });
reportSchema.index({ targetType: 1 });

export const Report = mongoose.model('Report', reportSchema);
