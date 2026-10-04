import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { validate } from '../middleware/validate.js';
import {
  createExperienceValidator,
  updateExperienceValidator,
  experienceIdParam,
} from '../validators/experience.validator.js';
import { experienceCommentValidator } from '../validators/comment.validator.js';
import * as c from '../controllers/experience.controller.js';

const router = Router();

router.get('/', optionalAuth, c.listExperiences);
router.get('/search', c.getSearchExperiences); // must come before /:slug
router.get('/:slug', optionalAuth, c.getExperienceBySlug);
router.post('/:id/view', optionalAuth, c.recordView);
router.post('/', protect, createExperienceValidator, validate, c.createExperience);
router.patch(
  '/:id',
  protect,
  experienceIdParam,
  updateExperienceValidator,
  validate,
  c.updateExperience
);
router.delete('/:id', protect, experienceIdParam, validate, c.deleteExperience);
router.post('/:id/save', protect, experienceIdParam, validate, c.saveExperience);
router.delete('/:id/save', protect, experienceIdParam, validate, c.unsaveExperience);
router.get('/:id/comments', optionalAuth, experienceIdParam, validate, c.listExperienceComments);
router.post(
  '/:id/comments',
  protect,
  experienceIdParam,
  experienceCommentValidator,
  validate,
  c.addExperienceComment
);

export default router;
