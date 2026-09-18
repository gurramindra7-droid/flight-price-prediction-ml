import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../utils";

/** Animates a number from 0 to `target` with an ease-out curve. */
export function useCountUp(target: number, durationMs = 1100, started = true): number {
  const [value, setValue] = useState(started ? target : 0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!started) return;
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const t0 = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const raw = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - raw, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (raw < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs, started]);

  return value;
}
