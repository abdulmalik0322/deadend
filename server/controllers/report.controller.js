import { Experience } from '../models/Experience.js';
import { Comment } from '../models/Comment.js';
import { Report } from '../models/Report.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';
import { stripHtml } from '../utils/sanitize.js';

const REASONS = [
  'spam',
  'harassment',
  'false_information',
  'privacy_violation',
  'dangerous_content',
  'other',
];

const iso = (d) => (d ? new Date(d).toISOString() : null);

/** Best-effort check that the reported target exists (skipped for users). */
async function assertTargetExists(targetType, targetId) {
  let exists = true;
  try {
    if (targetType === 'experience') {
      exists = await Experience.exists({ _id: targetId });
    } else if (targetType === 'comment') {
      exists = await Comment.exists({ _id: targetId });
    }
  } catch {
    return; // best effort — never fail the report on a lookup hiccup
  }
  if (!exists) {
    throw new ApiError(404, `Reported ${targetType} not found`);
  }
}

function presentReport(report) {
  const r = typeof report.toObject === 'function' ? report.toObject() : report;
  return {
    id: String(r._id),
    targetType: r.targetType,
    targetId: String(r.targetId),
    reason: r.reason,
    details: r.details ?? '',
    status: r.status,
    reportedBy: r.reportedBy
      ? {
          id: String(r.reportedBy._id ?? r.reportedBy),
          name: r.reportedBy.name || '',
          username: r.reportedBy.username || '',
        }
      : null,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

/** POST /api/reports — file a moderation report. */
export const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, details = '' } = req.body;

  if (!['experience', 'comment', 'user'].includes(targetType)) {
    throw new ApiError(400, 'targetType must be experience, comment or user');
  }
  if (!targetId) throw new ApiError(400, 'targetId is required');
  if (!REASONS.includes(reason)) {
    throw new ApiError(400, `reason must be one of: ${REASONS.join(', ')}`);
  }

  await assertTargetExists(targetType, targetId);

  const report = await Report.create({
    targetType,
    targetId,
    reason,
    details: stripHtml(String(details)),
    reportedBy: req.user.id,
  });
  res.status(201).json({ ok: true, id: String(report._id) });
});

/** GET /api/reports — admin: triage queue, ?status= filter, newest first. */
export const listReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Report.find(filter)
      .populate('reportedBy', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(filter),
  ]);

  res.json({
    items: items.map(presentReport),
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
  });
});

/**
 * PATCH /api/reports/:id — admin: { action: resolved | dismissed, note? }.
 * Exported for reuse by the admin aliases under /api/admin.
 */
export const resolveReport = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!['resolved', 'dismissed'].includes(action)) {
    throw new ApiError(400, 'action must be resolved or dismissed');
  }

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status: action },
    { new: true, runValidators: true }
  );
  if (!report) throw new ApiError(404, 'Report not found');
  res.json({ ok: true });
});
