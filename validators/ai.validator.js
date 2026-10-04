import { body } from 'express-validator';

const STR_MAX = 300;

function optString(field, max = STR_MAX) {
  return body(field)
    .optional({ checkFalsy: true })
    .isString()
    .withMessage(`${field} must be a string`)
    .trim()
    .isLength({ max })
    .withMessage(`${field} must be at most ${max} characters`);
}

/**
 * POST /api/ai/analyze — accepts the flat decision-input shape
 * ({ goal?, country?, budget?, experienceLevel?, timeAvailable?, skills?[] })
 * or the legacy { input: {...} } wrapper.
 */
export const analyzeValidator = [
  body('input').optional().isObject().withMessage('input must be an object'),
  optString('goal'),
  optString('country', 100),
  optString('budget', 100),
  optString('experienceLevel', 100),
  optString('timeAvailable', 100),
  optString('input.goal'),
  optString('input.country', 100),
  optString('input.budget', 100),
  optString('input.experienceLevel', 100),
  optString('input.timeAvailable', 100),
  body('skills').optional().isArray().withMessage('skills must be an array'),
  body('skills.*')
    .optional()
    .isString()
    .withMessage('each skill must be a string')
    .trim()
    .isLength({ max: 60 })
    .withMessage('each skill must be at most 60 characters'),
  body('input.skills').optional().isArray().withMessage('input.skills must be an array'),
  body('input.skills.*')
    .optional()
    .isString()
    .withMessage('each skill must be a string')
    .trim()
    .isLength({ max: 60 })
    .withMessage('each skill must be at most 60 characters'),
];

/**
 * POST /api/ai/structure — { text (10-5000) }.
 * Empty/missing text skips validation and hits the controller's 400.
 */
export const structureValidator = [
  body('text')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('text must be a string')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('text must be between 10 and 5000 characters'),
];
