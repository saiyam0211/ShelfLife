import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useResource } from "../hooks";
import { Icon } from "../components/Icon";
import { Feedback } from "../components/Feedback";
import { CreateDialog } from "../components/CreateDialog";
import { Toast } from "../components/Toast";
import type { Notice } from "../components/Toast";

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
  return (
    <>
      <header className="page-heading">
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
      </header>
      <div className="catalog-tools">
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
      </div>
      {genres.error && (
        <div className="inline-error" role="alert">
          Genre filters are unavailable.{" "}
          <button className="text-button" onClick={genres.reload}>
            Try again
          </button>
        </div>
      )}
      <section className="collection" aria-label="Book collection">
        <div className="collection-caption">
          <span>
            {list.loading
              ? "Updating collection"
              : `${pagination?.total ?? 0} ${pagination?.total === 1 ? "title" : "titles"}${query || genre ? " found" : " in the collection"}`}
          </span>
          <span>ALPHABETICAL / A–Z</span>
        </div>
        <Feedback
          loading={list.loading}
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
          {!list.loading && !list.error && !!list.data?.data.length && (
            <div className="book-table-wrap">
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
                    <tr key={book._id}>
                      <td>
                        <div className="book-identity">
                          <span className="book-index" aria-hidden="true">
                            {String((page - 1) * 10 + index + 1).padStart(
                              2,
                              "0",
                            )}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Feedback>
      </section>
      {!list.loading && !list.error && !!pagination?.total && (
        <div className="pagination">
          <span>
            Showing {(page - 1) * 10 + 1}–
            {Math.min(page * 10, pagination.total)} of {pagination.total} titles
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
              Page {page}{" "}
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
        </div>
      )}
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
      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
