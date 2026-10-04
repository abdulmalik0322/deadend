import { ApiError } from '../utils/ApiError.js';

/** Catch-all for unmatched routes. Registered before errorHandler in app.js. */
export function notFound(req, res, next) {
  next(new ApiError(404, `Not found: ${req.method} ${req.originalUrl}`));
}
