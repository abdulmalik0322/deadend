import { Router } from 'express';
import * as c from '../controllers/search.controller.js';

const router = Router();

// GET /api/search?q=... (public; authenticated search adds no extra scope yet)
router.get('/', c.globalSearch);

export default router;
