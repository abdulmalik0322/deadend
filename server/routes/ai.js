import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { analyzeValidator, structureValidator } from '../validators/ai.validator.js';
import * as c from '../controllers/ai.controller.js';

const router = Router();

router.post('/analyze', protect, aiLimiter, analyzeValidator, validate, c.analyze);
router.post('/structure', protect, aiLimiter, structureValidator, validate, c.structure);

export default router;
