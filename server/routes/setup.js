import { Router } from 'express';
import * as c from '../controllers/setup.controller.js';

const router = Router();

router.post('/seed', c.seed);
router.post('/promote', c.promote);

export default router;
