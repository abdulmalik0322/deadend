import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createExperienceValidator,
  updateExperienceValidator,
} from '../validators/experience.validator.js';
import * as c from '../controllers/experience.controller.js';

const router = Router();

router.get('/', c.listExperiences);
router.get('/:slug', c.getExperienceBySlug);
router.post('/', protect, createExperienceValidator, validate, c.createExperience);
router.patch('/:id', protect, updateExperienceValidator, validate, c.updateExperience);
router.delete('/:id', protect, c.deleteExperience);
router.post('/:id/save', protect, c.saveExperience);
router.delete('/:id/save', protect, c.unsaveExperience);
router.post('/:id/report', protect, c.reportExperience);

export default router;
