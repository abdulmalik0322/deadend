import mongoose from 'mongoose';

/**
 * Message submitted through the public Contact form.
 * Stored in MongoDB so submissions are never silently dropped;
 * admins triage them (new -> read -> replied).
 */
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    topic: {
      type: String,
      required: true,
      enum: ['General question', 'Account support', 'Partnerships', 'Press', 'Safety concern'],
    },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: ['new', 'read', 'replied'], default: 'new' },
  },
  { timestamps: true }
);

contactMessageSchema.index({ status: 1, createdAt: -1 });

export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
