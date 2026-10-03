import mongoose from 'mongoose';

/**
 * Comment on an experience. `parent` enables one level of replies
 * (null = top-level comment).
 */
const commentSchema = new mongoose.Schema(
  {
    experience: { type: mongoose.Schema.Types.ObjectId, ref: 'Experience', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    status: { type: String, enum: ['visible', 'hidden', 'flagged'], default: 'visible' },
  },
  { timestamps: true }
);

commentSchema.index({ experience: 1 });
commentSchema.index({ author: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
