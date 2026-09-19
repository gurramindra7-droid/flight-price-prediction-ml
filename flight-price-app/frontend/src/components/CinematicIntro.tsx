import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  INTRO_DURATION,
  introState,
  introSeenThisSession,
  markIntroSeen,
  skipIntro,
} from "../introState";


type Phase =
  | "black"
  | "approach"
  | "wordmark";


const INTRO_EVENT =
  "fi:intro-complete";


const CINEMATIC_FAILSAFE_MS =
  7600;


export function CinematicIntro({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const [seen] =
    useState<boolean>(() =>
      introSeenThisSession(),
    );


  const [staticMode] =
    useState<boolean>(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return true;
      }

      if (
        window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches
      ) {
        return true;
      }

      try {
        const canvas =
          document.createElement(
            "canvas",
          );

        const webgl2 =
          canvas.getContext(
            "webgl2",
          );

        const webgl =
          canvas.getContext(
            "webgl",
          );

        if (!webgl2 && !webgl) {
          return true;
        }
      } catch {
        return true;
      }

      return false;
    });


  const [phase, setPhase] =
    useState<Phase>(
      "black",
    );


  const [leaving, setLeaving] =
    useState(false);


  const finishedRef =
    useRef(false);


  const finish = useCallback(
    () => {
      if (
        finishedRef.current
      ) {
        return;
      }

      finishedRef.current =
        true;

      markIntroSeen();

      setLeaving(true);

      window.setTimeout(
        onFinish,
        650,
      );
    },
    [onFinish],
  );


  /*
   * If the intro has already been shown in this session,
   * immediately continue to the actual application.
   */
  useEffect(() => {
    if (!seen) {
      return;
    }

    introState.done =
      true;

    introState.active =
      false;

    onFinish();
  }, [
    seen,
    onFinish,
  ]);


  /*
   * Static fallback:
   *
   * Used for:
   * - reduced-motion
   * - devices without WebGL
   * - browsers that deny WebGL
   */
  useEffect(() => {
    if (
      !staticMode
    ) {
      return;
    }

    introState.done =
      true;

    introState.active =
      false;

    const timer =
      window.setTimeout(
        finish,
        1900,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    staticMode,
    finish,
  ]);


  /*
   * CRITICAL MOBILE/FAILSAFE:
   *
   * The intro no longer depends forever on the R3F scene
   * sending fi:intro-complete.
   *
   * If the 3D scene fails to initialize, the page still
   * transitions into the actual website.
   */
  useEffect(() => {
    if (
      staticMode ||
      seen
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          finish();
        },
        CINEMATIC_FAILSAFE_MS,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    staticMode,
    seen,
    finish,
  ]);


  /*
   * Normal cinematic event.
   */
  useEffect(() => {
    if (
      staticMode ||
      seen
    ) {
      return;
    }

    const onComplete =
      () => {
        finish();
      };


    window.addEventListener(
      INTRO_EVENT,
      onComplete,
    );


    let raf = 0;


    const tick = () => {
      const t =
        introState.t;


      const next: Phase =
        t <
        1.1
          ? "black"
          : t <
            INTRO_DURATION -
              1.6
          ? "approach"
          : "wordmark";


      setPhase(
        (previous) =>
          previous ===
          next
            ? previous
            : next,
      );


      if (
        !finishedRef.current
      ) {
        raf =
          requestAnimationFrame(
            tick,
          );
      }
    };


    raf =
      requestAnimationFrame(
        tick,
      );


    /*
     * Hidden accessibility keyboard
     * affordance.
     *
     * No visible skip button.
     */
    const onKey = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        skipIntro();

        finish();
      }
    };


    window.addEventListener(
      "keydown",
      onKey,
    );


    return () => {
      window.removeEventListener(
        INTRO_EVENT,
        onComplete,
      );

      window.removeEventListener(
        "keydown",
        onKey,
      );

      cancelAnimationFrame(
        raf,
      );
    };
  }, [
    staticMode,
    seen,
    finish,
  ]);


  /*
   * Prevent page scrolling while the intro is active.
   */
  useEffect(() => {
    const previous =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, []);


  /*
   * Session was already completed.
   */
  if (seen) {
    return null;
  }


  return (
    <motion.div
      className="intro-overlay"

      role="presentation"

      initial={{
        opacity: 1,
      }}

      animate={{
        opacity: leaving
          ? 0
          : 1,
      }}

      transition={{
        duration: 0.6,
        ease: "easeInOut",
      }}
    >

      {staticMode ? (
        <div className="intro-card-group">

          <motion.h1
            className="intro-title"

            initial={{
              opacity: 0,
              y: 14,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.9,
              ease: "easeOut",
            }}
          >
            FLIGHT{" "}
            <span>
              INTELLIGENCE
            </span>
          </motion.h1>


          <motion.p
            className="intro-sub"

            initial={{
              opacity: 0,
            }}

            animate={{
              opacity: 1,
            }}

            transition={{
              delay: 0.5,
              duration: 0.7,
            }}
          >
            AI-POWERED FLIGHT
            FARE PREDICTION
          </motion.p>

        </div>
      ) : (
        <AnimatePresence
          mode="wait"
        >

          {phase ===
            "black" && (
            <motion.p
              key="card1"
              className="intro-card"

              initial={{
                opacity: 0,
                y: 12,
              }}

              animate={{
                opacity: 1,
                y: 0,
              }}

              exit={{
                opacity: 0,
                y: -8,
              }}

              transition={{
                duration: 0.6,
                ease: "easeOut",
              }}
            >
              FLIGHT
              INTELLIGENCE
            </motion.p>
          )}


          {phase ===
            "approach" && (
            <motion.div
              key="card2"
              className="intro-card-group"

              initial={{
                opacity: 0,
              }}

              animate={{
                opacity: 1,
              }}

              exit={{
                opacity: 0,
                filter:
                  "blur(8px)",
              }}

              transition={{
                duration: 0.55,
                ease: "easeOut",
              }}
            >

              <motion.h1
                className="intro-title"

                initial={{
                  opacity: 0,
                  y: 22,
                  letterSpacing:
                    "0.34em",
                }}

                animate={{
                  opacity: 1,
                  y: 0,
                  letterSpacing:
                    "0.12em",
                }}

                transition={{
                  duration: 1.5,
                  ease: [
                    0.16,
                    1,
                    0.3,
                    1,
                  ],
                }}
              >
                FLIGHT{" "}
                <span>
                  INTELLIGENCE
                </span>
              </motion.h1>


              <motion.p
                className="intro-sub"

                initial={{
                  opacity: 0,
                  y: 12,
                }}

                animate={{
                  opacity: 1,
                  y: 0,
                }}

                transition={{
                  delay: 0.8,
                  duration: 0.8,
                  ease: "easeOut",
                }}
              >
                AI-POWERED FLIGHT
                FARE PREDICTION
              </motion.p>

            </motion.div>
          )}


          {phase ===
            "wordmark" && (
            <motion.div
              key="card3"
              className="intro-card-group"

              initial={{
                opacity: 0,
                scale: 0.985,
              }}

              animate={{
                opacity: 1,
                scale: 1,
              }}

              transition={{
                duration: 0.7,
                ease: [
                  0.16,
                  1,
                  0.3,
                  1,
                ],
              }}
            >

              <h1 className="intro-title intro-title--final">
                FLIGHT{" "}
                <span>
                  INTELLIGENCE
                </span>
              </h1>


              <motion.p
                className="intro-sub"

                initial={{
                  opacity: 0,
                  y: 10,
                }}

                animate={{
                  opacity: 1,
                  y: 0,
                }}

                transition={{
                  delay: 0.45,
                  duration: 0.7,
                  ease: "easeOut",
                }}
              >
                AI-POWERED FLIGHT
                FARE PREDICTION
              </motion.p>

            </motion.div>
          )}

        </AnimatePresence>
      )}

    </motion.div>
  );
}