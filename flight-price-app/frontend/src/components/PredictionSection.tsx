import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlightFormFields, Icon } from "./FlightFormFields";
import { RouteViz } from "./RouteViz";
import { DEFAULT_FORM, type FlightForm } from "../formState";
import { AIRLINE_LABEL, STOPS_LABEL, TIME_LABEL } from "../constants";
import { ApiError, predictPrice, validateInput } from "../api";
import type { PredictionInput } from "../api";
import { useCountUp } from "../hooks/useCountUp";
import { formatINR } from "../utils";

type Status = "idle" | "loading" | "success" | "error";

interface ResultState {
  price: number;
  summary: {
    route: string;
    airline: string;
    cls: string;
    stops: string;
    daysLeft: number;
    duration: number;
    departure: string;
    arrival: string;
  };
}

export function PredictionSection() {
  const [form, setForm] = useState<FlightForm>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ResultState | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const patch = useCallback((p: Partial<FlightForm>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors((e) => (Object.keys(e).length ? {} : e));
  }, []);

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
          route: `${form.source} → ${form.destination}`,
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
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <section id="predict" className="predict section-pad">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">PREDICTION CONSOLE</p>
          <h2 className="section-title">
            Estimate your <span className="grad-text">fare</span>
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
            <RouteViz source={form.source} destination={form.destination} />

            <FlightFormFields form={form} onChange={patch} errors={errors} idPrefix="predict" />

            <div className="predict-actions">
              <button
                type="submit"
                className="btn btn-primary predict-btn"
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Computing…
                  </>
                ) : (
                  <>
                    PREDICT FLIGHT PRICE
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                      <path
                        d="M2 8h11M9 4l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
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
                  <p className="result-eyebrow">ESTIMATED FLIGHT PRICE</p>
                  <p className="result-price">
                    <span className="result-currency">₹</span>
                    <CountUpPrice value={result.price} />
                  </p>
                  <ul className="result-summary">
                    <li><span>Route</span><strong>{result.summary.route}</strong></li>
                    <li><span>Airline</span><strong>{result.summary.airline}</strong></li>
                    <li><span>Class</span><strong>{result.summary.cls}</strong></li>
                    <li><span>Stops</span><strong>{result.summary.stops}</strong></li>
                    <li><span>Departure</span><strong>{result.summary.departure}</strong></li>
                    <li><span>Arrival</span><strong>{result.summary.arrival}</strong></li>
                    <li><span>Duration</span><strong>{result.summary.duration} h</strong></li>
                    <li><span>Days left</span><strong>{result.summary.daysLeft}</strong></li>
                  </ul>
                  <p className="result-note">
                    Model estimated price — estimated using the trained machine-learning model.
                    Actual airline prices may differ.
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
                    <Icon name="airline" />
                  </div>
                  <h3>Your estimate appears here</h3>
                  <p>
                    Fill in the journey details and run the model. The predicted fare comes
                    straight from the trained Extra Trees regressor.
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
  return <span className="tabular">{formatINR(shown).replace("₹", "").trim()}</span>;
}
