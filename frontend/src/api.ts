import type {
  Book,
  BorrowInput,
  BorrowRecord,
  CreateBookInput,
  CreateMemberInput,
  HistoryRecord,
  LoginInput,
  LoginResult,
  Member,
  PageResult,
  Result,
} from "./types.ts";

export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;
  constructor(
    status: number,
    code: string,
    message: string,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const strings = (value: Record<string, unknown>, keys: string[]) =>
  keys.every((key) => typeof value[key] === "string");
const book = (v: unknown): v is Book =>
  object(v) &&
  strings(v, ["_id", "title", "author", "ISBN", "genre"]) &&
  Number.isInteger(v.totalCopies) &&
  Number.isInteger(v.availableCopies);
const member = (v: unknown): v is Member =>
  object(v) &&
  strings(v, ["_id", "name", "email", "membershipId", "joinedDate"]);
const loan = (v: unknown): v is BorrowRecord =>
  object(v) &&
  strings(v, ["_id", "book", "member", "issueDate", "dueDate"]) &&
  (v.returnDate === null || typeof v.returnDate === "string") &&
  ["issued", "returned", "overdue"].includes(String(v.status));
const history = (v: unknown): v is HistoryRecord =>
  loan(v) &&
  "bookDetails" in v &&
  object(v.bookDetails) &&
  strings(v.bookDetails, ["_id", "title", "author", "ISBN"]) &&
  "memberDetails" in v &&
  object(v.memberDetails) &&
  strings(v.memberDetails, ["_id", "name", "membershipId"]);
const array =
  <T>(check: (v: unknown) => v is T) =>
  (v: unknown): v is T[] =>
    Array.isArray(v) && v.every(check);
const result =
  <T>(check: (v: unknown) => v is T) =>
  (v: unknown): v is Result<T> =>
    object(v) && check(v.data);
const bookPage = (v: unknown): v is PageResult<Book> =>
  object(v) &&
  array(book)(v.data) &&
  object(v.pagination) &&
  ["page", "limit", "total", "totalPages"].every((key) =>
    Number.isInteger((v.pagination as Record<string, unknown>)[key]),
  );
const loginResult = (v: unknown): v is LoginResult =>
  object(v) &&
  typeof v.token === "string" &&
  v.token.length > 0 &&
  typeof v.expiresIn === "number";

export function createApi(
  token: string | null,
  onUnauthorized: () => void,
  base = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000/api",
) {
  const root = base.replace(/\/$/, "");
  async function request<T>(
    path: string,
    check: (v: unknown) => v is T,
    signal?: AbortSignal,
    body?: unknown,
    post = false,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${root}${path}`, {
        method: post ? "POST" : "GET",
        signal,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      if (
        signal?.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      )
        throw error;
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        "Cannot reach the library. Check your connection and try again.",
      );
    }
    if (response.status === 401 && token) onUnauthorized();
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError(
        response.status,
        "INVALID_RESPONSE",
        "The library returned an unreadable response. Please try again.",
      );
    }
    if (!response.ok) {
      const error =
        object(payload) && object(payload.error) ? payload.error : {};
      const fields = object(error.fields)
        ? Object.fromEntries(
            Object.entries(error.fields).filter(
              (entry): entry is [string, string] =>
                typeof entry[1] === "string",
            ),
          )
        : {};
      throw new ApiError(
        response.status,
        typeof error.code === "string" ? error.code : "REQUEST_FAILED",
        typeof error.message === "string"
          ? error.message
          : "This request could not be completed. Please try again.",
        fields,
      );
    }
    if (!check(payload))
      throw new ApiError(
        response.status,
        "INVALID_RESPONSE",
        "The library returned incomplete data. Please try again.",
      );
    return payload;
  }
  const books = (
    options: { page?: number; limit?: number; q?: string; genre?: string } = {},
    signal?: AbortSignal,
  ) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(options))
      if (String(value).trim()) query.set(key, String(value).trim());
    return request(`/books?${query}`, bookPage, signal);
  };
  return {
    login: (input: LoginInput) =>
      request("/auth/login", result(loginResult), undefined, input, true),
    books,
    genres: (signal?: AbortSignal) =>
      request(
        "/books/genres",
        result(array((v): v is string => typeof v === "string")),
        signal,
      ),
    members: (signal?: AbortSignal) =>
      request("/members", result(array(member)), signal),
    history: (id: string, signal?: AbortSignal) =>
      request(
        `/members/${encodeURIComponent(id)}/history`,
        result(array(history)),
        signal,
      ),
    createBook: (input: CreateBookInput) =>
      request("/books", result(book), undefined, input, true),
    createMember: (input: CreateMemberInput) =>
      request("/members", result(member), undefined, input, true),
    issue: (input: BorrowInput) =>
      request("/borrow", result(loan), undefined, input, true),
    returnBook: (id: string) =>
      request(
        `/return/${encodeURIComponent(id)}`,
        result(loan),
        undefined,
        undefined,
        true,
      ),
    async allBooks(signal?: AbortSignal): Promise<Book[]> {
      // ponytail: load one college's catalog for native selection; use paginated search at network scale.
      const first = await books({ page: 1, limit: 100 }, signal);
      const items = [...first.data];
      for (let page = 2; page <= first.pagination.totalPages; page++)
        items.push(...(await books({ page, limit: 100 }, signal)).data);
      return items;
    },
  };
}
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
