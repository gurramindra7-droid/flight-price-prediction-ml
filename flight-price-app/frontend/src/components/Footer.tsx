export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M2.5 19.5 21 12 2.5 4.5 6 12l-3.5 7.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>
            FLIGHT<em>INTELLIGENCE</em>
          </span>
        </div>

        <p className="footer-note">
          Predictions are machine-learning estimates from a trained Extra Trees model — not
          guaranteed airline prices.
        </p>

        <p className="footer-meta mono">
          scikit-learn · FastAPI · React · Three.js
        </p>
      </div>
    </footer>
  );
}
