import rateLimit from 'express-rate-limit';

// Limite générale — toutes les routes
export const generalLimiter = rateLimit({
  windowMs:         60 * 1000, // 1 minute
  max:              60,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'Too many requests, please slow down' },
});

// Limite stricte — /requests/add uniquement
export const addRequestLimiter = rateLimit({
  windowMs:         60 * 1000, // 1 minute
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'Too many add requests, please slow down' },
});
