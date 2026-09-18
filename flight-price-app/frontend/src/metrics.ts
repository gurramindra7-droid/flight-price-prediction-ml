/** Actual validation/test metrics from the trained model — no invented numbers. */
export const METRICS = [
  { label: "MAE", value: "₹1,133.70", hint: "Mean absolute error" },
  { label: "RMSE", value: "₹2,619.02", hint: "Root mean squared error" },
  { label: "R²", value: "0.9866", hint: "Coefficient of determination" },
] as const;
