import type { RequestHandler } from 'express';
import { inTransaction } from '../db.ts';
import { ApiError } from '../middleware/errorHandler.ts';
import { Book } from '../models/Book.ts';
import { BorrowRecord, DAY_MS, LOAN_DAYS } from '../models/BorrowRecord.ts';
import { Member } from '../models/Member.ts';

// Race condition note (Q1e):
// Use one atomic update with an `availableCopies > 0` filter.
// Decrease the count with `$inc` in that update.
// Only one concurrent request can take the last copy.
// Create the loan in the same transaction as the decrement.
// Cancel both writes if loan creation fails.

// POST /api/borrow
export const issueBook: RequestHandler = async (_req, res) => {
  const { bookId, memberId } = res.locals.body as { bookId: string; memberId: string };

  const record = await inTransaction(async (session) => {
    if (!(await Member.exists({ _id: memberId }).session(session))) {
      throw new ApiError(404, 'NOT_FOUND', 'Member not found');
    }

    // The database checks the stock and takes the copy in one operation.
    // A second librarian's request for the last copy matches no document.
    const book = await Book.findOneAndUpdate(
      { _id: bookId, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { session },
    );
    if (!book) {
      // No match has two causes: an unknown book or no available copy.
      const bookExists = await Book.exists({ _id: bookId }).session(session);
      throw bookExists
        ? new ApiError(409, 'NO_COPIES', 'No copies of this book are available')
        : new ApiError(404, 'NOT_FOUND', 'Book not found');
    }

    // The server assigns all loan dates in UTC.
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + LOAN_DAYS * DAY_MS);
    // If this insert fails, the transaction cancels the decrement above.
    const [created] = await BorrowRecord.create(
      [{ book: bookId, member: memberId, issueDate, dueDate }],
      { session },
    );
    return created;
  });

  // Respond only after the commit.
  res.status(201).json({ data: record });
};

// POST /api/return/:borrowId
export const returnBook: RequestHandler = async (_req, res) => {
  const { borrowId } = res.locals.params as { borrowId: string };

  const record = await inTransaction(async (session) => {
    // The `returnDate: null` filter closes an open loan one time only.
    // A repeated or concurrent return matches no document.
    const returned = await BorrowRecord.findOneAndUpdate(
      { _id: borrowId, returnDate: null },
      { $set: { returnDate: new Date(), status: 'returned' } },
      { session, returnDocument: 'after' },
    );
    if (!returned) {
      const loanExists = await BorrowRecord.exists({ _id: borrowId }).session(session);
      throw loanExists
        ? new ApiError(409, 'ALREADY_RETURNED', 'This loan is already returned')
        : new ApiError(404, 'NOT_FOUND', 'Borrow record not found');
    }

    // Restore the copy only while the count is below totalCopies.
    const book = await Book.findOneAndUpdate(
      { _id: returned.book, $expr: { $lt: ['$availableCopies', '$totalCopies'] } },
      { $inc: { availableCopies: 1 } },
      { session },
    );
    if (!book) {
      // The book is missing or its count is already full: inconsistent data.
      // Throw to cancel the transaction, so the loan stays open.
      throw new Error(`Cannot restore a copy of book ${returned.book} for loan ${borrowId}`);
    }
    return returned;
  });

  res.json({ data: record });
};
