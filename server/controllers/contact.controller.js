import { ContactMessage } from '../models/ContactMessage.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';
import { stripHtml } from '../utils/sanitize.js';

const TOPICS = ['General question', 'Account support', 'Partnerships', 'Press', 'Safety concern'];

/**
 * POST /api/contact — submit a contact message (public).
 * The message is persisted so it can never be silently dropped.
 */
export const submitContactMessage = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const topic = String(req.body?.topic || '').trim();
  const message = String(req.body?.message || '').trim();

  if (!name || name.length > 120) throw new ApiError(400, 'Name is required (max 120 chars)');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'A valid email is required');
  if (!TOPICS.includes(topic)) throw new ApiError(400, 'Invalid topic');
  if (!message || message.length > 5000) throw new ApiError(400, 'Message is required (max 5000 chars)');

  await ContactMessage.create({
    name: stripHtml(name),
    email,
    topic,
    message: stripHtml(message),
  });

  res.status(201).json({ ok: true });
});

/**
 * GET /api/contact — list messages (admin).
 */
export const listContactMessages = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, { defaultLimit: 20, maxLimit: 50 });
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ContactMessage.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

/**
 * PATCH /api/contact/:id — update message status (admin).
 */
export const updateContactMessage = asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  if (!['new', 'read', 'replied'].includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }
  const doc = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).lean();
  if (!doc) throw new ApiError(404, 'Message not found');
  res.json({ ok: true, item: doc });
});
