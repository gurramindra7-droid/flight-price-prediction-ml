import {
  AIRLINES,
  CITIES,
  CLASSES,
  DURATION,
  DAYS_LEFT,
  STOPS,
  TIME_SLOTS,
  type Airline,
  type City,
  type FlightClass,
  type Stops,
  type TimeSlot,
} from "./constants";

export interface PredictionInput {
  airline: Airline;
  source_city: City;
  destination_city: City;
  departure_time: TimeSlot;
  arrival_time: TimeSlot;
  duration: number;
  days_left: number;
  stops: Stops;
  class: FlightClass;
}

export interface PredictionResult {
  predicted_price: number;
  /** Client-side echo of the request for the result card. */
  meta?: PredictionInput;
}

type ApiErrorBody = {
  error?: { code?: string; field?: string; message?: string };
};

/** Optional override for cross-origin deployments (e.g. API hosted separately).
 *  Defaults to same-origin "/api/predict" — the standard Vercel layout. */
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

/** Local, instant mirror of the API validation for inline field errors. */
export function validateInput(
  input: PredictionInput,
): Partial<Record<keyof PredictionInput, string>> {
  const errors: Partial<Record<keyof PredictionInput, string>> = {};

  if (input.source_city === input.destination_city) {
    errors.destination_city = "Source and destination must be different.";
  }
  if (!Number.isFinite(input.duration) || input.duration < DURATION.min || input.duration > DURATION.max) {
    errors.duration = `Duration must be between ${DURATION.min} and ${DURATION.max} hours.`;
  }
  if (!Number.isInteger(input.days_left) || input.days_left < DAYS_LEFT.min || input.days_left > DAYS_LEFT.max) {
    errors.days_left = `Days left must be between ${DAYS_LEFT.min} and ${DAYS_LEFT.max}.`;
  }

  const check = <T extends string>(value: T, allowed: readonly T[], key: keyof PredictionInput) => {
    if (!allowed.includes(value)) {
      errors[key] = "Invalid selection.";
    }
  };
  check(input.airline, AIRLINES, "airline");
  check(input.source_city, CITIES, "source_city");
  check(input.destination_city, CITIES, "destination_city");
  check(input.departure_time, TIME_SLOTS, "departure_time");
  check(input.arrival_time, TIME_SLOTS, "arrival_time");
  check(input.stops, STOPS, "stops");
  check(input.class, CLASSES, "class");

  return errors;
}

export class ApiError extends Error {
  readonly field?: string;
  readonly code: string;

  constructor(message: string, code = "API_ERROR", field?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.field = field;
  }
}

/** POST the payload to the Python prediction API and return the real model price. */
export async function predictPrice(input: PredictionInput): Promise<PredictionResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    // Network failure / server offline — never surface raw internals.
    throw new ApiError(
      "Could not reach the prediction service. Check that the API is running and try again.",
      "NETWORK_ERROR",
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("The prediction service returned an unreadable response.", "BAD_RESPONSE");
  }

  if (!response.ok) {
    const err = (body as ApiErrorBody)?.error;
    throw new ApiError(
      err?.message ?? "The prediction service reported a problem. Please try again.",
      err?.code ?? `HTTP_${response.status}`,
      err?.field,
    );
  }

  const price = (body as { predicted_price?: unknown })?.predicted_price;
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    throw new ApiError("The prediction service returned an unexpected result.", "BAD_RESPONSE");
  }

  return { predicted_price: price, meta: input };
}
