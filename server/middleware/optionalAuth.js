import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Attach req.user when a valid Bearer token is present; otherwise req.user = null.
 * Never errors — public endpoints use this to personalize (saved flags, own docs).
 *
 * The account is re-read from the database so a suspended user is treated as
 * anonymous (they see only what a signed-out visitor sees), and the role is
 * always current.
 */
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub).select('role suspended').lean();
      if (user && !user.suspended) {
        req.user = { id: String(user._id), role: user.role || 'user' };
        return next();
      }
    } catch {
      // invalid/expired token or DB error → treat as anonymous
    }
  }
  req.user = null;
  return next();
}
