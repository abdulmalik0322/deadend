import mongoose from 'mongoose';
import { SavedExperience } from '../models/SavedExperience.js';
import { Folder } from '../models/Folder.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { presentExperience, presentFolder } from '../utils/present.js';
import { stripHtml } from '../utils/sanitize.js';

/**
 * GET /api/saved — ?folderId= (legacy ?folder=) and ?q= (title/goal/description).
 * Returns an ARRAY of { ...presentedExperience, folderId, savedAt }.
 * Entries whose experience was deleted are skipped.
 */
export const listSaved = asyncHandler(async (req, res) => {
  const folderId = req.query.folderId || req.query.folder;
  const filter = { user: req.user.id };
  if (folderId) filter.folder = folderId;

  const saved = await SavedExperience.find(filter)
    .populate({
      path: 'experience',
      populate: { path: 'category', select: 'name slug' },
    })
    .populate('folder', 'name')
    .sort({ createdAt: -1 })
    .lean();

  let items = saved.filter((s) => s.experience);

  const q = (req.query.q || '').trim().toLowerCase();
  if (q) {
    items = items.filter((s) =>
      [s.experience.title, s.experience.goal, s.experience.description].some((f) =>
        String(f || '')
          .toLowerCase()
          .includes(q)
      )
    );
  }

  res.json(
    items.map((s) => ({
      ...presentExperience(s.experience),
      folderId: s.folder ? String(s.folder._id) : null,
      savedAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
    }))
  );
});

/** GET /api/saved/folders — [Folder] with saved-item counts. */
export const listFolders = asyncHandler(async (req, res) => {
  const folders = await Folder.find({ user: req.user.id }).sort({ name: 1 }).lean();

  const counts = await SavedExperience.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.user.id),
        folder: { $ne: null },
      },
    },
    { $group: { _id: '$folder', count: { $sum: 1 } } },
  ]);
  const byFolder = new Map(counts.map((c) => [String(c._id), c.count]));

  res.json(folders.map((f) => presentFolder(f, byFolder.get(String(f._id)) || 0)));
});

/** POST /api/saved/folders — { name (1-60) } -> 201 Folder. 409 on duplicate. */
export const createFolder = asyncHandler(async (req, res) => {
  const name = stripHtml(String(req.body.name || '')).trim();
  if (!name) throw new ApiError(400, 'name is required');

  try {
    const folder = await Folder.create({ user: req.user.id, name });
    res.status(201).json(presentFolder(folder, 0));
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Folder name already exists');
    throw err;
  }
});

/** PATCH /api/saved/folders/:id — owner only. */
export const updateFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
  if (!folder) throw new ApiError(404, 'Folder not found');

  const name = stripHtml(String(req.body.name || '')).trim();
  if (!name) throw new ApiError(400, 'name is required');

  try {
    folder.name = name;
    await folder.save();
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Folder name already exists');
    throw err;
  }

  const count = await SavedExperience.countDocuments({
    user: req.user.id,
    folder: folder._id,
  });
  res.status(200).json(presentFolder(folder, count));
});

/** DELETE /api/saved/folders/:id — owner only; saves become unfiled, not deleted. */
export const deleteFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!folder) throw new ApiError(404, 'Folder not found');

  await SavedExperience.updateMany(
    { user: req.user.id, folder: folder._id },
    { $set: { folder: null } }
  );
  res.json({ ok: true });
});
