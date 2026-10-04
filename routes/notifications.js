import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { notificationIdParam } from '../validators/notification.validator.js';
import * as c from '../controllers/notification.controller.js';

const router = Router();

router.use(protect);

router.get('/', c.listNotifications);
router.patch('/read-all', c.markAllRead);
router.patch('/:id/read', notificationIdParam, validate, c.markRead);

export default router;
