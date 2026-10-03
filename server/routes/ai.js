import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import * as c from '../controllers/ai.controller.js';

const router = Router();

router.post('/analyze', protect, aiLimiter, c.analyze);
router.post('/structure', protect, aiLimiter, c.structure);

export default router;
