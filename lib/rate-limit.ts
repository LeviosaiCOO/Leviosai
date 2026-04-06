import rateLimit from "express-rate-limit";

// Strict limiter for auth endpoints (login, register)
// Prevents brute-force attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter — generous but prevents abuse
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI endpoints — more restrictive (Claude API costs money)
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 AI requests per window
  message: { error: "Too many AI requests. Please try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Messaging endpoints — prevent SMS/email spam
export const messagingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 messages per window
  message: { error: "Too many messages sent. Please try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});
