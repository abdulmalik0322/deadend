import { Decision } from '../models/Decision.js';
import { Outcome } from '../models/Outcome.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';

const WRITE_FIELDS = ['title', 'question', 'status', 'progress', 'situation', 'expectations', 'actual', 'timeline'];

function pick(body) {
  const out = {};
  for (const key of WRITE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

function assertOwnerOrAdmin(ownerId, user) {
  if (user.role === 'admin') return;
  if (String(ownerId) !== user.id) throw new ApiError(403, 'Forbidden');
}

/** Human-friendly sequence, e.g. D-10482. The unique index guards collisions. */
async function nextDecisionId() {
  const count = await Decision.countDocuments();
  return `D-${10482 + count}`;
}

async function getOwnedDecision(id, user) {
  const decision = await Decision.findById(id);
  if (!decision) throw new ApiError(404, 'Decision not found');
  assertOwnerOrAdmin(decision.owner, user);
  return decision;
}

/** GET /api/decisions — owner-scoped, optional ?status filter. */
export const listDecisions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { owner: req.user.id };
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Decision.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Decision.countDocuments(filter),
  ]);
  res.json({ page, limit, total, pages: Math.ceil(total / limit), items });
});

/** GET /api/decisions/:id */
export const getDecision = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  res.json(decision);
});

/** POST /api/decisions */
export const createDecision = asyncHandler(async (req, res) => {
  const decision = await Decision.create({
    ...pick(req.body),
    decisionId: await nextDecisionId(),
    owner: req.user.id,
  });
  res.status(201).json(decision);
});

/** PATCH /api/decisions/:id */
export const updateDecision = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  Object.assign(decision, pick(req.body));
  await decision.save();
  res.json(decision);
});

/** DELETE /api/decisions/:id */
export const deleteDecision = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  await Promise.all([decision.deleteOne(), Outcome.deleteMany({ decision: decision._id })]);
  res.json({ message: 'Decision deleted' });
});

/** POST /api/decisions/:id/updates — append a dated progress note. */
export const addUpdate = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  decision.updates.push({ date: new Date(), text: req.body.text });
  await decision.save();
  res.status(201).json(decision.updates[decision.updates.length - 1]);
});

/** POST /api/decisions/:id/milestones */
export const addMilestone = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  decision.milestones.push({ title: req.body.title, dueDate: req.body.dueDate });
  await decision.save();
  res.status(201).json(decision.milestones[decision.milestones.length - 1]);
});

/** PATCH /api/decisions/:id/milestones/:milestoneId — toggle done; recompute progress. */
export const toggleMilestone = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  const milestone = decision.milestones.id(req.params.milestoneId);
  if (!milestone) throw new ApiError(404, 'Milestone not found');

  milestone.done = !milestone.done;
  const done = decision.milestones.filter((m) => m.done).length;
  decision.progress =
    decision.milestones.length > 0 ? Math.round((done / decision.milestones.length) * 100) : 0;
  await decision.save();
  res.json({ milestone, progress: decision.progress });
});

/**
 * POST /api/decisions/:id/complete — mark completed and snapshot
 * a before/after Outcome from expectations vs actual.
 */
export const completeDecision = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  if (req.body.actual) Object.assign(decision.actual, req.body.actual);
  decision.status = 'completed';
  decision.progress = 100;
  await decision.save();

  const outcome = await Outcome.create({
    decision: decision._id,
    owner: decision.owner,
    expected: {
      duration: decision.expectations?.duration || '',
      investment: decision.expectations?.investment || '',
      result: decision.expectations?.expectedResult || '',
    },
    actual: {
      duration: decision.actual?.duration || '',
      investment: decision.actual?.investment || '',
      result: decision.actual?.result || '',
    },
    recordedAt: new Date(),
  });

  await User.updateOne(
    { _id: decision.owner },
    { $inc: { 'stats.decisionsCompleted': 1, 'stats.contributions': 1 } }
  );

  res.json({ decision, outcome });
});

/** POST /api/decisions/:id/abandon */
export const abandonDecision = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  decision.status = 'abandoned';
  await decision.save();
  res.json(decision);
});
