import rateLimit from 'express-rate-limit';

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const max = Number(process.env.RATE_LIMIT_MAX) || 300;

function limiter({ windowMs: w, max: m, message }) {
  return rateLimit({
    windowMs: w,
    max: m,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: message },
  });
}

/** General API traffic: 300 requests / 15 min per IP. */
export const apiLimiter = limiter({
  windowMs,
  max,
  message: 'Too many requests, please try again later.',
});

/** Auth endpoints (login/register/reset): 20 requests / 15 min per IP. */
export const authLimiter = limiter({
  windowMs,
  max: 20,
  message: 'Too many auth attempts, please try again later.',
});

/** AI endpoints: 30 requests / hour per IP (expensive operations). */
export const aiLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'AI request limit reached, please try again later.',
});
