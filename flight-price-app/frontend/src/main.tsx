import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root container missing");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Dismiss the boot screen once React has painted.
requestAnimationFrame(() => {
  const boot = document.getElementById("boot");
  if (boot) {
    boot.dataset.done = "true";
    window.setTimeout(() => boot.remove(), 700);
  }
});
