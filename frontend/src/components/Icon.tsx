export function Icon({
  name,
  size = 20,
}: {
  name:
    | "books"
    | "issue"
    | "members"
    | "arrow"
    | "search"
    | "plus"
    | "close"
    | "check"
    | "logout";
  size?: number;
}) {
  const paths = {
    books: (
      <>
        <path d="M4 4h4v15H4zM10 4h4v15h-4zM16 5l3-1 4 14-3 1zM2 21h21" />
      </>
    ),
    issue: (
      <>
        <path d="M14 3H5v18h14V10M12 12h9m-3-3 3 3-3 3M8 7h3M8 17h4" />
      </>
    ),
    members: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    logout: (
      <>
        <path d="M10 4H4v16h6M9 12h12m-5-5 5 5-5 5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
