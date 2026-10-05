import type { RequestHandler } from 'express';
import { isValidIsbn, normalizeIsbn } from '../models/Book.ts';
import { EMAIL_PATTERN } from '../models/Member.ts';
import { ApiError } from './errorHandler.ts';

// A check returns the cleaned value. It throws an Error with the field message.
export type Check = (value: unknown) => unknown;

export function text(min: number, max: number, trim = true): Check {
  return (value) => {
    if (typeof value !== 'string') {
      throw new Error('Must be a string');
    }
    const cleaned = trim ? value.trim() : value;
    if (cleaned.length < min || cleaned.length > max) {
      throw new Error(`Must have ${min} to ${max} characters`);
    }
    return cleaned;
  };
}

export function integer(min: number, max: number): Check {
  return (value) => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
      throw new Error(`Must be an integer from ${min} to ${max}`);
    }
    return value;
  };
}

// Query values arrive as strings. Accept digits only, then apply the integer rule.
export function queryInteger(min: number, max: number): Check {
  const check = integer(min, max);
  return (value) => check(typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN);
}

export function optional(check: Check, fallback?: unknown): Check {
  return (value) => (value === undefined ? fallback : check(value));
}

export const objectId: Check = (value) => {
  if (typeof value !== 'string' || !/^[0-9a-f]{24}$/i.test(value)) {
    throw new Error('Must be a 24-character hexadecimal ID');
  }
  return value;
};

export const email: Check = (value) => {
  const cleaned = (text(3, 254)(value) as string).toLowerCase();
  if (!EMAIL_PATTERN.test(cleaned)) {
    throw new Error('Must be a valid email address');
  }
  return cleaned;
};

export const isbn: Check = (value) => {
  const cleaned = normalizeIsbn(text(10, 32)(value) as string);
  if (!isValidIsbn(cleaned)) {
    throw new Error('Must be an ISBN-10 or ISBN-13 with a valid check digit');
  }
  return cleaned;
};

// Validate one request part against named rules.
// Controllers read the cleaned values from res.locals[source].
// Only named fields pass, so a body can never supply a query operator
// or a server-controlled field such as availableCopies.
export function validate(source: 'body' | 'query' | 'params', rules: Record<string, Check>): RequestHandler {
  return (req, res, next) => {
    const input: unknown = req[source] ?? {};
    if (typeof input !== 'object' || Array.isArray(input)) {
      throw new ApiError(400, 'VALIDATION_ERROR', `Request ${source} must be a JSON object`);
    }
    const values = input as Record<string, unknown>;
    const fields: Record<string, string> = {};
    const cleaned: Record<string, unknown> = {};

    for (const key of Object.keys(values)) {
      if (!Object.hasOwn(rules, key)) {
        fields[key] = 'Unknown field';
      }
    }
    for (const [key, check] of Object.entries(rules)) {
      try {
        cleaned[key] = check(values[key]);
      } catch (error) {
        fields[key] = (error as Error).message;
      }
    }

    if (Object.keys(fields).length > 0) {
      const code = source === 'params' ? 'INVALID_ID' : 'VALIDATION_ERROR';
      throw new ApiError(400, code, `Invalid request ${source}`, fields);
    }
    res.locals[source] = cleaned;
    next();
  };
}
