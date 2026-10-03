import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import * as c from '../controllers/notification.controller.js';

const router = Router();

router.use(protect);

router.get('/', c.listNotifications); // ?unread=true
router.patch('/:id/read', c.markRead);
router.post('/read-all', c.markAllRead);

export default router;
