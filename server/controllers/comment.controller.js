import { Comment } from '../models/Comment.js';
import { Experience } from '../models/Experience.js';
import { Notification } from '../models/Notification.js';
import { Report } from '../models/Report.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function assertOwnerOrAdmin(ownerId, user) {
  if (user.role === 'admin') return;
  if (String(ownerId) !== user.id) throw new ApiError(403, 'Forbidden');
}

/**
 * GET /api/comments?experienceId=... — visible comments as a reply tree.
 */
export const listComments = asyncHandler(async (req, res) => {
  const { experienceId } = req.query;
  if (!experienceId) throw new ApiError(400, 'experienceId query param is required');

  const comments = await Comment.find({ experience: experienceId, status: 'visible' })
    .populate('author', 'name username')
    .sort({ createdAt: 1 })
    .lean();

  const byId = new Map(comments.map((c) => [String(c._id), { ...c, replies: [] }]));
  const roots = [];
  for (const c of byId.values()) {
    if (c.parent && byId.has(String(c.parent))) {
      byId.get(String(c.parent)).replies.push(c);
    } else {
      roots.push(c);
    }
  }
  res.json(roots);
});

/** POST /api/comments — notify the experience author (unless it's their own comment). */
export const createComment = asyncHandler(async (req, res) => {
  const { experienceId, body } = req.body;

  const exp = await Experience.findById(experienceId).select('author title slug');
  if (!exp) throw new ApiError(404, 'Experience not found');

  const comment = await Comment.create({
    experience: experienceId,
    author: req.user.id,
    body,
  });
  await comment.populate('author', 'name username');

  await Experience.updateOne({ _id: experienceId }, { $inc: { 'stats.comments': 1 } });

  if (String(exp.author) !== req.user.id) {
    await Notification.create({
      user: exp.author,
      type: 'comment',
      title: 'New comment on your experience',
      body: body.slice(0, 140),
      link: `/experiences/${exp.slug}`,
    });
  }

  res.status(201).json(comment);
});

/** POST /api/comments/:id/replies */
export const replyToComment = asyncHandler(async (req, res) => {
  const parent = await Comment.findById(req.params.id);
  if (!parent) throw new ApiError(404, 'Comment not found');

  const reply = await Comment.create({
    experience: parent.experience,
    author: req.user.id,
    body: req.body.body,
    parent: parent._id,
  });
  await reply.populate('author', 'name username');

  await Experience.updateOne({ _id: parent.experience }, { $inc: { 'stats.comments': 1 } });
  res.status(201).json(reply);
});

/** POST /api/comments/:id/like — toggle like for the current user. */
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

  res.json({ likes: comment.likes, liked: !liked });
});

/** DELETE /api/comments/:id — owner or admin. */
export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');
  assertOwnerOrAdmin(comment.author, req.user);

  await Promise.all([
    Comment.deleteMany({ parent: comment._id }),
    comment.deleteOne(),
  ]);
  await Experience.updateOne({ _id: comment.experience }, { $inc: { 'stats.comments': -1 } });
  res.json({ message: 'Comment deleted' });
});

/** POST /api/comments/:id/report */
export const reportComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');

  const { reason, details = '' } = req.body;
  if (!reason) throw new ApiError(400, 'reason is required');

  const report = await Report.create({
    targetType: 'comment',
    targetId: comment._id,
    reason,
    details,
    reportedBy: req.user.id,
  });
  res.status(201).json(report);
});
