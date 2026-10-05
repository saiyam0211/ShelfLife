import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError, errorMessage } from "../api";
import { safeReturnPath } from "../logic";
import { Icon } from "../components/Icon";

export function LoginPage() {
  const { token, api, login } = useAuth();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  if (token)
    return <Navigate to={safeReturnPath(location.state?.from)} replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    setFields({});
    try {
      const response = await api.login({
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
      });
      login(response.data.token);
    } catch (cause) {
      setError(errorMessage(cause));
      if (cause instanceof ApiError) setFields(cause.fields);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand light">
          <span className="brand-mark">
            <Icon name="books" size={29} />
          </span>
          <span>
            ShelfLife<span className="brand-sub">THE COLLEGE LIBRARY</span>
          </span>
        </div>
        <div className="login-statement">
          <span className="eyebrow">Your everyday library desk</span>
          <h1>
            Good books.
            <br />
            In good <em>hands.</em>
          </h1>
          <p>
            Keep the shelves in order,
            <br />
            and the stories moving.
          </p>
        </div>
        <div className="login-colophon">
          <span>CATALOG</span>
          <span>CIRCULATION</span>
          <span>COMMUNITY</span>
        </div>
      </section>
      <section className="login-form-side">
        <div className="login-form-wrap">
          <span className="eyebrow">Librarian access</span>
          <h2>
            Welcome to
            <br />
            your library.
          </h2>
          <p className="muted">Sign in to pick up where you left off.</p>
          <form onSubmit={submit}>
            <fieldset disabled={pending}>
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@college.edu"
                  required
                  maxLength={254}
                  aria-invalid={!!fields.email}
                  aria-describedby={fields.email ? "email-error" : undefined}
                />
                {fields.email && (
                  <small id="email-error" className="field-error">
                    {fields.email}
                  </small>
                )}
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  maxLength={200}
                  aria-invalid={!!fields.password}
                  aria-describedby={
                    fields.password ? "password-error" : undefined
                  }
                />
                {fields.password && (
                  <small id="password-error" className="field-error">
                    {fields.password}
                  </small>
                )}
              </div>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="button login-submit" disabled={pending}>
                {pending ? "Signing in…" : "Enter the library"}
                <Icon name="arrow" />
              </button>
            </fieldset>
          </form>
          <p className="login-note">
            A dedicated workspace for your college library.
          </p>
        </div>
        <div className="login-bottom">
          ShelfLife <span>Made for the way libraries work.</span>
        </div>
      </section>
    </div>
  );
}
