import { SavedExperience } from '../models/SavedExperience.js';
import { Folder } from '../models/Folder.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';

/** GET /api/saved — optional ?folder=<folderId> filter. */
export const listSaved = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = { user: req.user.id };
  if (req.query.folder) filter.folder = req.query.folder;

  const [items, total] = await Promise.all([
    SavedExperience.find(filter)
      .populate({
        path: 'experience',
        select: 'title slug goal outcome country tags category stats',
        populate: { path: 'category', select: 'name slug' },
      })
      .populate('folder', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SavedExperience.countDocuments(filter),
  ]);

  res.json({ page, limit, total, pages: Math.ceil(total / limit), items });
});

/** GET /api/saved/folders */
export const listFolders = asyncHandler(async (req, res) => {
  const folders = await Folder.find({ user: req.user.id }).sort({ name: 1 }).lean();
  res.json(folders);
});

/** POST /api/saved/folders */
export const createFolder = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) throw new ApiError(400, 'name is required');

  try {
    const folder = await Folder.create({ user: req.user.id, name: String(name).trim() });
    res.status(201).json(folder);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Folder name already exists');
    throw err;
  }
});

/** PATCH /api/saved/folders/:id */
export const updateFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
  if (!folder) throw new ApiError(404, 'Folder not found');

  const { name } = req.body;
  if (!name || !String(name).trim()) throw new ApiError(400, 'name is required');

  try {
    folder.name = String(name).trim();
    await folder.save();
    res.json(folder);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Folder name already exists');
    throw err;
  }
});

/** DELETE /api/saved/folders/:id — saved items in it become unfiled. */
export const deleteFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!folder) throw new ApiError(404, 'Folder not found');

  await SavedExperience.updateMany(
    { user: req.user.id, folder: folder._id },
    { $set: { folder: null } }
  );
  res.json({ message: 'Folder deleted' });
});
