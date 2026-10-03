import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createCommentValidator,
  replyValidator,
} from '../validators/comment.validator.js';
import * as c from '../controllers/comment.controller.js';

const router = Router();

router.get('/', c.listComments); // ?experienceId=...
router.post('/', protect, createCommentValidator, validate, c.createComment);
router.post('/:id/replies', protect, replyValidator, validate, c.replyToComment);
router.post('/:id/like', protect, c.toggleLike);
router.delete('/:id', protect, c.deleteComment);
router.post('/:id/report', protect, c.reportComment);

export default router;
