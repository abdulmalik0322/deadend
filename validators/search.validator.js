import { query } from 'express-validator';

/**
 * Shared validators for GET /api/search and GET /api/search/suggestions.
 *
 * `q` is optional here with checkFalsy so a missing/empty query skips
 * validation and reaches the controller, which answers 400 per contract
 * ("q required (400 if empty)"). The validator only bounds length/shape.
 */
const qValidator = query('q')
  .optional({ checkFalsy: true })
  .isString()
  .withMessage('q must be a string')
  .trim()
  .isLength({ max: 200 })
  .withMessage('q must be at most 200 characters');

const limitValidator = query('limit')
  .optional()
  .isInt({ min: 1, max: 30 })
  .withMessage('limit must be an integer between 1 and 30')
  .toInt();

export const searchValidator = [qValidator, limitValidator];
export const suggestionsValidator = [qValidator, limitValidator];
