/**
 * Minimal presenters (Worker 2 stand-in).
 * Map Mongo documents to the contract's public JSON shapes:
 * IDs are strings named `id`, timestamps are ISO-8601 strings.
 */

const idOf = (doc) => String(doc._id ?? doc.id);
const iso = (d) => (d ? new Date(d).toISOString() : null);

function asObject(doc) {
  return typeof doc?.toObject === 'function' ? doc.toObject() : doc;
}

/** Decision -> contract shape. */
export function presentDecision(decision) {
  const d = asObject(decision);
  return {
    id: idOf(d),
    decisionId: d.decisionId,
    title: d.title ?? '',
    question: d.question ?? '',
    status: d.status,
    visibility: d.visibility || 'private',
    progress: d.progress ?? 0,
    situation: {
      location: '',
      education: '',
      experience: '',
      budget: '',
      timeAvailable: '',
      skills: [],
      ...(d.situation || {}),
    },
    expectations: {
      duration: '',
      investment: '',
      expectedResult: '',
      goal: '',
      ...(d.expectations || {}),
    },
    actual: {
      duration: '',
      investment: '',
      result: '',
      ...(d.actual || {}),
    },
    timeline: (d.timeline || []).map((t) => ({
      stage: t.stage ?? '',
      date: iso(t.date),
      note: t.note ?? '',
      done: !!t.done,
    })),
    milestones: (d.milestones || []).map((m) => ({
      id: idOf(m),
      title: m.title ?? '',
      done: !!m.done,
      dueDate: iso(m.dueDate),
    })),
    updates: (d.updates || []).map((u) => ({
      id: idOf(u),
      date: iso(u.date),
      text: u.text ?? '',
      stage: u.stage ?? '',
    })),
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  };
}

/** Notification -> contract shape. */
export function presentNotification(notification) {
  const n = asObject(notification);
  return {
    id: idOf(n),
    type: n.type,
    title: n.title ?? '',
    body: n.body ?? '',
    link: n.link ?? '',
    read: !!n.read,
    createdAt: iso(n.createdAt),
  };
}

/** Folder -> contract shape, with a saved-item count. */
export function presentFolder(folder, count = 0) {
  const f = asObject(folder);
  return { id: idOf(f), name: f.name ?? '', count };
}

/**
 * Comment -> contract shape (recursive for nested replies).
 * `viewerId` drives `likedByMe`; author should be populated (name).
 */
export function presentComment(comment, viewerId) {
  const c = asObject(comment);
  if (!c) return null;
  const likedBy = c.likedBy || [];
  const author = c.author;
  const experience = c.experience;
  return {
    id: idOf(c),
    experienceId:
      experience && typeof experience === 'object' && experience._id
        ? String(experience._id)
        : experience
          ? String(experience)
          : '',
    authorId:
      author && typeof author === 'object' && author._id
        ? String(author._id)
        : author
          ? String(author)
          : '',
    authorName: author && typeof author === 'object' ? author.name || '' : '',
    body: c.body ?? '',
    likes: c.likes ?? 0,
    likedByMe: viewerId ? likedBy.some((id) => String(id) === String(viewerId)) : false,
    parentId: c.parent ? String(c.parent) : null,
    replies: (c.replies || []).map((r) => presentComment(r, viewerId)),
    createdAt: iso(c.createdAt),
  };
}

/** Experience -> contract shape (viewer-aware anonymous masking). */
export function presentExperience(experience, viewer) {
  const e = asObject(experience);
  if (!e) return null;

  const cat = e.category;
  const categorySlug =
    cat && typeof cat === 'object' && cat.slug
      ? cat.slug
      : typeof cat === 'string'
        ? cat
        : cat
          ? String(cat)
          : '';
  const categoryLabel =
    cat && typeof cat === 'object' && cat.name ? cat.name : '';

  // Anonymous experiences hide the author from everyone except the
  // owner and admins. When no viewer is supplied we mask by default
  // (safe for public endpoints like search).
  const viewerId = viewer?.id ? String(viewer.id) : null;
  const authorId =
    e.author && typeof e.author === 'object' && e.author._id
      ? String(e.author._id)
      : e.author
        ? String(e.author)
        : null;
  const isOwner = Boolean(viewerId && authorId && viewerId === authorId);
  const isAdmin = viewer?.role === 'admin';

  let author = { id: '', name: '', username: '', country: '' };
  if (e.privacy === 'anonymous' && !isOwner && !isAdmin) {
    author = { anonymous: true, name: 'Anonymous' };
  } else if (e.author && typeof e.author === 'object' && e.author._id) {
    author = {
      id: String(e.author._id),
      name: e.author.name || '',
      username: e.author.username || '',
      country: e.author.country || '',
    };
  } else if (authorId) {
    author = { id: authorId, name: '', username: '', country: '' };
  }

  return {
    id: idOf(e),
    slug: e.slug ?? '',
    title: e.title ?? '',
    category: categorySlug,
    categoryLabel,
    country: e.country ?? '',
    goal: e.goal ?? '',
    description: e.description ?? '',
    duration: e.duration ?? '',
    investmentDisplay: e.investmentDisplay ?? '',
    outcome: e.outcome,
    mainObstacle: e.mainObstacle ?? '',
    tags: e.tags || [],
    privacy: e.privacy,
    status: e.status,
    rejectionNote: e.rejectionNote ?? '',
    author,
    startingPoint: e.startingPoint || {
      education: '',
      experienceLevel: '',
      budget: '',
      timeAvailable: '',
      location: '',
      skills: [],
    },
    timeline: e.timeline || [],
    investment: e.investment || { money: '', time: '', tools: [] },
    obstacles: e.obstacles || [],
    whatWorked: e.whatWorked || [],
    lessons: e.lessons || [],
    doDifferently: e.doDifferently || [],
    stats: e.stats || { views: 0, saves: 0, comments: 0 },
    saved: !!e.saved,
    createdAt: iso(e.createdAt),
    updatedAt: iso(e.updatedAt),
  };
}

/** User -> contract shape — never includes passwordHash. */
export function presentUser(user) {
  const u = asObject(user);
  if (!u) return null;
  const s = u.stats || {};
  return {
    id: u._id ? String(u._id) : String(u.id || ''),
    name: u.name ?? '',
    username: u.username ?? '',
    email: u.email ?? '',
    bio: u.bio ?? '',
    country: u.country ?? '',
    role: u.role || 'user',
    publicProfile: u.publicProfile !== false,
    stats: {
      experiences: s.experiences ?? 0,
      decisionsCompleted: s.decisionsCompleted ?? 0,
      contributions: s.contributions ?? 0,
    },
    createdAt: iso(u.createdAt),
  };
}
