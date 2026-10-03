/**
 * Wrap an async route handler so rejected promises reach the error middleware.
 * @param {(req, res, next) => Promise<any>} fn
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
