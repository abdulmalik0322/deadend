import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';

/**
 * Require a valid Bearer JWT.
 * On success sets req.user = { id, role }.
 */
export function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Not authorized: missing bearer token'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role || 'user' };
    return next();
  } catch (err) {
    return next(new ApiError(401, 'Not authorized: invalid or expired token'));
  }
}

/**
 * Require the authenticated user to have one of the given roles.
 * Must be used after protect().
 * @param  {...string} roles e.g. authorize('admin')
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: insufficient permissions'));
    }
    return next();
  };
}
