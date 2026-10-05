import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.ts';
import {
  TOKEN_ALGORITHM,
  TOKEN_AUDIENCE,
  TOKEN_ISSUER,
  TOKEN_LIFETIME_SECONDS,
} from '../middleware/auth.ts';
import { ApiError } from '../middleware/errorHandler.ts';
import { Librarian, verifyPassword } from '../models/Librarian.ts';

// A hash that no password matches. An unknown email takes the same
// derivation time as an incorrect password.
const DUMMY_HASH = `scrypt$${'00'.repeat(16)}$${'00'.repeat(64)}`;

// POST /api/auth/login
export const login: RequestHandler = async (_req, res) => {
  const { email, password } = res.locals.body as { email: string; password: string };

  const librarian = await Librarian.findOne({ email });
  const passwordMatches = await verifyPassword(password, librarian?.passwordHash ?? DUMMY_HASH);
  if (!librarian || !passwordMatches) {
    // Same message for both failures: do not reveal which emails exist.
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const token = jwt.sign({ role: librarian.role }, config.jwtSecret, {
    algorithm: TOKEN_ALGORITHM,
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    subject: librarian.id,
    expiresIn: TOKEN_LIFETIME_SECONDS,
  });
  res.json({ data: { token, expiresIn: TOKEN_LIFETIME_SECONDS } });
};
