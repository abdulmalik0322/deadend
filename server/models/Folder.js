import mongoose from 'mongoose';

/** Named folder a user organizes saved experiences into. Names are unique per user. */
const folderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
  },
  { timestamps: true }
);

folderSchema.index({ user: 1, name: 1 }, { unique: true });

export const Folder = mongoose.model('Folder', folderSchema);
