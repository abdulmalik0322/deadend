import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createReportValidator,
  reportIdParam,
  resolveReportValidator,
} from '../validators/report.validator.js';
import * as c from '../controllers/report.controller.js';

const router = Router();

router.post('/', protect, createReportValidator, validate, c.createReport);
router.get('/', protect, authorize('admin'), c.listReports);
router.patch(
  '/:id',
  protect,
  authorize('admin'),
  reportIdParam,
  resolveReportValidator,
  validate,
  c.resolveReport
);

export default router;
