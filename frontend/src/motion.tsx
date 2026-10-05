import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import type { Variants } from "framer-motion";

// Shared motion rules. MotionConfig in main.tsx turns movement off for
// users who ask the system for reduced motion; opacity changes remain.

// The same curve as --ease in styles.css.
export const ease = [0.23, 1, 0.32, 1] as const;

// A page is a container. Its blocks rise in sequence when a route opens.
export const page: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
export const block: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
};

// A list row. `custom` is the row index, so rows that enter together cascade.
// Rows that stay in the list after a search do not move again.
export const row: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease, delay: Math.min(index, 12) * 0.035 },
  }),
};

// An inline message, such as a form error.
export const message = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease },
};

// Count from the previous number to `value`.
export function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const count = useMotionValue(reduce ? value : 0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  useEffect(() => {
    if (reduce) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 0.8, ease });
    return () => controls.stop();
  }, [count, value, reduce]);
  return <motion.strong>{rounded}</motion.strong>;
}
