import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Clock3,
  Globe2,
  Plane,
  Route as RouteIcon,
  ScanLine,
  Sparkles,
  Timer,
} from "lucide-react";
import { FlightFormFields } from "./FlightFormFields";
import { DEFAULT_FORM, type FlightForm } from "../formState";
import { AIRLINE_LABEL, CITIES, CITY_POS, STOPS_LABEL, TIME_LABEL, type City } from "../constants";
import { ApiError, predictPrice, validateInput } from "../api";
import type { PredictionInput } from "../api";
import { useCountUp } from "../hooks/useCountUp";

type Status = "idle" | "loading" | "success" | "error";

interface ResultState {
  price: number;
  summary: {
    sourceCity: string;
    destCity: string;
    airline: string;
    cls: string;
    stops: string;
    daysLeft: number;
    duration: number;
    departure: string;
    arrival: string;
  };
}

/** Cosmetic staged status lines layered over the real request (never blocking). */
const LOADING_STAGES = [
  { at: 0, text: "ANALYZING ROUTE" },
  { at: 700, text: "ANALYZING FLIGHT PARAMETERS" },
  { at: 1400, text: "CALCULATING FARE" },
  { at: 2100, text: "ESTIMATING PRICE" },
];

export function PredictionPanel({
  onCitiesChange,
}: {
  onCitiesChange: (s: City | null, d: City | null) => void;
}) {
  const [form, setForm] = useState<FlightForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ResultState | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const timersRef = useRef<number[]>([]);

  const patch = useCallback((p: Partial<FlightForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors((e) => (Object.keys(e).length ? {} : e));
  }, []);

  // Two-way binding: report selected cities to the 3D network.
  useEffect(() => {
    onCitiesChange(form.source, form.destination);
  }, [form.source, form.destination, onCitiesChange]);

  // Staged status text while loading (cosmetic only, never blocks the request).
  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (status !== "loading") {
      setStage(0);
      return;
    }
    setStage(0);
    LOADING_STAGES.forEach(({ at }, i) => {
      if (i > 0) {
        timersRef.current.push(window.setTimeout(() => setStage(i), at));
      }
    });
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    const input: PredictionInput = {
      airline: form.airline,
      source_city: form.source,
      destination_city: form.destination,
      departure_time: form.departure,
      arrival_time: form.arrival,
      duration: form.duration,
      days_left: form.daysLeft,
      stops: form.stops,
      class: form.cls,
    };

    const localErrors = validateInput(input);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors as Record<string, string>);
      return;
    }

    setStatus("loading");
    setApiError(null);
    try {
      const res = await predictPrice(input);
      setResult({
        price: res.predicted_price,
        summary: {
          sourceCity: form.source,
          destCity: form.destination,
          airline: AIRLINE_LABEL[form.airline],
          cls: form.cls,
          stops: STOPS_LABEL[form.stops],
          daysLeft: form.daysLeft,
          duration: form.duration,
          departure: TIME_LABEL[form.departure],
          arrival: TIME_LABEL[form.arrival],
        },
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setApiError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  const reset = () => {
    setForm(DEFAULT_FORM);
    setErrors({});
    setResult(null);
    setStatus("idle");
    setApiError(null);
  };

  const loading = status === "loading";
  const stageText = LOADING_STAGES[Math.min(stage, LOADING_STAGES.length - 1)].text;

  return (
    <section id="predict" className="predict section-pad">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">PREDICTION CONSOLE</p>
          <h2 className="section-title">
            Predict <span className="grad-text">Flight Price</span>
          </h2>
          <p className="lead">
            Configure the journey below. Every request runs through the real trained model —
            no approximations, no mock data.
          </p>
        </div>

        <div className="predict-layout">
          {/* ---------------- form card ---------------- */}
          <motion.form
            className="glass glass-hover predict-card"
            onSubmit={handleSubmit}
            noValidate
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <MiniRouteViz source={form.source} destination={form.destination} />

            <FlightFormFields form={form} onChange={patch} errors={errors} idPrefix="predict" />

            <div className="predict-actions">
              <button type="submit" className="btn btn-primary predict-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    <span aria-live="polite">{stageText}</span>
                  </>
                ) : (
                  <>
                    PREDICT FLIGHT PRICE
                    <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                  </>
                )}
                <span className="predict-btn-scan" aria-hidden="true" />
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset} disabled={loading}>
                Reset
              </button>
            </div>

            <AnimatePresence>
              {status === "error" && apiError && (
                <motion.div
                  className="form-error-banner"
                  role="alert"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <strong>Prediction failed.</strong> {apiError}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>

          {/* ---------------- result panel ---------------- */}
          <motion.aside
            className="predict-result"
            aria-live="polite"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <AnimatePresence mode="wait">
              {status === "success" && result ? (
                <motion.div
                  key="result"
                  className="glass result-card"
                  initial={{ opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="result-eyebrow">ESTIMATED FLIGHT FARE</p>
                  <div className="result-route">
                    <span className="result-route-city">{result.summary.sourceCity}</span>
                    <span className="result-route-path" aria-hidden="true">
                      <svg viewBox="0 0 120 24" width="120" height="24" fill="none">
                        <path
                          d="M4 20 Q 60 -8 116 20"
                          stroke="rgba(124,196,255,0.25)"
                          strokeWidth="1"
                          strokeDasharray="3 4"
                        />
                        <motion.path
                          d="M4 20 Q 60 -8 116 20"
                          stroke="#7cc4ff"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </svg>
                      <Plane size={14} strokeWidth={1.8} />
                    </span>
                    <span className="result-route-city">{result.summary.destCity}</span>
                  </div>
                  <div className="result-price-wrap">
                    <div className="result-ring" aria-hidden="true" />
                    <p className="result-price">
                      <span className="result-currency">₹</span>
                      <CountUpPrice value={result.price} />
                    </p>
                  </div>
                  <ul className="result-summary">
                    <li>
                      <span><Plane size={13} aria-hidden="true" /> Airline</span>
                      <strong>{result.summary.airline}</strong>
                    </li>
                    <li>
                      <span><Sparkles size={13} aria-hidden="true" /> Class</span>
                      <strong>{result.summary.cls}</strong>
                    </li>
                    <li>
                      <span><RouteIcon size={13} aria-hidden="true" /> Stops</span>
                      <strong>{result.summary.stops}</strong>
                    </li>
                    <li>
                      <span><Timer size={13} aria-hidden="true" /> Duration</span>
                      <strong>{result.summary.duration} h</strong>
                    </li>
                    <li>
                      <span><CalendarClock size={13} aria-hidden="true" /> Days left</span>
                      <strong>{result.summary.daysLeft}</strong>
                    </li>
                    <li>
                      <span><Clock3 size={13} aria-hidden="true" /> Departure</span>
                      <strong>{result.summary.departure}</strong>
                    </li>
                    <li>
                      <span><Clock3 size={13} aria-hidden="true" /> Arrival</span>
                      <strong>{result.summary.arrival}</strong>
                    </li>
                  </ul>
                  <p className="result-note">
                    Predicted by the trained Extra Trees model for these exact inputs —
                    not a guarantee of airline prices.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  className="glass result-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="result-empty-icon" aria-hidden="true">
                    <ScanLine size={20} strokeWidth={1.6} />
                  </div>
                  <h3>Your estimate appears here</h3>
                  <p>
                    Fill in the journey details and run the model. The predicted fare comes
                    straight from the trained Extra Trees regressor.
                  </p>
                  <p className="result-empty-meta">
                    <Globe2 size={12} aria-hidden="true" /> 6 cities · 6 airlines · 2 classes · real ML inference
                  </p>
                  <p className="result-empty-meta">
                    <Sparkles size={12} aria-hidden="true" /> No fabricated numbers — the response is the model's output.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}

function CountUpPrice({ value }: { value: number }) {
  const shown = useCountUp(value, 1100);
  return <span className="tabular">{formatINR2(shown)}</span>;
}

/** Indian-grouping format with two decimals, no currency symbol (symbol is a separate span). */
function formatINR2(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/* ------------------------------------------------------------------ */
/* Mini route visualization — animated arc between selected cities     */
/* ------------------------------------------------------------------ */

const SLOT_LABEL: Record<string, string> = {
  Air_India: "Air India",
  GO_FIRST: "Go First",
  Early_Morning: "Early Morning",
  Late_Night: "Late Night",
};

function MiniRouteViz({ source, destination }: { source: City; destination: City }) {
  const a = CITY_POS[source];
  const b = CITY_POS[destination];

  const path = useMemo(() => {
    const mx = (a.x + b.x) / 2;
    const my = Math.min(a.y, b.y) - Math.abs(a.x - b.x) * 0.16 - 6;
    return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
  }, [a, b]);

  return (
    <div
      className="route-viz"
      aria-label={`Route: ${SLOT_LABEL[source] ?? source} to ${SLOT_LABEL[destination] ?? destination}`}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="route-svg" aria-hidden="true">
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7cc4ff" />
            <stop offset="100%" stopColor="#66e3ff" />
          </linearGradient>
        </defs>
        {CITIES.map((c) =>
          c === source || c === destination ? null : (
            <circle
              key={c}
              cx={CITY_POS[c].x}
              cy={CITY_POS[c].y}
              r="0.9"
              fill="rgba(124,196,255,0.25)"
            />
          ),
        )}
        <motion.path
          key={`${source}-${destination}`}
          d={path}
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="0.8"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      <div className="route-ends">
        <span className="route-city">
          <span className="route-dot route-dot--source" aria-hidden="true" />
          {source}
        </span>
        <span className="route-plane" aria-hidden="true">
          <Plane size={15} strokeWidth={1.8} />
        </span>
        <span className="route-city route-city--dest">
          {destination}
          <span className="route-dot route-dot--dest" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
