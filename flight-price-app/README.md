# ✈️ Flight Intelligence

**Cinematic, ML-powered flight price prediction.**
A premium 3D web experience — React + Three.js frontend, Python FastAPI backend,
and a trained scikit-learn Extra Trees model doing the actual prediction.

> ⚠️ **Disclaimer:** all prices shown are machine-learning estimates from a trained
> model. They are **not** guaranteed airline prices and should not be used for
> booking decisions.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        React + TypeScript                      │
│   (Vite · Three.js / React Three Fiber · Framer Motion)        │
│                                                                │
│   Cinematic 3D intro → Hero → Prediction console → Model →     │
│   Route network → Footer                                       │
└──────────────────────────┬─────────────────────────────────────┘
                           │  POST /api/predict  (JSON)
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                      Python API (FastAPI)                      │
│                                                                │
│   1. Validate request (categories, ranges, types)              │
│   2. Encode:  stops → 0/1/2 · class → 0/1                      │
│   3. Feature:  route = "{source_city}_{destination_city}"      │
│   4. Build single-row pandas DataFrame (10 exact columns)      │
└──────────────────────────┬─────────────────────────────────────┘
                           │  model.predict(DataFrame)
                           ▼
┌────────────────────────────────────────────────────────────────┐
│        Trained model — model/flight_price_model_compressed     │
│        Pipeline: ColumnTransformer (OneHotEncoder)             │
│                  → ExtraTreesRegressor (100 trees)             │
│                  (scikit-learn 1.7.2)                          │
└──────────────────────────┬─────────────────────────────────────┘
                           │  predicted_price: float
                           ▼
                   JSON → React result UI
```

### Model input contract (reproduced exactly)

| Feature            | Type   | Notes                                    |
| ------------------ | ------ | ---------------------------------------- |
| `airline`          | cat    | Vistara, Air_India, Indigo, GO_FIRST, SpiceJet, AirAsia |
| `source_city`      | cat    | Delhi, Mumbai, Bangalore, Kolkata, Hyderabad, Chennai |
| `departure_time`   | cat    | Early_Morning … Late_Night               |
| `arrival_time`     | cat    | Early_Morning … Late_Night               |
| `destination_city` | cat    | same set as source_city                  |
| `duration`         | num    | 0.1 – 50 hours                           |
| `days_left`        | num    | 1 – 49                                   |
| `stops_encoded`    | int    | zero → 0, one → 1, two_or_more → 2       |
| `route`            | cat    | `source_city + "_" + destination_city`   |
| `class_encoded`    | int    | Economy → 0, Business → 1                |

The trained pipeline is the **source of truth** — it is loaded read-only,
never retrained, never modified.

### Model metrics (validation/test, held-out data)

| Metric | Value        |
| ------ | ------------ |
| MAE    | ₹1,133.70    |
| RMSE   | ₹2,619.02    |
| R²     | 0.9866       |

---

## Features

- **Cinematic 3D intro** — aircraft approach with atmospheric particles,
  runway lights, fog and a choreographed camera move (skippable, and fully
  static under `prefers-reduced-motion`).
- **Real predictions** — the prediction console posts to the Python API, which
  runs the actual trained model. No mocks, no JS approximations.
- **Route visualization** — animated source → destination arc that redraws
  whenever the cities change.
- **Model transparency** — pipeline explainer, all 10 input features, and the
  honest validation metrics.
- **Accessible** — semantic HTML, labeled controls, `aria-live` results,
  visible focus states, reduced-motion support.
- **Responsive** — reduced 3D load and simplified layouts on mobile.

## Tech stack

| Layer    | Tech                                                                 |
| -------- | -------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Three.js + React Three Fiber + drei, Framer Motion, Lenis |
| API      | Python, FastAPI, Uvicorn, pydantic                                   |
| ML       | scikit-learn 1.7.2, pandas, numpy, joblib                            |
| Deploy   | Vercel (static frontend + Python serverless function)                |

## Project structure

```
flight-price-app/
├── frontend/                  # React + TS + Vite app
│   ├── src/
│   │   ├── three/             # 3D scene: aircraft, particles, camera rig
│   │   ├── components/        # Hero, Prediction, Model, RouteMap, …
│   │   ├── hooks/             # smooth scroll, count-up
│   │   ├── api.ts             # typed API client + client-side validation
│   │   ├── constants.ts       # exact model categories
│   │   └── styles.css         # design system
│   ├── index.html
│   └── vite.config.ts
├── api/
│   └── predict.py             # FastAPI endpoint (loads the joblib model)
├── model/
│   └── flight_price_model_compressed.joblib   (Git LFS, ~146 MB)
├── scripts/
│   └── test_api.py            # end-to-end API test harness
├── requirements.txt           # Python deps (pinned for deployment)
├── vercel.json
└── README.md
```

---

## Local development

**Prereqs:** Node 20+, Python 3.12.

**1. Frontend**

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

**2. Python API** (in a second terminal, from the repo root)

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # Windows
# .venv/bin/pip install -r requirements.txt        # macOS/Linux
.venv/Scripts/python -m uvicorn api.predict:app --port 8000
```

The Vite dev server proxies `/api/*` to `http://127.0.0.1:8000`, so the app
works end-to-end out of the box.

**3. Run the API test suite**

```bash
.venv/Scripts/python scripts/test_api.py
```

This boots the API in-process and verifies valid predictions, every invalid-input
class, malformed JSON, and that API output exactly matches a direct model call.

### Environment variables

| Variable              | Side     | Purpose                                              |
| --------------------- | -------- | ---------------------------------------------------- |
| `VITE_API_BASE_URL`   | frontend | Optional. Absolute base URL of the API when hosted separately. Default: same origin. |
| `CORS_ALLOW_ORIGINS`  | API      | Comma-separated extra allowed origins.               |

---

## Vercel deployment

1. Import the repository into Vercel.
2. Framework preset: **Other**. `vercel.json` builds the frontend
   (`frontend → dist`) and deploys `api/predict.py` as the `/api/predict`
   serverless function automatically.
3. Python dependencies come from the root `requirements.txt`
   (scikit-learn pinned to **1.7.2** to match the training environment).

> **Note on size:** the model (~146 MB on disk, ~540 MB deserialized) plus
> scikit-learn/scipy is close to Vercel's function size and memory limits.
> If deployment fails on size or memory, either raise the function memory in
> the Vercel dashboard, or deploy the API to a container host (Render,
> Railway, Fly.io) and set `VITE_API_BASE_URL` to its URL — the frontend
> supports cross-origin API hosting out of the box, and the API accepts extra
> origins via `CORS_ALLOW_ORIGINS`.

---

## Deployment verification checklist

- `cd frontend && npm run build` — type-checks and builds the production bundle.
- `.venv/Scripts/python scripts/test_api.py` — 21-check end-to-end API suite.
