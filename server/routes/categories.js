import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createCategoryValidator,
  updateCategoryValidator,
} from '../validators/category.validator.js';
import * as c from '../controllers/category.controller.js';

const router = Router();

router.get('/', c.listCategories);
router.get('/:slug', c.getCategoryBySlug);
router.post('/', protect, authorize('admin'), createCategoryValidator, validate, c.createCategory);
router.patch(
  '/:slug',
  protect,
  authorize('admin'),
  updateCategoryValidator,
  validate,
  c.updateCategory
);

export default router;
