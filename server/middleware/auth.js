import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';

/**
 * Require a valid Bearer JWT.
 *
 * In addition to verifying the signature, the account is re-read from the
 * database on every authenticated request:
 *  - a suspended user is rejected immediately (403), even when their JWT
 *    has not expired yet (tokens live up to 7 days);
 *  - the role is taken from the database, so demoting/promoting a user or
 *    admin takes effect on their next request instead of at token expiry.
 *
 * On success sets req.user = { id, role }.
 */
export async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Not authorized: missing bearer token'));
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new ApiError(401, 'Not authorized: invalid or expired token'));
  }

  try {
    const user = await User.findById(payload.sub).select('role suspended').lean();
    if (!user) {
      return next(new ApiError(401, 'Not authorized: account no longer exists'));
    }
    if (user.suspended) {
      return next(new ApiError(403, 'Account suspended'));
    }
    req.user = { id: String(user._id), role: user.role || 'user' };
    return next();
  } catch (err) {
    return next(err);
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
