import { Report } from '../models/Report.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';

const REASONS = [
  'spam',
  'harassment',
  'false_information',
  'privacy_violation',
  'dangerous_content',
  'other',
];

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

  const report = await Report.create({
    targetType,
    targetId,
    reason,
    details,
    reportedBy: req.user.id,
  });
  res.status(201).json(report);
});

/** GET /api/reports — admin: triage queue, ?status= / ?targetType= filters. */
export const listReports = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.targetType) filter.targetType = req.query.targetType;

  const [items, total] = await Promise.all([
    Report.find(filter)
      .populate('reportedBy', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(filter),
  ]);

  res.json({ page, limit, total, pages: Math.ceil(total / limit), items });
});

/** PATCH /api/reports/:id — admin: { status: resolved | dismissed }. */
export const resolveReport = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['resolved', 'dismissed'].includes(status)) {
    throw new ApiError(400, 'status must be resolved or dismissed');
  }

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );
  if (!report) throw new ApiError(404, 'Report not found');
  res.json(report);
});
