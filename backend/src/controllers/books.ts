import type { RequestHandler } from 'express';
import { Book, TITLE_COLLATION, normalizeGenre } from '../models/Book.ts';

interface CreateBookInput {
  title: string;
  author: string;
  ISBN: string;
  genre: string;
  totalCopies: number;
}

interface ListBooksQuery {
  page: number;
  limit: number;
  genre?: string;
  q?: string;
}

// POST /api/books
export const createBook: RequestHandler = async (_req, res) => {
  const { title, author, ISBN, genre, totalCopies } = res.locals.body as CreateBookInput;
  // The schema default sets availableCopies to totalCopies.
  const book = await Book.create({ title, author, ISBN, genre, totalCopies });
  res.status(201).json({ data: book });
};

// GET /api/books?page=&limit=&genre=&q=
export const listBooks: RequestHandler = async (_req, res) => {
  const { page, limit, genre, q } = res.locals.query as ListBooksQuery;

  const filter: Record<string, unknown> = {};
  if (genre) {
    filter.genre = normalizeGenre(genre);
  }
  if (q) {
    // Escape regex metacharacters: `q` is a literal title substring, not a pattern.
    filter.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  // Both filters apply before the count and before pagination.
  const [books, total] = await Promise.all([
    Book.find(filter)
      .collation(TITLE_COLLATION)
      .sort({ title: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Book.countDocuments(filter),
  ]);

  res.json({
    data: books,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
};

// GET /api/books/genres
export const listGenres: RequestHandler = async (_req, res) => {
  const genres = await Book.distinct('genre');
  res.json({ data: genres.sort((a, b) => a.localeCompare(b)) });
};
