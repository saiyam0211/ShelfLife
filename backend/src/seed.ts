import mongoose from 'mongoose';
import { connectDatabase, inTransaction } from './db.ts';
import { Book } from './models/Book.ts';
import { BorrowRecord, DAY_MS, LOAN_DAYS } from './models/BorrowRecord.ts';
import { Librarian, hashPassword } from './models/Librarian.ts';
import { Member } from './models/Member.ts';

// Development sample data. This script is safe to repeat:
// it adds only missing records and never changes loans or copy counts.

const BOOKS = [
  { title: 'The Pragmatic Programmer', author: 'David Thomas and Andrew Hunt', ISBN: '9780135957059', genre: 'Technology', totalCopies: 3 },
  { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', ISBN: '9780262033848', genre: 'Technology', totalCopies: 2 },
  { title: 'Design Patterns', author: 'Erich Gamma', ISBN: '9780201633610', genre: 'Technology', totalCopies: 1 },
  { title: 'Sapiens', author: 'Yuval Noah Harari', ISBN: '9780062316097', genre: 'History', totalCopies: 4 },
  { title: 'A Brief History of Time', author: 'Stephen Hawking', ISBN: '9780553380163', genre: 'Science', totalCopies: 2 },
  { title: 'Cosmos', author: 'Carl Sagan', ISBN: '9780345539434', genre: 'Science', totalCopies: 2 },
  { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', ISBN: '9780374533557', genre: 'Psychology', totalCopies: 2 },
  { title: '1984', author: 'George Orwell', ISBN: '9780451524935', genre: 'Fiction', totalCopies: 3 },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', ISBN: '9780061120084', genre: 'Fiction', totalCopies: 2 },
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', ISBN: '9780743273565', genre: 'Fiction', totalCopies: 1 },
  { title: 'Pride and Prejudice', author: 'Jane Austen', ISBN: '9780141439518', genre: 'Fiction', totalCopies: 2 },
  { title: 'The Hobbit', author: 'J. R. R. Tolkien', ISBN: '9780547928227', genre: 'Fantasy', totalCopies: 3 },
  { title: 'Dune', author: 'Frank Herbert', ISBN: '9780441172719', genre: 'Science Fiction', totalCopies: 2 },
];

const MEMBERS = [
  { name: 'Ravi Kumar', email: 'ravi@example.edu', membershipId: 'LIB-101' },
  { name: 'Meera Nair', email: 'meera@example.edu', membershipId: 'LIB-102' },
  { name: 'Arjun Singh', email: 'arjun@example.edu', membershipId: 'LIB-103' },
];

// Sample loans: one current, one overdue, one returned.
const LOANS = [
  { ISBN: '9780135957059', email: 'ravi@example.edu', issuedDaysAgo: 2, returnedDaysAgo: null },
  { ISBN: '9780262033848', email: 'ravi@example.edu', issuedDaysAgo: 30, returnedDaysAgo: null },
  { ISBN: '9780062316097', email: 'meera@example.edu', issuedDaysAgo: 20, returnedDaysAgo: 10 },
];

async function seedLibrarian(): Promise<void> {
  const email = process.env.SEED_LIBRARIAN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_LIBRARIAN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set SEED_LIBRARIAN_EMAIL and SEED_LIBRARIAN_PASSWORD in backend/.env');
  }
  // A repeated seed applies the current development password from .env.
  await Librarian.updateOne(
    { email },
    { $set: { passwordHash: await hashPassword(password), role: 'librarian' } },
    { upsert: true },
  );
}

async function seedLoans(): Promise<void> {
  // Never add sample loans when any loan exists.
  if (await BorrowRecord.exists({})) {
    return;
  }
  await inTransaction(async (session) => {
    for (const loan of LOANS) {
      const member = await Member.findOne({ email: loan.email }).session(session);
      const isOpen = loan.returnedDaysAgo === null;
      // An open loan takes one copy with the same conditional update as the API.
      const book = await Book.findOneAndUpdate(
        { ISBN: loan.ISBN, ...(isOpen && { availableCopies: { $gt: 0 } }) },
        { $inc: { availableCopies: isOpen ? -1 : 0 } },
        { session },
      );
      if (!member || !book) {
        continue;
      }
      const issueDate = new Date(Date.now() - loan.issuedDaysAgo * DAY_MS);
      await BorrowRecord.create(
        [
          {
            book: book._id,
            member: member._id,
            issueDate,
            dueDate: new Date(issueDate.getTime() + LOAN_DAYS * DAY_MS),
            returnDate: isOpen ? null : new Date(Date.now() - loan.returnedDaysAgo * DAY_MS),
            status: isOpen ? 'issued' : 'returned',
          },
        ],
        { session },
      );
    }
  });
}

await connectDatabase();
await seedLibrarian();
for (const book of BOOKS) {
  if (!(await Book.exists({ ISBN: book.ISBN }))) {
    await Book.create(book);
  }
}
for (const member of MEMBERS) {
  if (!(await Member.exists({ email: member.email }))) {
    await Member.create(member);
  }
}
await seedLoans();

console.log(
  `Seed complete: ${await Book.countDocuments()} books, ${await Member.countDocuments()} members, ` +
    `${await BorrowRecord.countDocuments()} loans, ${await Librarian.countDocuments()} librarian(s).`,
);
await mongoose.disconnect();
