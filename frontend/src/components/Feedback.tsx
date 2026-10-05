import { Icon } from "./Icon";
export function Feedback({
  loading,
  error,
  retry,
  empty,
  children,
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
  empty?: string;
  children?: React.ReactNode;
}) {
  if (loading)
    return (
      <div className="feedback" role="status">
        <span className="loading-mark" />
        <h3>Opening the shelf…</h3>
        <p>Fetching the latest library records.</p>
      </div>
    );
  if (error)
    return (
      <div className="feedback error-panel" role="alert">
        <span className="eyebrow">A brief interruption</span>
        <h3>We couldn’t load this.</h3>
        <p>{error}</p>
        <button className="button secondary" onClick={retry}>
          Try again <Icon name="arrow" size={17} />
        </button>
      </div>
    );
  if (empty)
    return (
      <div className="feedback">
        <Icon name="books" size={30} />
        <h3>{empty}</h3>
        {children}
      </div>
    );
  return <>{children}</>;
}
