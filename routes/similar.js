import { Router } from 'express';
import { aiLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { similarInputValidator } from '../validators/similar.validator.js';
import * as c from '../controllers/similarity.controller.js';

const router = Router();

// Public: find experiences similar to a described situation.
router.post('/', aiLimiter, similarInputValidator, validate, c.findSimilar);

export default router;
