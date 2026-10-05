import assert from "node:assert/strict";
import test from "node:test";
import { createApi, ApiError } from "../src/api.ts";
import { loanStatus, safeReturnPath } from "../src/logic.ts";

// Pure rules and the actual fetch client: no permanent application mock.
test("only local application destinations survive login redirects", () => {
  assert.equal(
    safeReturnPath("/members/abc/history?view=loans"),
    "/members/abc/history?view=loans",
  );
  for (const destination of [
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/login",
    null,
    "/books\n",
  ])
    assert.equal(safeReturnPath(destination), "/books");
  assert.equal(safeReturnPath("/issue?book=123"), "/issue?book=123");
});

test("overdue status follows the instant and never marks returned loans overdue", () => {
  const now = Date.parse("2026-10-05T12:00:00Z");
  assert.equal(
    loanStatus({ dueDate: "2026-10-05T11:59:59Z", returnDate: null }, now),
    "overdue",
  );
  assert.equal(
    loanStatus({ dueDate: "2026-10-05T12:00:00Z", returnDate: null }, now),
    "issued",
  );
  assert.equal(
    loanStatus({ dueDate: "2026-10-06T00:00:00Z", returnDate: null }, now),
    "issued",
  );
  assert.equal(
    loanStatus(
      { dueDate: "2026-10-04T00:00:00Z", returnDate: "2026-10-05T00:00:00Z" },
      now,
    ),
    "returned",
  );
});

test("client checks envelopes, sends typed input, handles auth/errors, and reaches every option page", async () => {
  const original = globalThis.fetch;
  let unauthorized = 0;
  const api = createApi(
    "test-token",
    () => unauthorized++,
    "http://localhost:3000/api",
  );
  const book = {
    _id: "one",
    title: "A book",
    author: "An author",
    ISBN: "9780132350884",
    genre: "Technology",
    totalCopies: 1,
    availableCopies: 1,
  };
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  try {
    const pages: string[] = [];
    globalThis.fetch = async (input, init) => {
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        "Bearer test-token",
      );
      const url = new URL(String(input));
      pages.push(url.searchParams.get("page") ?? "");
      return json({
        data: [{ ...book, _id: url.searchParams.get("page") }],
        pagination: {
          page: Number(url.searchParams.get("page")),
          limit: 100,
          total: 101,
          totalPages: 2,
        },
      });
    };
    assert.equal((await api.allBooks()).length, 2);
    assert.deepEqual(pages, ["1", "2"]);
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.has("q"), false);
      assert.equal(url.searchParams.has("genre"), false);
      return json({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    };
    await api.books({ q: " ", genre: "", page: 1 });
    globalThis.fetch = async () => json({ data: [{}] });
    await assert.rejects(
      api.members(),
      (error: unknown) =>
        error instanceof ApiError && error.code === "INVALID_RESPONSE",
    );
    globalThis.fetch = async () =>
      json({ error: { code: "INVALID_TOKEN", message: "Expired" } }, 401);
    await assert.rejects(
      api.members(),
      (error: unknown) => error instanceof ApiError && error.status === 401,
    );
    assert.equal(unauthorized, 1);
    globalThis.fetch = async () =>
      json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            fields: { ISBN: "Invalid ISBN" },
          },
        },
        400,
      );
    await assert.rejects(
      api.createBook({
        title: "Book",
        author: "Author",
        ISBN: "bad",
        genre: "Fiction",
        totalCopies: 1,
      }),
      (error: unknown) =>
        error instanceof ApiError && error.fields.ISBN === "Invalid ISBN",
    );
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(
      api.members(),
      (error: unknown) =>
        error instanceof ApiError && error.code === "NETWORK_ERROR",
    );
    const controller = new AbortController();
    controller.abort();
    globalThis.fetch = async () => {
      throw new DOMException("Aborted", "AbortError");
    };
    await assert.rejects(
      api.members(controller.signal),
      (error: unknown) =>
        error instanceof DOMException && error.name === "AbortError",
    );
  } finally {
    globalThis.fetch = original;
  }
});
