import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

// Log method, pathname, status, elapsed time, and a request identifier.
// Never log headers, query strings, or bodies: they can contain credentials.
export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  const started = performance.now();
  // Routers rewrite req.url while they run. Read the pathname now.
  const pathname = req.path;

  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => {
    const elapsed = Math.round(performance.now() - started);
    console.log(`${req.method} ${pathname} ${res.statusCode} ${elapsed}ms ${requestId}`);
  });
  next();
};
