import { Router } from 'express';
import { login } from '../controllers/auth.ts';
import { loginRateLimit } from '../middleware/auth.ts';
import { email, text, validate } from '../middleware/validate.ts';

export const authRoutes = Router();

// Public route. Do not trim the password: spaces can be part of it.
authRoutes.post(
  '/login',
  loginRateLimit,
  validate('body', { email, password: text(1, 200, false) }),
  login,
);
