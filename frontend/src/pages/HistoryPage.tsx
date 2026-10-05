import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useResource } from "../hooks";
import { ApiError, errorMessage } from "../api";
import { dateZone, formatDate, loanStatus } from "../logic";
import { Icon } from "../components/Icon";
import { Feedback } from "../components/Feedback";
import { Toast } from "../components/Toast";
import type { Notice } from "../components/Toast";

export function HistoryPage() {
  const { id = "" } = useParams();
  const { api } = useAuth();
  const [now, setNow] = useState(Date.now());
  const [pending, setPending] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const history = useResource(
    async (signal) => {
      const [records, members] = await Promise.all([
        api.history(id, signal),
        api.members(signal),
      ]);
      return {
        records: records.data,
        member: members.data.find((member) => member._id === id),
      };
    },
    [api, id],
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  async function returnBook(borrowId: string) {
    if (pending) return;
    setPending(borrowId);
    setNotice(null);
    try {
      await api.returnBook(borrowId);
      history.reload();
      setNotice({
        type: "success",
        message: "Book returned. One more copy back on the shelf.",
      });
    } catch (cause) {
      setNotice({ type: "error", message: errorMessage(cause) });
      if (cause instanceof ApiError && cause.status === 409) history.reload();
    } finally {
      setPending("");
    }
  }
  const member = history.data?.member;
  const records = history.data?.records ?? [];
  const open = records.filter((record) => !record.returnDate).length;
  const overdue = records.filter(
    (record) => loanStatus(record, now) === "overdue",
  ).length;
  return (
    <>
      <Link to="/members" className="back-link">
        ← All members
      </Link>
      <header className="page-heading history-heading">
        <div>
          <span className="eyebrow">Member / Reading history</span>
          <h1>
            {member?.name ?? "Reading history"}
            <span className="title-period">.</span>
          </h1>
          {member && (
            <p>
              <span className="isbn">{member.membershipId}</span>
              <span className="detail-separator">/</span>
              {member.email}
            </p>
          )}
        </div>
        {member && (
          <Link to={`/issue?member=${member._id}`} className="button">
            <Icon name="plus" size={18} />
            Issue a book
          </Link>
        )}
      </header>
      <Feedback
        loading={history.loading}
        error={history.error}
        retry={history.reload}
      >
        <div className="ledger-summary">
          <div>
            <strong>{records.length}</strong>
            <span>Lifetime loans</span>
          </div>
          <div>
            <strong>{open}</strong>
            <span>Currently reading</span>
          </div>
          <div className={overdue ? "overdue-text" : ""}>
            <strong>{overdue}</strong>
            <span>Overdue</span>
          </div>
        </div>
        <section className="collection">
          <div className="collection-caption">
            <span>The circulation ledger</span>
            <span>NEWEST FIRST</span>
          </div>
          {records.length === 0 ? (
            <Feedback empty="A story yet to begin.">
              <p className="muted">This member hasn’t borrowed a book yet.</p>
            </Feedback>
          ) : (
            <div className="history-list">
              {records.map((record) => {
                const status = loanStatus(record, now);
                return (
                  <article className={`loan-row ${status}`} key={record._id}>
                    <div className="loan-title">
                      <span className={`badge ${status}`}>
                        {status === "overdue"
                          ? "Overdue"
                          : status === "returned"
                            ? "Returned"
                            : "On loan"}
                      </span>
                      <h2>{record.bookDetails.title}</h2>
                      <p>{record.bookDetails.author}</p>
                      <span className="isbn">
                        {record.memberDetails.membershipId} · ISBN{" "}
                        {record.bookDetails.ISBN}
                      </span>
                    </div>
                    <dl className="loan-dates">
                      <div>
                        <dt>Issued</dt>
                        <dd>{formatDate(record.issueDate)}</dd>
                      </div>
                      <div>
                        <dt>Due</dt>
                        <dd>{formatDate(record.dueDate)}</dd>
                      </div>
                      <div>
                        <dt>Returned</dt>
                        <dd>
                          {record.returnDate
                            ? formatDate(record.returnDate)
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                    <div className="return-action">
                      {record.returnDate ? (
                        <span className="return-complete">
                          <Icon name="check" size={18} />
                          Back on shelf
                        </span>
                      ) : (
                        <button
                          className="button secondary"
                          disabled={!!pending}
                          onClick={() => returnBook(record._id)}
                        >
                          {pending === record._id
                            ? "Returning…"
                            : "Return book"}
                          <Icon name="arrow" size={16} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <p className="timezone-note">
          Dates shown in {dateZone}. A loan becomes overdue after its exact due
          time.
        </p>
      </Feedback>
      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
