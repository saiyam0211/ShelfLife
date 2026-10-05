import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";
export type Notice = { message: string; type: "success" | "error" };
export function Toast({
  notice,
  onClose,
}: {
  notice: Notice | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!notice || notice.type === "error") return;
    const timer = setTimeout(onClose, 6500);
    return () => clearTimeout(timer);
  }, [notice, onClose]);
  // AnimatePresence keeps the toast mounted until its exit motion ends.
  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          key={`${notice.type}:${notice.message}`}
          className={`toast ${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
          initial={{ opacity: 0, y: 28, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.18 } }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
        >
          <motion.span
            className="toast-mark"
            initial={{ scale: 0.4, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.1 }}
          >
            {notice.type === "success" ? <Icon name="check" /> : "!"}
          </motion.span>
          <span>{notice.message}</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Dismiss message"
            onClick={onClose}
          >
            <Icon name="close" size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
