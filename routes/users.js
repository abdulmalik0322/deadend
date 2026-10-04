import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import * as c from '../controllers/user.controller.js';

const router = Router();

// NOTE: /me/stats must be registered before /:username.
router.get('/me/stats', protect, c.myStats);
router.get('/:username', c.getPublicProfile);

export default router;
