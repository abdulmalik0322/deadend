import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

/**
 * Terminal middleware for express-validator chains.
 * Converts validation failures into a 422 ApiError.
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(422, 'Validation failed', errors.array()));
  }
  return next();
}
