import { Armchair, ArrowDownRight, ArrowUpRight, CalendarClock, Clock3, Plane, Route as RouteIcon, Send, Timer } from "lucide-react";
import { AIRLINES, CITIES, TIME_SLOTS } from "../constants";
import type { FlightForm } from "../formState";

/** Option lists for a <select>, keyed by form field. */
export const OPTIONS = {
  airline: AIRLINES,
  source_city: CITIES,
  destination_city: CITIES,
  departure_time: TIME_SLOTS,
  arrival_time: TIME_SLOTS,
} as const;

const STOPS_OPTIONS = ["zero", "one", "two_or_more"] as const;
const CLASS_OPTIONS = ["Economy", "Business"] as const;

/** A grouped set of premium form controls. */
export function FlightFormFields({
  form,
  onChange,
  errors,
  idPrefix,
}: {
  form: FlightForm;
  onChange: (patch: Partial<FlightForm>) => void;
  errors: Record<string, string>;
  idPrefix: string;
}) {
  const set = <K extends keyof FlightForm>(key: K) => (value: FlightForm[K]) =>
    onChange({ [key]: value } as Partial<FlightForm>);
  const daysPct = ((form.daysLeft - 1) / 48) * 100;

  return (
    <>
      {/* GROUP 1 — JOURNEY */}
      <fieldset className="form-group">
        <legend>Journey</legend>
        <div className="form-grid">
          <SelectField
            id={`${idPrefix}-source`}
            label="From"
            icon={ArrowUpRight}
            value={form.source}
            options={CITIES}
            error={errors.source}
            onChange={set("source")}
          />
          <SelectField
            id={`${idPrefix}-dest`}
            label="To"
            icon={ArrowDownRight}
            value={form.destination}
            options={CITIES}
            error={errors.destination}
            onChange={set("destination")}
          />
          <SelectField
            id={`${idPrefix}-airline`}
            label="Airline"
            icon={Plane}
            value={form.airline}
            options={AIRLINES}
            error={errors.airline}
            onChange={set("airline")}
          />
        </div>
      </fieldset>

      {/* GROUP 2 — TIMING */}
      <fieldset className="form-group">
        <legend>Timing</legend>
        <div className="form-grid">
          <SelectField
            id={`${idPrefix}-dep`}
            label="Departure"
            icon={Send}
            value={form.departure}
            options={TIME_SLOTS}
            error={errors.departure}
            onChange={set("departure")}
          />
          <SelectField
            id={`${idPrefix}-arr`}
            label="Arrival"
            icon={Clock3}
            value={form.arrival}
            options={TIME_SLOTS}
            error={errors.arrival}
            onChange={set("arrival")}
          />
          <div className="field">
            <label className="field-label" htmlFor={`${idPrefix}-days`}>
              <CalendarClock size={14} strokeWidth={1.7} aria-hidden="true" />
              Days left
            </label>
            <div className="range-row">
              <input
                id={`${idPrefix}-days`}
                className="range"
                type="range"
                min={1}
                max={49}
                step={1}
                value={form.daysLeft}
                style={{ "--pct": `${daysPct}%` } as React.CSSProperties}
                onChange={(e) => set("daysLeft")(Number(e.target.value))}
                aria-valuetext={`${form.daysLeft} days before departure`}
              />
              <output className="range-value" htmlFor={`${idPrefix}-days`}>
                {form.daysLeft}
              </output>
            </div>
          </div>
        </div>
      </fieldset>

      {/* GROUP 3 — FLIGHT */}
      <fieldset className="form-group">
        <legend>Flight</legend>
        <div className="form-grid">
          <div className="field">
            <label className="field-label" htmlFor={`${idPrefix}-duration`}>
              <Timer size={14} strokeWidth={1.7} aria-hidden="true" />
              Duration (hrs)
            </label>
            <input
              id={`${idPrefix}-duration`}
              className="control"
              type="number"
              inputMode="decimal"
              min={0.1}
              max={50}
              step={0.1}
              value={form.duration}
              onChange={(e) => set("duration")(e.target.value === "" ? 0 : Number(e.target.value))}
              aria-invalid={!!errors.duration}
              aria-describedby={errors.duration ? `${idPrefix}-duration-err` : undefined}
            />
            {errors.duration && (
              <p id={`${idPrefix}-duration-err`} className="field-error" role="alert">
                {errors.duration}
              </p>
            )}
          </div>

          <div className="field">
            <span className="field-label" id={`${idPrefix}-stops-label`}>
              <RouteIcon size={14} strokeWidth={1.7} aria-hidden="true" />
              Stops
            </span>
            <div className="segmented" role="group" aria-labelledby={`${idPrefix}-stops-label`}>
              {STOPS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={form.stops === s}
                  onClick={() => set("stops")(s)}
                >
                  {s === "zero" ? "Non-stop" : s === "one" ? "1 Stop" : "2+ Stops"}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field-label" id={`${idPrefix}-class-label`}>
              <Armchair size={14} strokeWidth={1.7} aria-hidden="true" />
              Class
            </span>
            <div className="segmented" role="group" aria-labelledby={`${idPrefix}-class-label`}>
              {CLASS_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={form.cls === c}
                  onClick={() => set("cls")(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </fieldset>
    </>
  );
}

function SelectField({
  id,
  label,
  icon: Icon,
  value,
  options,
  error,
  onChange,
}: {
  id: string;
  label: string;
  icon: typeof Plane;
  value: string;
  options: readonly string[];
  error?: string;
  onChange: (v: never) => void;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        <Icon size={14} strokeWidth={1.7} aria-hidden="true" />
        {label}
      </label>
      <select
        id={id}
        className="control"
        value={value}
        onChange={(e) => onChange(e.target.value as never)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {labelFor(o)}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-err`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function labelFor(value: string): string {
  const map: Record<string, string> = {
    Air_India: "Air India",
    GO_FIRST: "Go First",
    Early_Morning: "Early Morning",
    Late_Night: "Late Night",
  };
  return map[value] ?? value;
}
