import mongoose from 'mongoose';

/**
 * A user's bookmark of an experience, optionally filed into a Folder.
 * One row per (user, experience) — duplicates are rejected by the compound index.
 */
const savedExperienceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    experience: { type: mongoose.Schema.Types.ObjectId, ref: 'Experience', required: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  },
  { timestamps: true }
);

savedExperienceSchema.index({ user: 1, experience: 1 }, { unique: true });

export const SavedExperience = mongoose.model('SavedExperience', savedExperienceSchema);
