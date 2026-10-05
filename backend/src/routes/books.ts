import { Router } from 'express';
import { createBook, listBooks, listGenres } from '../controllers/books.ts';
import { requireLibrarian } from '../middleware/auth.ts';
import { integer, isbn, optional, queryInteger, text, validate } from '../middleware/validate.ts';

export const bookRoutes = Router();

bookRoutes.get('/genres', listGenres);

bookRoutes.get(
  '/',
  validate('query', {
    page: optional(queryInteger(1, 1_000_000), 1),
    limit: optional(queryInteger(1, 100), 10),
    genre: optional(text(1, 80)),
    q: optional(text(1, 200)),
  }),
  listBooks,
);

bookRoutes.post(
  '/',
  requireLibrarian,
  validate('body', {
    title: text(1, 200),
    author: text(1, 200),
    ISBN: isbn,
    genre: text(1, 80),
    totalCopies: integer(1, 100_000),
  }),
  createBook,
);
