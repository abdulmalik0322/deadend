/**
 * Central error handler. Translates ApiError, Mongoose and JWT errors
 * into clean JSON responses. Must be registered last in app.js.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Mongoose: invalid ObjectId in a route param.
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  // Mongoose: duplicate key (e.g. unique index).
  if (err.code === 11000) {
    status = 409;
    message = 'Duplicate value for a unique field';
    details = err.keyValue;
  }
  // Mongoose: schema validation failure.
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  }

  const payload = { error: message };
  if (details !== undefined) payload.details = details;
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}
