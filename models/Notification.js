import mongoose from 'mongoose';

/** In-app notification for a user (comments, approvals, reminders, ...). */
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['comment', 'reminder', 'approval', 'save', 'similar', 'milestone', 'system'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
