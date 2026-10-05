import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../auth/AuthContext";
import { useResource } from "../hooks";
import { Icon } from "../components/Icon";
import { Feedback } from "../components/Feedback";
import { CreateDialog } from "../components/CreateDialog";
import { Toast } from "../components/Toast";
import type { Notice } from "../components/Toast";
import { block, ease, row } from "../motion";

export function BooksPage() {
  const { api } = useAuth();
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [page, setPage] = useState(1);
  const [create, setCreate] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const list = useResource(
    (signal) => api.books({ q: query, genre, page, limit: 10 }, signal),
    [api, query, genre, page],
  );
  const genres = useResource((signal) => api.genres(signal), [api]);
  const pagination = list.data?.pagination;
  // Show placeholders for the first request only. Later requests keep the
  // previous rows on screen, dimmed, so typing does not make the list blink.
  const firstLoad = list.loading && !list.data;
  const firstIndex = pagination ? (pagination.page - 1) * pagination.limit : 0;
  return (
    <>
      <motion.header className="page-heading" variants={block}>
        <div>
          <span className="eyebrow">01 / The collection</span>
          <h1>
            Between the <em>shelves.</em>
          </h1>
          <p>Find the next great read. Keep every copy accounted for.</p>
        </div>
        <button className="button" onClick={() => setCreate(true)}>
          <Icon name="plus" size={18} />
          Add book
        </button>
      </motion.header>
      <motion.div className="catalog-tools" variants={block}>
        <div className="search-field">
          <Icon name="search" />
          <label className="sr-only" htmlFor="book-search">
            Search by title
          </label>
          <input
            id="book-search"
            type="search"
            placeholder="Find a book by title…"
            value={query}
            maxLength={200}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="genre-field">
          <label htmlFor="genre">Genre</label>
          <select
            id="genre"
            value={genre}
            disabled={genres.loading || !!genres.error}
            onChange={(event) => {
              setGenre(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All genres</option>
            {genres.data?.data.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </motion.div>
      {genres.error && (
        <div className="inline-error" role="alert">
          Genre filters are unavailable.{" "}
          <button className="text-button" onClick={genres.reload}>
            Try again
          </button>
        </div>
      )}
      <motion.section
        className="collection"
        aria-label="Book collection"
        aria-busy={list.loading}
        variants={block}
      >
        <div className="collection-caption">
          <span>
            {list.loading
              ? "Updating collection"
              : `${pagination?.total ?? 0} ${pagination?.total === 1 ? "title" : "titles"}${query || genre ? " found" : " in the collection"}`}
          </span>
          <span>ALPHABETICAL / A–Z</span>
        </div>
        <Feedback
          loading={firstLoad}
          error={list.error}
          retry={list.reload}
          empty={
            list.data?.data.length === 0
              ? query || genre
                ? "No matching titles."
                : "Your collection starts here."
              : undefined
          }
        >
          {list.data?.data.length === 0 && (
            <p className="muted">
              {query || genre
                ? "Try a different title or genre."
                : "Add your first book to open the shelves."}
            </p>
          )}
          {!list.error && !!list.data?.data.length && (
            <div
              className={`book-table-wrap${list.loading ? " is-refreshing" : ""}`}
            >
              <table className="book-table">
                <thead>
                  <tr>
                    <th scope="col">Book / Author</th>
                    <th scope="col">Genre</th>
                    <th scope="col">Availability</th>
                    <th scope="col">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.data.map((book, index) => (
                    <motion.tr
                      key={book._id}
                      variants={row}
                      custom={index}
                      initial="hidden"
                      animate="show"
                    >
                      <td>
                        <div className="book-identity">
                          <span className="book-index" aria-hidden="true">
                            {String(firstIndex + index + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <h2>{book.title}</h2>
                            <p>{book.author}</p>
                            <span className="isbn">ISBN {book.ISBN}</span>
                            <span className="mobile-genre">{book.genre}</span>
                          </div>
                        </div>
                      </td>
                      <td className="book-genre">
                        <span className="genre-tag">{book.genre}</span>
                      </td>
                      <td>
                        <span
                          className={`availability ${book.availableCopies === 0 ? "unavailable" : ""}`}
                        >
                          <span className="status-dot" />
                          {book.availableCopies > 0
                            ? `${book.availableCopies} available`
                            : "All on loan"}
                        </span>
                        <span className="copy-total">
                          of {book.totalCopies}{" "}
                          {book.totalCopies === 1 ? "copy" : "copies"}
                        </span>
                        {/* Share of copies on the shelf. The text above carries the same fact. */}
                        <span className="copy-meter" aria-hidden="true">
                          <motion.span
                            initial={{ scaleX: 0 }}
                            animate={{
                              scaleX: book.availableCopies / book.totalCopies,
                            }}
                            transition={{
                              duration: 0.6,
                              ease,
                              delay: 0.15 + Math.min(index, 12) * 0.035,
                            }}
                          />
                        </span>
                      </td>
                      <td className="book-action">
                        {book.availableCopies > 0 ? (
                          <Link
                            className="row-action"
                            to={`/issue?book=${book._id}`}
                            aria-label={`Issue ${book.title}`}
                          >
                            <span>Issue</span>
                            <Icon name="arrow" size={18} />
                          </Link>
                        ) : (
                          <span className="unavailable-label">Unavailable</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Feedback>
      </motion.section>
      {!list.error && !!pagination?.total && (
        <motion.div className="pagination" variants={block}>
          <span>
            Showing {firstIndex + 1}–
            {Math.min(firstIndex + pagination.limit, pagination.total)} of{" "}
            {pagination.total} titles
          </span>
          <div>
            <button
              className="pagination-button"
              disabled={page === 1}
              aria-label="Previous page"
              onClick={() => setPage((value) => value - 1)}
            >
              ←
            </button>
            <span>
              Page{" "}
              <motion.span
                key={pagination.page}
                className="page-number"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease }}
              >
                {pagination.page}
              </motion.span>{" "}
              <span className="muted">of {pagination.totalPages}</span>
            </span>
            <button
              className="pagination-button"
              disabled={page >= pagination.totalPages}
              aria-label="Next page"
              onClick={() => setPage((value) => value + 1)}
            >
              →
            </button>
          </div>
        </motion.div>
      )}
      <AnimatePresence>
        {create && (
          <CreateDialog
            kind="book"
            onClose={() => setCreate(false)}
            onCreated={() => {
              list.reload();
              genres.reload();
              setNotice({
                type: "success",
                message: "A new title joins the shelves. Book added.",
              });
            }}
          />
        )}
      </AnimatePresence>
      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
