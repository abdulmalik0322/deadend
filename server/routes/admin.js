import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as c from '../controllers/admin.controller.js';
import {
  listCategories,
  createCategory,
  updateCategory,
} from '../controllers/category.controller.js';
import {
  createCategoryValidator,
  updateCategoryValidator,
} from '../validators/category.validator.js';
import {
  moderateExperienceValidator,
  resolveAdminReportValidator,
  suspendUserValidator,
} from '../validators/admin.validator.js';

const router = Router();

// Everything here requires an admin role.
router.use(protect, authorize('admin'));

router.get('/overview', c.overview);

router.get('/moderation', c.moderationQueue);
router.post('/moderation/:id', moderateExperienceValidator, validate, c.moderateExperience);

router.get('/reports', c.listReports);
router.post(
  '/reports/:id/resolve',
  resolveAdminReportValidator,
  validate,
  c.resolveAdminReport
);

router.get('/users', c.listUsers);
router.post('/users/:id/suspend', suspendUserValidator, validate, c.suspendUser);

router.get('/categories', listCategories);
router.post('/categories', createCategoryValidator, validate, createCategory);
router.put('/categories/:slug', updateCategoryValidator, validate, updateCategory);

router.get('/analytics', c.analytics);

export default router;
