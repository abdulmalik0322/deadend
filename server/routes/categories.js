import { Router } from 'express';
import * as c from '../controllers/category.controller.js';

const router = Router();

// Public category browsing. Admin write routes live on /api/admin/categories
// (see routes/admin.js).
router.get('/', c.listCategories);
router.get('/:slug', c.getCategoryBySlug);

export default router;
