import type { BorrowRecord } from "./types.ts";

export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\/(books|issue|members)(\/|\?|#|$)/.test(value) ||
    /[\\\r\n]/.test(value)
  )
    return "/books";
  return value;
}
export function loanStatus(
  record: Pick<BorrowRecord, "returnDate" | "dueDate">,
  now = Date.now(),
): BorrowRecord["status"] {
  return record.returnDate !== null
    ? "returned"
    : Date.parse(record.dueDate) < now
      ? "overdue"
      : "issued";
}
export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export const dateZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
