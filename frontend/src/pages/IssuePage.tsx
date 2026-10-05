import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../auth/AuthContext";
import { useResource } from "../hooks";
import { ApiError, errorMessage } from "../api";
import { dateZone, formatDate } from "../logic";
import type { Book, BorrowRecord, Member } from "../types";
import { Select } from "../components/Select";
import { Icon } from "../components/Icon";
import { Feedback } from "../components/Feedback";
import { Toast } from "../components/Toast";
import type { Notice } from "../components/Toast";
import { block, ease } from "../motion";

export function IssuePage() {
  const { api } = useAuth();
  const [search] = useSearchParams();
  const [bookId, setBookId] = useState(search.get("book") ?? "");
  const [memberId, setMemberId] = useState(search.get("member") ?? "");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<{
    record: BorrowRecord;
    book: Book;
    member: Member;
  } | null>(null);
  const options = useResource(
    async (signal) => {
      const [books, members] = await Promise.all([
        api.allBooks(signal),
        api.members(signal),
      ]);
      return {
        books: books.filter((book) => book.availableCopies > 0),
        members: members.data,
      };
    },
    [api],
  );
  const book = options.data?.books.find((item) => item._id === bookId);
  const member = options.data?.members.find((item) => item._id === memberId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !book || !member) return;
    setPending(true);
    setNotice(null);
    setFields({});
    try {
      const { data } = await api.issue({ bookId, memberId });
      setReceipt({ record: data, book, member });
      setBookId("");
      options.reload();
      setNotice({
        type: "success",
        message: `Book issued to ${member.name}. Due ${formatDate(data.dueDate)}.`,
      });
    } catch (cause) {
      setNotice({ type: "error", message: errorMessage(cause) });
      if (cause instanceof ApiError) {
        setFields(cause.fields);
        if (cause.status === 409) {
          setBookId("");
          options.reload();
        }
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <motion.header className="page-heading" variants={block}>
        <div>
          <span className="eyebrow">02 / Circulation</span>
          <h1>
            Start a new <em>chapter.</em>
          </h1>
          <p>A good book is better in someone’s hands.</p>
        </div>
        <span className="heading-note">THE LENDING DESK</span>
      </motion.header>
      <Feedback
        loading={options.loading && !options.data}
        error={options.error}
        retry={options.reload}
      >
        <div className="issue-layout">
          <motion.section
            className="issue-form-panel"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease }}
          >
            <div className="section-heading">
              <span className="section-number">01</span>
              <div>
                <h2>Make the connection.</h2>
                <p>Choose a reader and an available book.</p>
              </div>
            </div>
            <form onSubmit={submit}>
              <fieldset disabled={pending || options.loading}>
                <Select<Member>
                  id="member"
                  label="Member"
                  items={options.data?.members ?? []}
                  value={member ? memberId : ""}
                  getValue={(item) => item._id}
                  getLabel={(item) => `${item.name} · ${item.membershipId}`}
                  onChange={(value) => {
                    setMemberId(value);
                    setReceipt(null);
                  }}
                  error={fields.memberId}
                />
                <Select<Book>
                  id="book"
                  label="Book"
                  items={options.data?.books ?? []}
                  value={book ? bookId : ""}
                  getValue={(item) => item._id}
                  getLabel={(item) =>
                    `${item.title} · ${item.availableCopies} available`
                  }
                  onChange={(value) => {
                    setBookId(value);
                    setReceipt(null);
                  }}
                  error={fields.bookId}
                />
                <div className="loan-policy">
                  <span>Loan period</span>
                  <strong>14 days</strong>
                </div>
                <p className="form-note">
                  The due date is set when the book is issued. Availability is
                  checked again at confirmation.
                </p>
                {options.data?.members.length === 0 && (
                  <p className="form-error">
                    Register a member before issuing a book.{" "}
                    <Link to="/members">Go to members</Link>
                  </p>
                )}
                {options.data?.books.length === 0 && (
                  <p className="form-error">
                    No copies are available to issue.{" "}
                    <Link to="/books">View the catalog</Link>
                  </p>
                )}
                <button
                  className="button issue-submit"
                  disabled={pending || options.loading || !book || !member}
                >
                  {pending ? "Issuing book…" : "Confirm & issue book"}
                  <Icon name="arrow" />
                </button>
              </fieldset>
            </form>
            <div className="issue-footnote">
              <Icon name="books" size={18} />
              <span>One book. A world of possibilities.</span>
            </div>
          </motion.section>
          {/* The slip lies at a small angle and straightens on hover or confirmation. */}
          <motion.aside
            className={`lending-slip ${receipt ? "slip-confirmed" : ""}`}
            aria-label={receipt ? "Issue confirmation" : "Lending slip preview"}
            initial={{ opacity: 0, x: 28, rotate: 4 }}
            animate={{ opacity: 1, x: 0, rotate: receipt ? 0 : 1 }}
            whileHover={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
          >
            <div className="slip-top">
              <span>SHELFLIFE</span>
              <Icon name="books" size={24} />
            </div>
            <div className="slip-title">
              <span className="eyebrow">
                {receipt ? "Issue confirmed" : "Live preview"}
              </span>
              <h2>Lending slip</h2>
            </div>
            <div className="slip-book">
              <span className="slip-label">TITLE</span>
              {/* The previous title leaves before the next title enters. */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={receipt?.book._id ?? book?._id ?? "empty"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease }}
                >
                  <h3>
                    {receipt?.book.title ??
                      book?.title ??
                      "A story waiting\nto be chosen."}
                  </h3>
                  <p>
                    {receipt?.book.author ??
                      book?.author ??
                      "Select a book to begin"}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
            <dl>
              <div>
                <dt>ISSUED TO</dt>
                <dd>
                  {receipt?.member.name ?? member?.name ?? "Your next reader"}
                </dd>
                <small>
                  {receipt?.member.membershipId ?? member?.membershipId ?? "—"}
                </small>
              </div>
              <div className="slip-dates">
                <div>
                  <dt>{receipt ? "ISSUE DATE" : "LOAN PERIOD"}</dt>
                  <dd>
                    {receipt ? formatDate(receipt.record.issueDate) : "14 days"}
                  </dd>
                </div>
                <div>
                  <dt>{receipt ? "DUE DATE" : "RETURN BY"}</dt>
                  <dd>
                    {receipt
                      ? formatDate(receipt.record.dueDate)
                      : "Set on issue"}
                  </dd>
                </div>
              </div>
            </dl>
            <div className="slip-bottom">
              {receipt ? (
                <>
                  {/* The stamp lands from above the slip and settles at its angle. */}
                  <motion.span
                    className="confirmed-stamp"
                    initial={{ opacity: 0, scale: 2.4, rotate: -16 }}
                    animate={{ opacity: 1, scale: 1, rotate: -4 }}
                    transition={{ type: "spring", stiffness: 520, damping: 19, delay: 0.12 }}
                  >
                    <Icon name="check" size={17} />
                    ISSUED
                  </motion.span>
                  <Link to={`/members/${receipt.member._id}/history`}>
                    View member history <Icon name="arrow" size={16} />
                  </Link>
                </>
              ) : (
                <>
                  <span>HANDLE WITH CURIOSITY.</span>
                  <span>RETURN WITH CARE.</span>
                </>
              )}
            </div>
            {receipt && (
              <p className="timezone-note">Dates shown in {dateZone}.</p>
            )}
          </motion.aside>
        </div>
      </Feedback>
      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
