import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError, errorMessage } from "../api";
import { Icon } from "./Icon";

export function CreateDialog({
  kind,
  onClose,
  onCreated,
}: {
  kind: "book" | "member";
  onClose: () => void;
  onCreated: () => void;
}) {
  const { api } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  const controls =
    kind === "book"
      ? [
          {
            name: "title",
            label: "Book title",
            placeholder: "The title on the cover",
            max: 200,
          },
          {
            name: "author",
            label: "Author",
            placeholder: "Author’s full name",
            max: 200,
          },
          {
            name: "ISBN",
            label: "ISBN",
            placeholder: "10 or 13 digits",
            max: 32,
          },
          {
            name: "genre",
            label: "Genre",
            placeholder: "For example, Fiction",
            max: 80,
          },
          {
            name: "totalCopies",
            label: "Total copies",
            placeholder: "1",
            type: "number",
            max: 6,
          },
        ]
      : [
          {
            name: "name",
            label: "Full name",
            placeholder: "Member’s full name",
            max: 200,
          },
          {
            name: "email",
            label: "Email address",
            placeholder: "member@college.edu",
            type: "email",
            max: 254,
          },
          {
            name: "membershipId",
            label: "Membership ID",
            placeholder: "For example, LIB-004",
            max: 80,
          },
        ];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const values = new FormData(event.currentTarget);
    const value = (name: string) => String(values.get(name) ?? "").trim();
    const blanks = Object.fromEntries(
      controls
        .filter((control) => !value(control.name))
        .map((control) => [control.name, "Enter a value."]),
    );
    setFields(blanks);
    setError("");
    if (Object.keys(blanks).length) return;
    setPending(true);
    try {
      if (kind === "book")
        await api.createBook({
          title: value("title"),
          author: value("author"),
          ISBN: value("ISBN"),
          genre: value("genre"),
          totalCopies: Number(value("totalCopies")),
        });
      else
        await api.createMember({
          name: value("name"),
          email: value("email"),
          membershipId: value("membershipId"),
        });
      onCreated();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
      if (cause instanceof ApiError) setFields(cause.fields);
    } finally {
      setPending(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="create-dialog"
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        if (pending) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current && !pending) onClose();
      }}
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">
            {kind === "book" ? "Grow the collection" : "Grow the community"}
          </span>
          <h2 id="dialog-title">
            {kind === "book" ? "A new chapter." : "A new reader."}
          </h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          disabled={pending}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      <p className="muted">
        {kind === "book"
          ? "Add a title and its copies to the library."
          : "Register a member to start their reading history."}{" "}
        All fields are required.
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={pending}>
          {controls.map((control) => (
            <div className="field" key={control.name}>
              <label htmlFor={`create-${control.name}`}>{control.label}</label>
              <input
                id={`create-${control.name}`}
                name={control.name}
                type={control.type ?? "text"}
                placeholder={control.placeholder}
                required
                maxLength={control.max}
                min={control.type === "number" ? 1 : undefined}
                max={control.type === "number" ? 100000 : undefined}
                step={control.type === "number" ? 1 : undefined}
                defaultValue={control.type === "number" ? 1 : undefined}
                aria-invalid={!!fields[control.name]}
                aria-describedby={
                  fields[control.name] ? `${control.name}-error` : undefined
                }
              />
              {fields[control.name] && (
                <small className="field-error" id={`${control.name}-error`}>
                  {fields[control.name]}
                </small>
              )}
            </div>
          ))}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="button" disabled={pending}>
              {pending
                ? "Saving…"
                : kind === "book"
                  ? "Add book"
                  : "Register member"}
              <Icon name="plus" size={18} />
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}
