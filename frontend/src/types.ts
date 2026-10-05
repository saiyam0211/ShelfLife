// One college library; dates are ISO UTC strings and references remain IDs.
export interface Book {
  _id: string;
  title: string;
  author: string;
  ISBN: string;
  genre: string;
  totalCopies: number;
  availableCopies: number;
}
export interface Member {
  _id: string;
  name: string;
  email: string;
  membershipId: string;
  joinedDate: string;
}
export interface BorrowRecord {
  _id: string;
  book: string;
  member: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  status: "issued" | "returned" | "overdue";
}
export type BookSummary = Pick<Book, "_id" | "title" | "author" | "ISBN">;
export type MemberSummary = Pick<Member, "_id" | "name" | "membershipId">;
export type HistoryRecord = BorrowRecord & {
  bookDetails: BookSummary;
  memberDetails: MemberSummary;
};
export type CreateBookInput = Omit<Book, "_id" | "availableCopies">;
export type CreateMemberInput = Omit<Member, "_id" | "joinedDate">;
export interface BorrowInput {
  bookId: string;
  memberId: string;
}
export interface LoginInput {
  email: string;
  password: string;
}
export interface LoginResult {
  token: string;
  expiresIn: number;
}
export interface Result<T> {
  data: T;
}
export interface PageResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}
