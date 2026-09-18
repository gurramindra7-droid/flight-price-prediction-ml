import type { Airline, City, FlightClass, Stops, TimeSlot } from "./constants";

/** Client-side form state (API field names are applied at request time). */
export interface FlightForm {
  airline: Airline;
  source: City;
  destination: City;
  departure: TimeSlot;
  arrival: TimeSlot;
  daysLeft: number;
  duration: number;
  stops: Stops;
  cls: FlightClass;
}

export const DEFAULT_FORM: FlightForm = {
  airline: "Vistara",
  source: "Delhi",
  destination: "Mumbai",
  departure: "Morning",
  arrival: "Evening",
  daysLeft: 15,
  duration: 2.5,
  stops: "one",
  cls: "Economy",
};

export type FormUpdater = <K extends keyof FlightForm>(key: K, value: FlightForm[K]) => void;
