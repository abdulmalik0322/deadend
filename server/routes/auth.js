import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { registerValidator, loginValidator } from '../validators/auth.validator.js';
import * as c from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', authLimiter, registerValidator, validate, c.register);
router.post('/login', authLimiter, loginValidator, validate, c.login);
router.get('/me', protect, c.me);
router.post('/logout', c.logout);
router.post('/forgot-password', authLimiter, c.forgotPassword);
router.post('/reset-password', authLimiter, c.resetPassword);
router.patch('/profile', protect, c.updateProfile);

export default router;
