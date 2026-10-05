import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.ts';
import { ApiError } from './errorHandler.ts';

export const TOKEN_ALGORITHM = 'HS256';
export const TOKEN_ISSUER = 'shelflife-api';
export const TOKEN_AUDIENCE = 'shelflife-client';
export const TOKEN_LIFETIME_SECONDS = 3600;

// Allow a request only when it carries a valid librarian JWT.
export const requireLibrarian: RequestHandler = (req, res, next) => {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Login is required');
  }

  let payload: string | jwt.JwtPayload;
  try {
    // verify() checks the signature, expiry, issuer, and audience.
    // Only the selected algorithm is accepted.
    payload = jwt.verify(token, config.jwtSecret, {
      algorithms: [TOKEN_ALGORITHM],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
  } catch {
    throw new ApiError(401, 'INVALID_TOKEN', 'Token is invalid or expired');
  }

  if (typeof payload === 'string' || !payload.sub) {
    throw new ApiError(401, 'INVALID_TOKEN', 'Token is invalid or expired');
  }
  if (payload.role !== 'librarian') {
    throw new ApiError(403, 'FORBIDDEN', 'Librarian role is required');
  }
  res.locals.librarianId = payload.sub;
  next();
};

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 60_000;
const loginAttempts = new Map<string, number>();
setInterval(() => loginAttempts.clear(), LOGIN_WINDOW_MS).unref();

// ponytail: in-memory fixed window for one API process.
// Use a shared store when the API runs on more than one replica.
export const loginRateLimit: RequestHandler = (req, _res, next) => {
  const client = req.ip ?? 'unknown';
  const count = (loginAttempts.get(client) ?? 0) + 1;
  loginAttempts.set(client, count);
  if (count > LOGIN_LIMIT) {
    throw new ApiError(429, 'RATE_LIMITED', 'Too many login attempts; retry in one minute');
  }
  next();
};
