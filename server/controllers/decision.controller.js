import { Decision } from '../models/Decision.js';
import { Outcome } from '../models/Outcome.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';
import { presentDecision } from '../utils/present.js';
import { notify } from '../utils/notify.js';
import { stripHtml } from '../utils/sanitize.js';

const WRITE_FIELDS = [
  'title',
  'question',
  'status',
  'progress',
  'visibility',
  'situation',
  'expectations',
  'actual',
  'timeline',
];

function pick(body) {
  const out = {};
  for (const key of WRITE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

/** Recursively strip HTML tags from every string in a value. */
function sanitizeDeep(value) {
  if (typeof value === 'string') return stripHtml(value);
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeDeep(v);
    return out;
  }
  return value;
}

/** Owner or admin; non-owner (and non-admin) requests see a 404. */
async function getOwnedDecision(id, user) {
  const decision = await Decision.findById(id);
  if (!decision) throw new ApiError(404, 'Decision not found');
  if (user.role !== 'admin' && String(decision.owner) !== user.id) {
    throw new ApiError(404, 'Decision not found');
  }
  return decision;
}

/** Human-friendly sequence, e.g. D-10482. The unique index guards collisions. */
async function nextDecisionId() {
  const count = await Decision.countDocuments();
  return `D-${10482 + count}`;
}

/**
 * Best-effort milestone-due reminders: for each decision on this page, for each
 * undone milestone due within the next 3 days, notify the owner unless an
 * unread 'milestone' notification for this decision was created in the last 7 days.
 * Never fails the request.
 */
async function checkMilestoneReminders(decisions, userId) {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const decision of decisions) {
      for (const milestone of decision.milestones || []) {
        if (milestone.done || !milestone.dueDate) continue;
        const due = new Date(milestone.dueDate);
        if (due > windowEnd) continue;

        const link = `/decisions/${decision._id}`;
        const recent = await Notification.findOne({
          user: userId,
          type: 'milestone',
          link,
          read: false,
          createdAt: { $gte: weekAgo },
        }).lean();
        if (recent) continue;

        await notify(userId, {
          type: 'milestone',
          title: 'Milestone due soon',
          body: `"${milestone.title}" is due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          link,
        });
      }
    }
  } catch {
    // best effort — never fail the request
  }
}

/** GET /api/decisions — owner-scoped, optional ?status filter, updatedAt desc. */
export const listDecisions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { owner: req.user.id };
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Decision.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Decision.countDocuments(filter),
  ]);

  await checkMilestoneReminders(items, req.user.id);

  res.json({
    items: items.map(presentDecision),
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
  });
});

/** POST /api/decisions — question defaults to title; status 'planning'. */
export const createDecision = asyncHandler(async (req, res) => {
  const { title, question, situation, expectations, visibility } = req.body;

  const decision = await Decision.create({
    title: stripHtml(String(title)).trim(),
    question: stripHtml(String(question || title)).trim(),
    situation: situation ? sanitizeDeep(situation) : undefined,
    expectations: expectations ? sanitizeDeep(expectations) : undefined,
    visibility: visibility || 'private',
    decisionId: await nextDecisionId(),
    owner: req.user.id,
    status: 'planning',
  });
  res.status(201).json(presentDecision(decision));
});

/** GET /api/decisions/:id — owner or admin, else 404. */
export const getDecision = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  res.json(presentDecision(decision));
});

const STATUS_TRANSITIONS = {
  planning: ['active', 'abandoned'],
  active: ['completed', 'abandoned'],
};

/** PATCH /api/decisions/:id — whitelisted fields; status transitions validated. */
export const updateDecision = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  const patch = sanitizeDeep(pick(req.body));

  if (patch.status !== undefined && patch.status !== decision.status) {
    const from = decision.status;
    const to = patch.status;
    const allowed = STATUS_TRANSITIONS[from] || [];
    if (from === 'completed' || from === 'abandoned' || !allowed.includes(to)) {
      throw new ApiError(400, `Cannot change status from "${from}" to "${to}"`);
    }
  }

  Object.assign(decision, patch);
  await decision.save();
  res.json(presentDecision(decision));
});

/** DELETE /api/decisions/:id — cascades Outcomes. */
export const deleteDecision = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  await Promise.all([
    decision.deleteOne(),
    Outcome.deleteMany({ decision: decision._id }),
  ]);
  res.json({ ok: true });
});

/** POST /api/decisions/:id/updates — append a dated progress note. */
export const addUpdate = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  const { text, stage } = req.body;

  decision.updates.push({
    date: new Date(),
    text: stripHtml(String(text)).trim(),
    stage: stage ? stripHtml(String(stage)).trim() : '',
  });
  await decision.save();

  const update = decision.updates[decision.updates.length - 1];
  res.status(201).json({
    id: String(update._id),
    date: update.date ? update.date.toISOString() : null,
    text: update.text || '',
    stage: update.stage || '',
  });
});

/** POST /api/decisions/:id/milestones. */
export const addMilestone = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  const { title, dueDate } = req.body;

  decision.milestones.push({
    title: stripHtml(String(title)).trim(),
    dueDate: dueDate || undefined,
  });
  await decision.save();

  const milestone = decision.milestones[decision.milestones.length - 1];
  res.status(201).json({
    id: String(milestone._id),
    title: milestone.title,
    done: false,
    dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
  });
});

/** PATCH /api/decisions/:id/milestones/:mid — set or toggle done; recompute progress. */
export const toggleMilestone = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  const milestone = decision.milestones.id(req.params.mid);
  if (!milestone) throw new ApiError(404, 'Milestone not found');

  if (typeof req.body.done === 'boolean') {
    milestone.done = req.body.done;
  } else {
    milestone.done = !milestone.done;
  }

  const total = decision.milestones.length;
  const doneCount = decision.milestones.filter((m) => m.done).length;
  decision.progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  await decision.save();

  res.json({
    milestone: {
      id: String(milestone._id),
      title: milestone.title,
      done: milestone.done,
      dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
    },
    progress: decision.progress,
  });
});

/**
 * POST /api/decisions/:id/complete — mark completed and snapshot a
 * before/after Outcome from expectations vs actual.
 * Accepts { actualInvestment?, actualDuration?, actualResult?, outcome? }
 * and legacy { duration?, investment?, result? }.
 */
export const completeDecision = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  const body = req.body || {};
  const wasCompleted = decision.status === 'completed';

  const actual = {
    duration:
      body.actualDuration ?? body.duration ?? decision.actual?.duration ?? '',
    investment:
      body.actualInvestment ?? body.investment ?? decision.actual?.investment ?? '',
    result:
      body.actualResult ?? body.result ?? body.outcome ?? decision.actual?.result ?? '',
  };
  decision.actual = {
    duration: stripHtml(String(actual.duration)),
    investment: stripHtml(String(actual.investment)),
    result: stripHtml(String(actual.result)),
  };
  decision.status = 'completed';
  decision.progress = 100;
  await decision.save();

  if (!wasCompleted) {
    await Outcome.create({
      decision: decision._id,
      owner: decision.owner,
      expected: {
        duration: decision.expectations?.duration || '',
        investment: decision.expectations?.investment || '',
        result: decision.expectations?.expectedResult || '',
      },
      actual: {
        duration: decision.actual.duration,
        investment: decision.actual.investment,
        result: decision.actual.result,
      },
      recordedAt: new Date(),
    });

    await User.updateOne(
      { _id: decision.owner },
      { $inc: { 'stats.decisionsCompleted': 1 } }
    );
  }

  res.status(200).json(presentDecision(decision));
});

/** POST /api/decisions/:id/abandon — completed decisions cannot be abandoned. */
export const abandonDecision = asyncHandler(async (req, res) => {
  const decision = await getOwnedDecision(req.params.id, req.user);
  if (decision.status === 'completed') {
    throw new ApiError(400, 'Completed decisions cannot be abandoned');
  }
  decision.status = 'abandoned';
  await decision.save();
  res.status(200).json(presentDecision(decision));
});
