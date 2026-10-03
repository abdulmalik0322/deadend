import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as c from '../controllers/report.controller.js';

const router = Router();

router.post('/', protect, c.createReport);
router.get('/', protect, authorize('admin'), c.listReports);
router.patch('/:id', protect, authorize('admin'), c.resolveReport);

export default router;
