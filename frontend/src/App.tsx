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
import { motion } from "framer-motion";
import { useAuth } from "./auth/AuthContext";
import { block, page } from "./motion";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Icon } from "./components/Icon";
import { BooksPage } from "./pages/BooksPage";
import { IssuePage } from "./pages/IssuePage";
import { MembersPage } from "./pages/MembersPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LoginPage } from "./pages/LoginPage";

// One navigation link. The green pill is one shared element:
// it slides from the previous active link to the new one.
function NavItem({
  to,
  icon,
  label,
  number,
}: {
  to: string;
  icon: "books" | "issue" | "members";
  label: string;
  number: string;
}) {
  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-pill"
              className="nav-pill"
              transition={{ type: "spring", stiffness: 460, damping: 38 }}
            />
          )}
          <Icon name={icon} />
          <span>{label}</span>
          <span className="nav-number">{number}</span>
        </>
      )}
    </NavLink>
  );
}

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
          <NavItem to="/books" icon="books" label="Catalog" number="01" />
          <NavItem to="/issue" icon="issue" label="Issue book" number="02" />
          <NavItem to="/members" icon="members" label="Members" number="03" />
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
        <motion.main
          id="main"
          ref={main}
          tabIndex={-1}
          key={location.pathname}
          variants={page}
          initial="hidden"
          animate="show"
        >
          <Outlet />
        </motion.main>
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
          <motion.div
            className="not-found"
            variants={block}
            initial="hidden"
            animate="show"
          >
            <span className="eyebrow">ShelfLife / 404</span>
            <h1>Out of circulation.</h1>
            <p>This page isn’t in our collection.</p>
            <Link className="button" to="/books">
              Back to catalog <Icon name="arrow" />
            </Link>
          </motion.div>
        }
      />
    </Routes>
  );
}
