import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect, authorize } from '../middleware/auth.js';
import * as c from '../controllers/contact.controller.js';

const router = Router();

/** Public submissions: 10 per hour per IP — strict because it is unauthenticated. */
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many contact messages, please try again later.' },
});

router.post('/', contactLimiter, c.submitContactMessage);
router.get('/', protect, authorize('admin'), c.listContactMessages);
router.patch('/:id', protect, authorize('admin'), c.updateContactMessage);

export default router;
