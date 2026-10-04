import mongoose from 'mongoose';

/** Browseable topic area for experiences (e.g. freelancing, study-abroad). */
const categorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    popularSearches: [{ type: String, trim: true }],
    trending: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

categorySchema.index({ name: 'text', description: 'text' });

export const Category = mongoose.model('Category', categorySchema);
