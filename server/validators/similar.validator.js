import { body } from 'express-validator';

/**
 * POST /api/similar — all fields optional; length caps only.
 * { goal?, country?, budget?, experienceLevel?, timeAvailable?, skills?[] }
 */
export const similarInputValidator = [
  body('goal').optional().isString().trim().isLength({ max: 500 }),
  body('country').optional().isString().trim().isLength({ max: 80 }),
  body('budget').optional().isString().trim().isLength({ max: 120 }),
  body('experienceLevel').optional().isString().trim().isLength({ max: 80 }),
  body('timeAvailable').optional().isString().trim().isLength({ max: 80 }),
  body('skills').optional().isArray({ max: 30 }).withMessage('skills must be an array'),
  body('skills.*').optional().isString().trim().isLength({ max: 60 }),
];
