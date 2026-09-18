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

/* ------------------------------------------------------------------ */
/* 3D route network data                                               */
/* ------------------------------------------------------------------ */

/** Approximate real geographic coordinates (lat, lon) of the six cities.
 *  Used only to project markers onto the stylized 3D map. */
export const CITY_GEO: Record<City, { lat: number; lon: number }> = {
  Delhi: { lat: 28.61, lon: 77.21 },
  Mumbai: { lat: 19.08, lon: 72.88 },
  Bangalore: { lat: 12.97, lon: 77.59 },
  Kolkata: { lat: 22.57, lon: 88.36 },
  Hyderabad: { lat: 17.39, lon: 78.49 },
  Chennai: { lat: 13.08, lon: 80.27 },
};

/** City metadata for hover cards and labels. */
export const CITY_INFO: Record<
  City,
  { code: string; state: string; elevFt: number; blurb: string }
> = {
  Delhi: {
    code: "DEL",
    state: "New Delhi",
    elevFt: 777,
    blurb: "Northern hub and busiest origin in the network.",
  },
  Mumbai: {
    code: "BOM",
    state: "Maharashtra",
    elevFt: 39,
    blurb: "Coastal financial capital, dense trunk routes.",
  },
  Bangalore: {
    code: "BLR",
    state: "Karnataka",
    elevFt: 3020,
    blurb: "Deccan tech corridor on the southern plateau.",
  },
  Kolkata: {
    code: "CCU",
    state: "West Bengal",
    elevFt: 20,
    blurb: "Eastern gateway near the Hooghly delta.",
  },
  Hyderabad: {
    code: "HYD",
    state: "Telangana",
    elevFt: 1780,
    blurb: "Central-south crossroads of the Deccan.",
  },
  Chennai: {
    code: "MAA",
    state: "Tamil Nadu",
    elevFt: 52,
    blurb: "Coromandel coast port city in the far south.",
  },
};

/** Curated inter-city routes drawn as arcs on the 3D map
 *  (mirrors the busiest domestic corridors in the training data). */
export const ROUTE_ARCS: [City, City][] = [
  ["Delhi", "Mumbai"],
  ["Delhi", "Bangalore"],
  ["Delhi", "Kolkata"],
  ["Delhi", "Hyderabad"],
  ["Mumbai", "Bangalore"],
  ["Mumbai", "Hyderabad"],
  ["Bangalore", "Kolkata"],
  ["Bangalore", "Chennai"],
  ["Hyderabad", "Chennai"],
  ["Mumbai", "Chennai"],
];

/**
 * City imagery — Wikimedia Commons (freely licensed), served through the
 * official Wikipedia pageimages API. Lazy-loaded with a blur-up and a solid
 * color fallback when offline or blocked.
 */
export const CITY_IMAGE: Record<City, { src: string; credit: string }> = {
  Delhi: {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Jama_Masjid_2011.jpg/500px-Jama_Masjid_2011.jpg",
    credit: "Jama Masjid — Wikimedia Commons",
  },
  Mumbai: {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/Mumbai_Bandra-Worli_Sea_Link.jpg/500px-Mumbai_Bandra-Worli_Sea_Link.jpg",
    credit: "Bandra-Worli Sea Link — Wikimedia Commons",
  },
  Bangalore: {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/View_from_Visvesvaraya_Industrial_and_Technological_Museum_%282025%29_02.jpg/500px-View_from_Visvesvaraya_Industrial_and_Technological_Museum_%282025%29_02.jpg",
    credit: "Bengaluru skyline — Wikimedia Commons",
  },
  Kolkata: {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Kolkata_maidan.jpg/500px-Kolkata_maidan.jpg",
    credit: "Kolkata Maidan — Wikimedia Commons",
  },
  Hyderabad: {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Aerial_view_of_Durgam_cheruvu_and_Hitech_CIty.jpg/500px-Aerial_view_of_Durgam_cheruvu_and_Hitech_CIty.jpg",
    credit: "HITEC City aerial — Wikimedia Commons",
  },
  Chennai: {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/Chennai_Central.jpg/500px-Chennai_Central.jpg",
    credit: "Chennai Central — Wikimedia Commons",
  },
};
