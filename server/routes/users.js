import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import * as c from '../controllers/user.controller.js';

const router = Router();

// NOTE: /me/stats must be registered before /:username.
// optionalAuth on /:username lets the controller tell owner/admin apart from
// visitors, so private profiles stay visible to their owner and to admins.
router.get('/me/stats', protect, c.myStats);
router.get('/:username', optionalAuth, c.getPublicProfile);

export default router;
