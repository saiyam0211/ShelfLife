import cors from 'cors';
import express from 'express';
import { config } from './config.ts';
import { errorHandler, notFound } from './middleware/errorHandler.ts';
import { requestLogger } from './middleware/requestLogger.ts';
import { authRoutes } from './routes/auth.ts';
import { bookRoutes } from './routes/books.ts';
import { borrowRoutes } from './routes/borrow.ts';
import { memberRoutes } from './routes/members.ts';

export const app = express();
app.disable('x-powered-by');

// Order matters: logger first, routes next, unmatched routes, error handler last.
app.use(requestLogger);
app.use(cors({ origin: config.frontendOrigins }));
app.use(express.json({ limit: '32kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/members', memberRoutes);
app.use('/api', borrowRoutes);

app.use(notFound);
app.use(errorHandler);
