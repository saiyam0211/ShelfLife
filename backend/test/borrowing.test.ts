import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, mock, test } from 'node:test';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../src/app.ts';
import { config } from '../src/config.ts';
import { connectDatabase } from '../src/db.ts';
import { TOKEN_AUDIENCE, TOKEN_ISSUER } from '../src/middleware/auth.ts';
import { Book } from '../src/models/Book.ts';
import { BorrowRecord, DAY_MS } from '../src/models/BorrowRecord.ts';
import { Librarian, hashPassword } from '../src/models/Librarian.ts';

// Integration check: the real API with a real MongoDB replica set.
// The test uses its own database and refuses the application database name,
// because it deletes all data in the database that it uses.
const TEST_DB = process.env.TEST_DB_NAME ?? 'shelflife_test';
const appDb = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(config.mongodbUri)?.[1] ?? '';
assert.ok(
  TEST_DB.endsWith('_test') && TEST_DB !== appDb,
  `Refusing to run tests against database "${TEST_DB}"`,
);

const LIBRARIAN = { email: 'test-librarian@example.edu', password: 'correct horse battery staple' };

let server: Server;
let baseUrl = '';
let token = '';

interface ApiResponse {
  status: number;
  // The tests assert on the body shape, so a loose type is sufficient here.
  body: any;
}

async function api(method: string, path: string, body?: unknown, auth = token): Promise<ApiResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(auth && { Authorization: `Bearer ${auth}` }),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function signToken(claims: object, expiresIn = 60): string {
  return jwt.sign(claims, config.jwtSecret, {
    algorithm: 'HS256',
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    subject: 'test-subject',
    expiresIn,
  });
}

async function createBook(title: string, ISBN: string, genre: string, totalCopies = 1): Promise<any> {
  const created = await api('POST', '/books', { title, author: 'Test Author', ISBN, genre, totalCopies });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return created.body.data;
}

async function createMember(name: string, membershipId: string): Promise<any> {
  const email = `${membershipId.toLowerCase()}@example.edu`;
  const created = await api('POST', '/members', { name, email, membershipId });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return created.body.data;
}

