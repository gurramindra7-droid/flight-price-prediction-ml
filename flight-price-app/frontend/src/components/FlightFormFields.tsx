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
            icon="source"
            value={form.source}
            options={CITIES}
            error={errors.source}
            onChange={set("source")}
          />
          <SelectField
            id={`${idPrefix}-dest`}
            label="To"
            icon="dest"
            value={form.destination}
            options={CITIES}
            error={errors.destination}
            onChange={set("destination")}
          />
          <SelectField
            id={`${idPrefix}-airline`}
            label="Airline"
            icon="airline"
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
            icon="dep"
            value={form.departure}
            options={TIME_SLOTS}
            error={errors.departure}
            onChange={set("departure")}
          />
          <SelectField
            id={`${idPrefix}-arr`}
            label="Arrival"
            icon="arr"
            value={form.arrival}
            options={TIME_SLOTS}
            error={errors.arrival}
            onChange={set("arrival")}
          />
          <div className="field">
            <label className="field-label" htmlFor={`${idPrefix}-days`}>
              <Icon name="calendar" />
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
              <Icon name="clock" />
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
              <Icon name="route" />
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
              <Icon name="seat" />
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
  icon,
  value,
  options,
  error,
  onChange,
}: {
  id: string;
  label: string;
  icon: string;
  value: string;
  options: readonly string[];
  error?: string;
  onChange: (v: never) => void;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        <Icon name={icon} />
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

export function Icon({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 14,
    height: 14,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "source":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "dest":
      return (
        <svg {...common}>
          <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
          <circle cx="12" cy="11" r="2.5" />
        </svg>
      );
    case "airline":
      return (
        <svg {...common}>
          <path d="M2.5 19.5 21 12 2.5 4.5 6 12l-3.5 7.5Z" />
        </svg>
      );
    case "dep":
      return (
        <svg {...common}>
          <path d="M3 18h18M4 15l4-1 8-8 3 1-6 7 5 1 2-2" />
        </svg>
      );
    case "arr":
      return (
        <svg {...common}>
          <path d="M3 18h18M20 15l-4-1-8-8-3 1 6 7-5 1-2-2" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M4 10h16M8 3v4M16 3v4" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="13" r="7.5" />
          <path d="M12 9.5V13l2.5 2M9 2.5h6" />
        </svg>
      );
    case "route":
      return (
        <svg {...common}>
          <circle cx="5" cy="18" r="2.5" />
          <circle cx="19" cy="6" r="2.5" />
          <path d="M7.5 16.5C11 14 13 10 16.5 7.5" strokeDasharray="2.5 3" />
        </svg>
      );
    case "seat":
      return (
        <svg {...common}>
          <path d="M6 4v10a3 3 0 0 0 3 3h7" />
          <path d="M17 10v4a3 3 0 0 1-3 3" />
          <path d="M6 20h11" />
        </svg>
      );
    default:
      return null;
  }
}
