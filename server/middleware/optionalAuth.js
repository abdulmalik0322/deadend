import jwt from 'jsonwebtoken';

/**
 * Attach req.user when a valid Bearer token is present; otherwise req.user = null.
 * Never errors — public endpoints use this to personalize (saved flags, own docs).
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.sub, role: payload.role || 'user' };
      return next();
    } catch {
      // invalid/expired token → treat as anonymous
    }
  }
  req.user = null;
  return next();
}
