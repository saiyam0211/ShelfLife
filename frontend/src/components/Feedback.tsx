import { motion } from "framer-motion";
import { block } from "../motion";
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
  // Placeholder rows keep the page shape while the first request runs.
  if (loading)
    return (
      <div className="skeleton-list" role="status">
        <span className="sr-only">
          Opening the shelf. Fetching the latest library records.
        </span>
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            className="skeleton-row"
            key={index}
            style={{ animationDelay: `${index * 110}ms` }}
            aria-hidden="true"
          >
            <span className="skeleton-line title" />
            <span className="skeleton-line" />
            <span className="skeleton-chip" />
          </div>
        ))}
      </div>
    );
  if (error)
    return (
      <motion.div
        className="feedback error-panel"
        role="alert"
        variants={block}
        initial="hidden"
        animate="show"
      >
        <span className="eyebrow">A brief interruption</span>
        <h3>We couldn’t load this.</h3>
        <p>{error}</p>
        <button className="button secondary" onClick={retry}>
          Try again <Icon name="arrow" size={17} />
        </button>
      </motion.div>
    );
  if (empty)
    return (
      <motion.div
        className="feedback"
        variants={block}
        initial="hidden"
        animate="show"
      >
        <Icon name="books" size={30} />
        <h3>{empty}</h3>
        {children}
      </motion.div>
    );
  return <>{children}</>;
}
