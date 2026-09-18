import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  INTRO_DURATION,
  introState,
  introSeenThisSession,
  markIntroSeen,
  skipIntro,
} from "../introState";

/**
 * Cinematic intro overlay: title cards timed to the GSAP flight sequence and a
 * static reduced-motion / no-WebGL fallback. Session-flagged so it plays once
 * per browser session (fresh loads only). There is intentionally NO visible
 * skip control — the sequence is short (~5s) by design; Escape remains a
 * hidden keyboard affordance for accessibility only.
 */

type Phase = "black" | "approach" | "wordmark";

const INTRO_EVENT = "fi:intro-complete";

export function CinematicIntro({ onFinish }: { onFinish: () => void }) {
  /** Already played this session → do not replay at all. */
  const [seen] = useState<boolean>(() => introSeenThisSession());
  /** Static mode: reduced motion or no WebGL → wordmark fade-in, no 3D. */
  const [staticMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    try {
      const canvas = document.createElement("canvas");
      if (!canvas.getContext("webgl2") && !canvas.getContext("webgl")) return true;
    } catch {
      return true;
    }
    return false;
  });

  /* Session-seen: finish instantly, render nothing. */
  useEffect(() => {
    if (!seen) return;
    introState.done = true;
    introState.active = false;
    onFinish();
  }, [seen, onFinish]);

  const [phase, setPhase] = useState<Phase>("black");
  const [leaving, setLeaving] = useState(false);
  const finishedRef = useRef(false);

  if (seen) return null;

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markIntroSeen();
    setLeaving(true);
    // Let the fade-out play before unmounting.
    window.setTimeout(onFinish, 650);
  }, [onFinish]);

  /* ------------------------- static fallback ------------------------- */
  useEffect(() => {
    if (!staticMode) return;
    introState.done = true;
    introState.active = false;
    const id = window.setTimeout(finish, 1900);
    return () => window.clearTimeout(id);
  }, [staticMode, finish]);

  /* --------------------- cinematic phase machine --------------------- */
  useEffect(() => {
    if (staticMode) return;

    const onComplete = () => finish();
    window.addEventListener(INTRO_EVENT, onComplete);

    let raf = 0;
    const tick = () => {
      const t = introState.t;
      const next: Phase =
        t < 1.1 ? "black" : t < INTRO_DURATION - 1.6 ? "approach" : "wordmark";
      setPhase((prev) => (prev === next ? prev : next));
      if (!finishedRef.current) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Hidden keyboard affordance (no visible skip UI, per design spec).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipIntro();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener(INTRO_EVENT, onComplete);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [staticMode, finish]);

  /* Freeze scrolling behind the cinematic. */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <motion.div
      className="intro-overlay"
      role="presentation"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {staticMode ? (
        /* Static cinematic still + wordmark — no animation, no 3D requirement */
        <div className="intro-card-group">
          <motion.h1
            className="intro-title"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            FLIGHT <span>INTELLIGENCE</span>
          </motion.h1>
          <motion.p
            className="intro-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.7 }}
          >
            AI-POWERED FLIGHT FARE PREDICTION
          </motion.p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {phase === "black" && (
            <motion.p
              key="card1"
              className="intro-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
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
              exit={{ opacity: 0, filter: "blur(8px)" }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <motion.h1
                className="intro-title"
                initial={{ opacity: 0, y: 22, letterSpacing: "0.34em" }}
                animate={{ opacity: 1, y: 0, letterSpacing: "0.12em" }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              >
                FLIGHT <span>INTELLIGENCE</span>
              </motion.h1>
              <motion.p
                className="intro-sub"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
              >
                AI-POWERED FLIGHT FARE PREDICTION
              </motion.p>
            </motion.div>
          )}

          {phase === "wordmark" && (
            <motion.div
              key="card3"
              className="intro-card-group"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="intro-title intro-title--final">
                FLIGHT <span>INTELLIGENCE</span>
              </h1>
              <motion.p
                className="intro-sub"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.7, ease: "easeOut" }}
              >
                AI-POWERED FLIGHT FARE PREDICTION
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
