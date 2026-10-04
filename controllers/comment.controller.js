import { Comment } from '../models/Comment.js';
import { Experience } from '../models/Experience.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { presentComment } from '../utils/present.js';
import { notify } from '../utils/notify.js';
import { stripHtml } from '../utils/sanitize.js';

function assertOwnerOrAdmin(ownerId, user) {
  if (user.role === 'admin') return;
  if (String(ownerId) !== user.id) throw new ApiError(403, 'Forbidden');
}

/** POST /api/comments/:id/reply — parent must be top-level (400 if nested). → 201 reply. */
export const replyToComment = asyncHandler(async (req, res) => {
  const parent = await Comment.findById(req.params.id).populate('experience', 'slug author');
  if (!parent) throw new ApiError(404, 'Comment not found');
  if (parent.parent) throw new ApiError(400, 'Can only reply to top-level comments');

  const body = stripHtml(req.body.body);
  if (!body) throw new ApiError(400, 'Reply body is required');

  const experienceId = parent.experience?._id || parent.experience;
  const reply = await Comment.create({
    experience: experienceId,
    author: req.user.id,
    body,
    parent: parent._id,
  });
  await reply.populate('author', 'name username');

  await Experience.updateOne({ _id: experienceId }, { $inc: { 'stats.comments': 1 } });

  if (String(parent.author) !== req.user.id) {
    notify(String(parent.author), {
      type: 'comment',
      title: 'New reply to your comment',
      body: body.slice(0, 140),
      link: parent.experience?.slug ? `/experiences/${parent.experience.slug}` : '',
    });
  }

  res.status(201).json(presentComment(reply, req.user.id));
});

/** POST /api/comments/:id/like — toggle the current user's like. */
export const toggleLike = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');

  const userId = req.user.id;
  const liked = comment.likedBy.some((id) => String(id) === userId);
  if (liked) {
    comment.likedBy.pull(userId);
    comment.likes = Math.max(0, comment.likes - 1);
  } else {
    comment.likedBy.push(userId);
    comment.likes += 1;
  }
  await comment.save();

  res.json({ ok: true, liked: !liked, likes: comment.likes });
});

/** DELETE /api/comments/:id — owner or admin; deletes replies too. */
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');
  assertOwnerOrAdmin(comment.author, req.user);

  const replyCount = await Comment.countDocuments({ parent: comment._id });
  await Promise.all([Comment.deleteMany({ parent: comment._id }), comment.deleteOne()]);
  await Experience.updateOne(
    { _id: comment.experience },
    { $inc: { 'stats.comments': -(1 + replyCount) } }
  );
  res.json({ ok: true });
});
