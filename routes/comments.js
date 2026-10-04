import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { commentIdParam, replyValidator } from '../validators/comment.validator.js';
import * as c from '../controllers/comment.controller.js';

const router = Router();

router.post('/:id/reply', protect, commentIdParam, replyValidator, validate, c.replyToComment);
router.post('/:id/like', protect, commentIdParam, validate, c.toggleLike);
router.delete('/:id', protect, commentIdParam, validate, c.deleteComment);

export default router;
