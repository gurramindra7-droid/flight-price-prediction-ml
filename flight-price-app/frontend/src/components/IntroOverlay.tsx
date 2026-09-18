import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { INTRO_DURATION, introState, skipIntro } from "../introState";

/**
 * Cinematic overlay: title cards timed to the flight sequence, with a skip
 * control. Fully driven by the shared intro clock (no re-render per frame —
 * only phase transitions re-render).
 */

type Phase = "black" | "approach" | "hero";

export function IntroOverlay({
  onFinish,
  reduced,
}: {
  onFinish: () => void;
  reduced: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("black");
  const [remaining, setRemaining] = useState(1);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (reduced) {
      // Reduced motion: skip the cinematic entirely, land on the hero.
      introState.done = true;
      introState.active = false;
      introState.t = INTRO_DURATION;
      finishedRef.current = true;
      onFinish();
      return;
    }

    let raf = 0;
    const tick = () => {
      const t = introState.t;
      if (!finishedRef.current) setRemaining(1 - Math.min(1, t / INTRO_DURATION));

      const next: Phase = t < 1.4 ? "black" : t < INTRO_DURATION - 0.7 ? "approach" : "hero";
      setPhase((prev) => (prev === next ? prev : next));

      if (t >= INTRO_DURATION && !finishedRef.current) {
        finishedRef.current = true;
        introState.done = true;
        introState.active = false;
        onFinish();
        return; // stop ticking; aircraft component takes over the clock
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onFinish, reduced]);

  const handleSkip = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    skipIntro();
    onFinish();
  };

  return (
    <div className="intro-overlay" role="presentation">
      <AnimatePresence mode="wait">
        {phase === "black" && (
          <motion.p
            key="card1"
            className="intro-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            FLIGHT INTELLIGENCE
          </motion.p>
        )}

        {phase === "approach" && (
          <motion.div
            key="card2"
            className="intro-card-group"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <motion.h1
              className="intro-title"
              initial={{ opacity: 0, y: 22, letterSpacing: "0.34em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.12em" }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            >
              PREDICT THE PRICE
              <span> OF YOUR JOURNEY</span>
            </motion.h1>
            <motion.p
              className="intro-sub"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8, ease: "easeOut" }}
            >
              Machine learning meets aviation intelligence
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        className="intro-skip"
        onClick={handleSkip}
        style={{ opacity: remaining < 0.02 ? 0 : 1, pointerEvents: remaining < 0.02 ? "none" : "auto" }}
        aria-label="Skip introduction animation"
      >
        Skip intro <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
