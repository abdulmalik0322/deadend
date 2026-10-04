import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { searchValidator, suggestionsValidator } from '../validators/search.validator.js';
import * as c from '../controllers/search.controller.js';

const router = Router();

// GET /api/search?q=... (public)
router.get('/', searchValidator, validate, c.globalSearch);
router.get('/suggestions', suggestionsValidator, validate, c.suggestions);

export default router;
