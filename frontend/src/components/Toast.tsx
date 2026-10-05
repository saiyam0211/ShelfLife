import { useEffect } from "react";
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
  if (!notice) return null;
  return (
    <div
      className={`toast ${notice.type}`}
      role={notice.type === "error" ? "alert" : "status"}
    >
      <span className="toast-mark">
        {notice.type === "success" ? <Icon name="check" /> : "!"}
      </span>
      <span>{notice.message}</span>
      <button
        type="button"
        className="icon-button"
        aria-label="Dismiss message"
        onClick={onClose}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
