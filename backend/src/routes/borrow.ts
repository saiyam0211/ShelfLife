import { Router } from 'express';
import { issueBook, returnBook } from '../controllers/borrow.ts';
import { requireLibrarian } from '../middleware/auth.ts';
import { objectId, validate } from '../middleware/validate.ts';

// Mounted at /api: the exam paths are /api/borrow and /api/return/:borrowId.
export const borrowRoutes = Router();

borrowRoutes.post(
  '/borrow',
  requireLibrarian,
  validate('body', { bookId: objectId, memberId: objectId }),
  issueBook,
);
borrowRoutes.post(
  '/return/:borrowId',
  requireLibrarian,
  validate('params', { borrowId: objectId }),
  returnBook,
);
