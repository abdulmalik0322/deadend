import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';

/** GET /api/notifications — newest first, optional ?unread=true. */
export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { user: req.user.id };
  if (req.query.unread === 'true') filter.read = false;

  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user.id, read: false }),
  ]);

  res.json({ page, limit, total, pages: Math.ceil(total / limit), unread, items });
});

/** PATCH /api/notifications/:id/read */
export const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { $set: { read: true } },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'Notification not found');
  res.json(notification);
});

/** POST /api/notifications/read-all */
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } });
  res.json({ message: 'All notifications marked as read' });
});
