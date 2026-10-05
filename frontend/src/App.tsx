import { useEffect, useRef } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Icon } from "./components/Icon";
import { BooksPage } from "./pages/BooksPage";
import { IssuePage } from "./pages/IssuePage";
import { MembersPage } from "./pages/MembersPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LoginPage } from "./pages/LoginPage";

function Shell() {
  const { logout } = useAuth();
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  const section = location.pathname.startsWith("/members")
    ? "Members"
    : location.pathname === "/issue"
      ? "Circulation"
      : "Catalog";
  useEffect(() => {
    document.title = `${section} · ShelfLife`;
    if (!first.current) main.current?.focus({ preventScroll: true });
    first.current = false;
    window.scrollTo(0, 0);
  }, [location.pathname, section]);
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link to="/books" className="brand" aria-label="ShelfLife catalog">
          <span className="brand-mark">
            <Icon name="books" size={26} />
          </span>
          <span>
            ShelfLife<span className="brand-sub">THE COLLEGE LIBRARY</span>
          </span>
        </Link>
        <div className="sidebar-section eyebrow">Your workspace</div>
        <nav className="navigation" aria-label="Main navigation">
          <NavLink to="/books">
            <Icon name="books" />
            <span>Catalog</span>
            <span className="nav-number">01</span>
          </NavLink>
          <NavLink to="/issue">
            <Icon name="issue" />
            <span>Issue book</span>
            <span className="nav-number">02</span>
          </NavLink>
          <NavLink to="/members">
            <Icon name="members" />
            <span>Members</span>
            <span className="nav-number">03</span>
          </NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="desk-label">
            <span className="status-dot" />
            Librarian workspace
          </div>
          <p>
            A place for every book.
            <br />A book for every reader.
          </p>
          <button className="logout" onClick={logout}>
            <Icon name="logout" size={17} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            Library desk <span>/</span> <strong>{section}</strong>
          </span>
          <span className="topbar-date">
            {new Date().toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <button
            className="mobile-logout icon-button"
            aria-label="Sign out"
            onClick={logout}
          >
            <Icon name="logout" />
          </button>
        </header>
        <main id="main" ref={main} tabIndex={-1} key={location.pathname}>
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>ShelfLife</span>
          <span>Good books. In good hands.</span>
        </footer>
      </div>
    </div>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route path="/books" element={<BooksPage />} />
          <Route path="/issue" element={<IssuePage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/members/:id/history" element={<HistoryPage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/books" replace />} />
      <Route
        path="*"
        element={
          <div className="not-found">
            <span className="eyebrow">ShelfLife / 404</span>
            <h1>Out of circulation.</h1>
            <p>This page isn’t in our collection.</p>
            <Link className="button" to="/books">
              Back to catalog <Icon name="arrow" />
            </Link>
          </div>
        }
      />
    </Routes>
  );
}
