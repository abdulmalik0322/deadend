import { Router } from 'express';
import * as c from '../controllers/stats.controller.js';

const router = Router();

// Public: real platform counts { experiences, decisions, contributors, countries }.
router.get('/', c.getStats);

export default router;
