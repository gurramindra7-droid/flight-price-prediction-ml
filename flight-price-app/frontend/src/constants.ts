/** Machine constants — mirror the trained model's OneHotEncoder categories exactly. */

export const AIRLINES = [
  "Vistara",
  "Air_India",
  "Indigo",
  "GO_FIRST",
  "SpiceJet",
  "AirAsia",
] as const;

export const CITIES = [
  "Delhi",
  "Mumbai",
  "Bangalore",
  "Kolkata",
  "Hyderabad",
  "Chennai",
] as const;

export const TIME_SLOTS = [
  "Early_Morning",
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
  "Late_Night",
] as const;

export const STOPS = ["zero", "one", "two_or_more"] as const;

export const CLASSES = ["Economy", "Business"] as const;

export type Airline = (typeof AIRLINES)[number];
export type City = (typeof CITIES)[number];
export type TimeSlot = (typeof TIME_SLOTS)[number];
export type Stops = (typeof STOPS)[number];
export type FlightClass = (typeof CLASSES)[number];

export const DURATION = { min: 0.1, max: 50, step: 0.1, default: 2.5 } as const;
export const DAYS_LEFT = { min: 1, max: 49, step: 1, default: 15 } as const;

/** Human-readable labels for machine category values. */
export const AIRLINE_LABEL: Record<Airline, string> = {
  Vistara: "Vistara",
  Air_India: "Air India",
  Indigo: "IndiGo",
  GO_FIRST: "Go First",
  SpiceJet: "SpiceJet",
  AirAsia: "AirAsia",
};

export const TIME_LABEL: Record<TimeSlot, string> = {
  Early_Morning: "Early Morning",
  Morning: "Morning",
  Afternoon: "Afternoon",
  Evening: "Evening",
  Night: "Night",
  Late_Night: "Late Night",
};

export const STOPS_LABEL: Record<Stops, string> = {
  zero: "Non-stop",
  one: "1 Stop",
  two_or_more: "2+ Stops",
};

/** Approximate schematic positions on the stylized India map (0–100 space).
 *  Treated as a visualization, not a geographic navigation map. */
export const CITY_POS: Record<City, { x: number; y: number }> = {
  Delhi: { x: 48, y: 24 },
  Mumbai: { x: 30, y: 62 },
  Bangalore: { x: 44, y: 80 },
  Kolkata: { x: 72, y: 46 },
  Hyderabad: { x: 45, y: 63 },
  Chennai: { x: 50, y: 86 },
};