before(async () => {
  await connectDatabase(TEST_DB);
  assert.equal(mongoose.connection.name, TEST_DB);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((model) => model.createIndexes()));
  await Librarian.create({
    email: LIBRARIAN.email,
    passwordHash: await hashPassword(LIBRARIAN.password),
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}/api`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('login issues a JWT and protected routes reject bad tokens', async () => {
  const wrongPassword = await api('POST', '/auth/login', { ...LIBRARIAN, password: 'wrong' }, '');
  const unknownEmail = await api('POST', '/auth/login', { ...LIBRARIAN, email: 'nobody@example.edu' }, '');
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.body.error.code, 'INVALID_CREDENTIALS');
  assert.deepEqual(unknownEmail.body, wrongPassword.body);

  const login = await api('POST', '/auth/login', LIBRARIAN, '');
  assert.equal(login.status, 200);
  assert.equal(login.body.data.expiresIn, 3600);
  token = login.body.data.token;

  const book = { title: 'Blocked', author: 'A', ISBN: '9780132350884', genre: 'Technology', totalCopies: 1 };
  const missing = await api('POST', '/books', book, '');
  const malformed = await api('POST', '/books', book, 'not-a-jwt');
  const expired = await api('POST', '/books', book, signToken({ role: 'librarian' }, -10));
  const wrongRole = await api('POST', '/books', book, signToken({ role: 'member' }));
  assert.deepEqual([missing.status, missing.body.error.code], [401, 'AUTH_REQUIRED']);
  assert.deepEqual([malformed.status, malformed.body.error.code], [401, 'INVALID_TOKEN']);
  assert.deepEqual([expired.status, expired.body.error.code], [401, 'INVALID_TOKEN']);
  assert.deepEqual([wrongRole.status, wrongRole.body.error.code], [403, 'FORBIDDEN']);

  // Member reads and both loan mutations are private also.
  assert.equal((await api('GET', '/members', undefined, '')).status, 401);
  assert.equal((await api('POST', '/members', {}, '')).status, 401);
  assert.equal((await api('POST', '/borrow', {}, '')).status, 401);
  assert.equal((await api('POST', `/return/${'a'.repeat(24)}`, undefined, '')).status, 401);
  assert.equal(await Book.countDocuments(), 0, 'no mutation without a librarian token');
});

test('validation rejects bad input and unique indexes reject duplicates', async () => {
  const valid = { title: 'Clean Code', author: 'Robert C. Martin', ISBN: '978-0-13-235088-4', genre: 'technology', totalCopies: 2 };

  const malformedJson = await api('POST', '/books', '{"title":');
  assert.deepEqual([malformedJson.status, malformedJson.body.error.code], [400, 'VALIDATION_ERROR']);

  const invalid = await api('POST', '/books', {
    title: '   ',
    author: 42,
    ISBN: '9780132350885',
    genre: 'Technology',
    totalCopies: 1.5,
    availableCopies: 99,
  });
  assert.equal(invalid.status, 400);
  assert.deepEqual(
    Object.keys(invalid.body.error.fields).sort(),
    ['ISBN', 'author', 'availableCopies', 'title', 'totalCopies'],
  );

  const created = await api('POST', '/books', valid);
  assert.equal(created.status, 201);
  assert.equal(created.body.data.ISBN, '9780132350884', 'ISBN is normalized');
  assert.equal(created.body.data.genre, 'Technology', 'genre is normalized');
  assert.equal(created.body.data.availableCopies, 2, 'new book has all copies available');
  assert.equal('__v' in created.body.data, false);

  const duplicateIsbn = await api('POST', '/books', { ...valid, ISBN: '9780132350884' });
  assert.deepEqual([duplicateIsbn.status, duplicateIsbn.body.error.code], [409, 'DUPLICATE_VALUE']);

  const member = await createMember('Asha Patel', 'LIB-001');
  assert.ok(!Number.isNaN(Date.parse(member.joinedDate)));
  const duplicateEmail = await api('POST', '/members', { name: 'Other', email: 'LIB-001@example.edu', membershipId: 'LIB-002' });
  const duplicateId = await api('POST', '/members', { name: 'Other', email: 'other@example.edu', membershipId: 'LIB-001' });
  const badEmail = await api('POST', '/members', { name: 'Other', email: 'not-an-email', membershipId: 'LIB-003' });
  assert.deepEqual([duplicateEmail.status, duplicateEmail.body.error.code], [409, 'DUPLICATE_VALUE']);
  assert.deepEqual([duplicateId.status, duplicateId.body.error.code], [409, 'DUPLICATE_VALUE']);
  assert.equal(badEmail.status, 400);

  const badPathId = await api('GET', '/members/not-an-id/history');
  const badBodyId = await api('POST', '/borrow', { bookId: { $gt: '' }, memberId: member._id });
  const badQuery = await api('GET', '/books?limit=0&page=abc');
  const unknownRoute = await api('GET', '/nothing');
  assert.deepEqual([badPathId.status, badPathId.body.error.code], [400, 'INVALID_ID']);
  assert.deepEqual([badBodyId.status, badBodyId.body.error.code], [400, 'VALIDATION_ERROR']);
  assert.deepEqual(Object.keys(badQuery.body.error.fields).sort(), ['limit', 'page']);
  assert.deepEqual([unknownRoute.status, unknownRoute.body.error.code], [404, 'NOT_FOUND']);
});

test('book listing paginates, filters by genre, and searches titles literally', async () => {
  // Thirteen books with the one from the previous test: more than one default page.
  const isbns = [
    '9780135957059', '9780262033848', '9780201633610', '9780062316097', '9780553380163', '9780345539434',
    '9780451524935', '9780061120084', '9780743273565', '9780141439518', '9780547928227', '9780441172719',
  ];
  for (const [index, ISBN] of isbns.entries()) {
    const title = index === 0 ? 'apple .* guide' : `zebra tales ${String(index).padStart(2, '0')}`;
    await createBook(title, ISBN, index < 4 ? 'History' : 'science fiction');
  }

  const pageOne = await api('GET', '/books', undefined, '');
  assert.equal(pageOne.status, 200, 'listing is public');
  assert.deepEqual(pageOne.body.pagination, { page: 1, limit: 10, total: 13, totalPages: 2 });
  assert.equal(pageOne.body.data.length, 10);
  assert.equal(pageOne.body.data[0].title, 'apple .* guide', 'titles sort without letter case');

  const pageTwo = await api('GET', '/books?page=2');
  const pageNine = await api('GET', '/books?page=9');
  assert.equal(pageTwo.body.data.length, 3);
  assert.deepEqual(pageNine.body.data, []);
  const allIds = [...pageOne.body.data, ...pageTwo.body.data].map((book) => book._id);
  assert.equal(new Set(allIds).size, 13, 'pages do not repeat a book');

  const genre = await api('GET', '/books?genre=SCIENCE%20FICTION&limit=100');
  assert.equal(genre.body.pagination.total, 8);
  assert.ok(genre.body.data.every((book: any) => book.genre === 'Science Fiction'));

  // The title on the later page is found, and ".*" is not a pattern.
  const later = await api('GET', '/books?q=TALES%2011');
  const literal = await api('GET', `/books?q=${encodeURIComponent('.*')}`);
  const combined = await api('GET', '/books?q=zebra&genre=history&limit=2');
  const none = await api('GET', '/books?q=no-such-title');
  assert.deepEqual(later.body.data.map((book: any) => book.title), ['zebra tales 11']);
  assert.deepEqual(literal.body.data.map((book: any) => book.title), ['apple .* guide']);
  assert.deepEqual(combined.body.pagination, { page: 1, limit: 2, total: 3, totalPages: 2 });
  assert.deepEqual([none.body.data, none.body.pagination.totalPages], [[], 0]);

  const genres = await api('GET', '/books/genres', undefined, '');
  assert.deepEqual(genres.body.data, ['History', 'Science Fiction', 'Technology']);
});

test('issue and return keep copy counts consistent under concurrent requests', async () => {
  // Steps 1-2: one book with one copy, two members.
  const book = await createBook('Last Copy', '0306406152', 'Technology', 1);
  const first = await createMember('First Member', 'LIB-201');
  const second = await createMember('Second Member', 'LIB-202');
  const copies = async () => (await Book.findById(book._id))?.availableCopies;

  // Steps 3-5: two librarians issue the last copy at the same time.
  const issues = await Promise.all([
    api('POST', '/borrow', { bookId: book._id, memberId: first._id }),
    api('POST', '/borrow', { bookId: book._id, memberId: second._id }),
  ]);
  assert.deepEqual(issues.map((issue) => issue.status).sort(), [201, 409]);
  const lost = issues.find((issue) => issue.status === 409)!;
  const won = issues.find((issue) => issue.status === 201)!;
  assert.equal(lost.body.error.code, 'NO_COPIES');
  assert.equal(await copies(), 0);
  assert.equal(await BorrowRecord.countDocuments({ book: book._id }), 1);

  const loan = won.body.data;
  assert.equal(loan.book, book._id, 'book stays an ID string');
  assert.equal(loan.status, 'issued');
  assert.equal(loan.returnDate, null);
  assert.equal(Date.parse(loan.dueDate) - Date.parse(loan.issueDate), 14 * DAY_MS);

  // Steps 6-8: two returns of the same loan at the same time.
  const returns = await Promise.all([
    api('POST', `/return/${loan._id}`),
    api('POST', `/return/${loan._id}`),
  ]);
  assert.deepEqual(returns.map((result) => result.status).sort(), [200, 409]);
  assert.equal(returns.find((result) => result.status === 409)!.body.error.code, 'ALREADY_RETURNED');
  assert.equal(await copies(), 1);
  const stored = await BorrowRecord.findById(loan._id);
  assert.equal(stored?.status, 'returned');
  assert.ok(stored?.returnDate instanceof Date);

  const repeated = await api('POST', `/return/${loan._id}`);
  assert.equal(repeated.status, 409);
  assert.equal(await copies(), 1, 'a repeated return never restores a second copy');

  // Steps 9-10: unknown member, unknown book, unknown loan.
  const unknownId = new mongoose.Types.ObjectId().toString();
  const unknownMember = await api('POST', '/borrow', { bookId: book._id, memberId: unknownId });
  const unknownBook = await api('POST', '/borrow', { bookId: unknownId, memberId: first._id });
  const unknownLoan = await api('POST', `/return/${unknownId}`);
  assert.deepEqual([unknownMember.status, unknownBook.status, unknownLoan.status], [404, 404, 404]);
  assert.equal(await copies(), 1);

  // Steps 11-12: a test-only injected failure of loan creation cancels the decrement.
  const failure = mock.method(BorrowRecord, 'create', async () => {
    throw new Error('Injected loan creation failure');
  });
  const failed = await api('POST', '/borrow', { bookId: book._id, memberId: first._id });
  failure.mock.restore();
  assert.deepEqual([failed.status, failed.body.error.code], [500, 'INTERNAL_ERROR']);
  assert.equal(JSON.stringify(failed.body).includes('Injected'), false, 'no internal detail in the response');
  assert.equal(await copies(), 1, 'the transaction canceled the decrement');
  assert.equal(await BorrowRecord.countDocuments({ book: book._id }), 1);
});

test('member history is complete and reports the effective status', async () => {
  const member = await createMember('History Member', 'LIB-301');
  const book = await createBook('History Book', '9780374533557', 'History', 5);

  const empty = await api('GET', `/members/${member._id}/history`);
  assert.deepEqual([empty.status, empty.body.data], [200, []]);

  const returned = (await api('POST', '/borrow', { bookId: book._id, memberId: member._id })).body.data;
  await api('POST', `/return/${returned._id}`);
  const open = (await api('POST', '/borrow', { bookId: book._id, memberId: member._id })).body.data;
  // An open loan that is past its due instant. The stored status stays `issued`.
  const issueDate = new Date(Date.now() - 30 * DAY_MS);
  const overdue = await BorrowRecord.create({
    book: book._id,
    member: member._id,
    issueDate,
    dueDate: new Date(issueDate.getTime() + 14 * DAY_MS),
  });

  const history = await api('GET', `/members/${member._id}/history`);
  assert.equal(history.status, 200);
  assert.deepEqual(
    history.body.data.map((record: any) => [record._id, record.status]),
    [[open._id, 'issued'], [returned._id, 'returned'], [String(overdue._id), 'overdue']],
    'newest first, with effective status',
  );
  const record = history.body.data[0];
  assert.equal(record.book, book._id);
  assert.equal(record.member, member._id);
  assert.deepEqual(record.bookDetails, { _id: book._id, title: 'History Book', author: 'Test Author', ISBN: '9780374533557' });
  assert.deepEqual(record.memberDetails, { _id: member._id, name: 'History Member', membershipId: 'LIB-301' });

  const unknown = await api('GET', `/members/${new mongoose.Types.ObjectId()}/history`);
  assert.equal(unknown.status, 404);
  const members = await api('GET', '/members');
  assert.equal(members.body.data.length, 4);
});
