import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as c from '../controllers/admin.controller.js';

const router = Router();

// Everything here requires an admin role.
router.use(protect, authorize('admin'));

router.get('/overview', c.overview);
router.get('/queue', c.moderationQueue);
router.patch('/experiences/:id/approve', c.approveExperience);
router.patch('/experiences/:id/reject', c.rejectExperience);
router.get('/users', c.listUsers);
router.patch('/users/:id/suspend', c.suspendUser);
router.get('/analytics', c.analytics);

export default router;
