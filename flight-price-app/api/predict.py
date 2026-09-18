"""Flight Intelligence — Prediction API
=======================================

Loads the pre-trained flight price model (Extra Trees Regressor wrapped in a
scikit-learn Pipeline) and exposes a validated JSON prediction endpoint.

The model file `model/flight_price_model_compressed.joblib` is the source of
truth. It is NEVER modified, retrained or replaced by this service. It is
loaded once per server process and reused across requests (module-level
singleton, guarded by a lock for thread safety).

Model input contract (reproduced exactly from the trained pipeline):
    airline, source_city, departure_time, arrival_time, destination_city,
    duration, days_left, stops_encoded, route, class_encoded

Mappings (identical to the original training pipeline):
    stops  : zero -> 0, one -> 1, two_or_more -> 2
    class  : Economy -> 0, Business -> 1
    route  : "{source_city}_{destination_city}"

Local development:
    uvicorn api.predict:app --host 127.0.0.1 --port 8000
    (or simply: python api/predict.py)

On Vercel this file is deployed as the serverless function /api/predict.
"""

from __future__ import annotations

import logging
import os
import threading
import warnings
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(message)s",
)

logger = logging.getLogger("flight-intelligence")


# ---------------------------------------------------------------------------
# Constants — categorical options mirror the trained OneHotEncoder categories
# ---------------------------------------------------------------------------

MODEL_PATH = (
    Path(__file__).resolve().parent.parent
    / "model"
    / "flight_price_model_compressed.joblib"
)

AIRLINES = (
    "Air_India",
    "AirAsia",
    "GO_FIRST",
    "Indigo",
    "SpiceJet",
    "Vistara",
)

CITIES = (
    "Bangalore",
    "Chennai",
    "Delhi",
    "Hyderabad",
    "Kolkata",
    "Mumbai",
)

TIME_SLOTS = (
    "Early_Morning",
    "Morning",
    "Afternoon",
    "Evening",
    "Night",
    "Late_Night",
)

STOPS = (
    "zero",
    "one",
    "two_or_more",
)

CLASSES = (
    "Economy",
    "Business",
)

STOPS_ENCODING = {
    "zero": 0,
    "one": 1,
    "two_or_more": 2,
}

CLASS_ENCODING = {
    "Economy": 0,
    "Business": 1,
}

DURATION_MIN = 0.1
DURATION_MAX = 50.0

DAYS_LEFT_MIN = 1
DAYS_LEFT_MAX = 49


# Exact column order expected by the trained pipeline.
FEATURE_COLUMNS = [
    "airline",
    "source_city",
    "departure_time",
    "arrival_time",
    "destination_city",
    "duration",
    "days_left",
    "stops_encoded",
    "route",
    "class_encoded",
]


# ---------------------------------------------------------------------------
# Model singleton — loaded once, reused across invocations
# ---------------------------------------------------------------------------

_model: Any | None = None
_model_lock = threading.Lock()
_model_error: str | None = None


def _load_model() -> Any:
    """Load (once) and return the trained scikit-learn pipeline."""

    global _model, _model_error

    if _model is not None:
        return _model

    with _model_lock:
        if _model is not None:
            return _model

        if not MODEL_PATH.is_file():
            _model_error = "Model artifact is unavailable."
            logger.error("model file not found at expected location")
            raise RuntimeError(_model_error)

        try:
            with warnings.catch_warnings():
                # A version mismatch produces noisy but non-fatal warnings;
                # the pipeline itself is unpickled unchanged.
                warnings.simplefilter("ignore", UserWarning)

                model = joblib.load(MODEL_PATH)

        except Exception:
            _model_error = "Model could not be loaded."
            logger.exception("failed to load model artifact")
            raise RuntimeError(_model_error) from None

        _model = model

        logger.info("model loaded successfully")

        return _model


def get_model() -> Any:
    """Public accessor used by the prediction endpoint."""

    if _model is None:
        return _load_model()

    return _model


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class PredictionRequest(BaseModel):
    airline: str = Field(
        ...,
        description="One of the trained airline categories",
    )

    source_city: str

    departure_time: str

    arrival_time: str

    destination_city: str

    duration: float

    days_left: int

    stops: str

    class_: str = Field(
        ...,
        alias="class",
    )

    model_config = {
        "populate_by_name": True
    }


class PredictionResponse(BaseModel):
    predicted_price: float


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _field_error(
    field: str,
    message: str,
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "field": field,
                "message": message,
            }
        },
    )


def validate_payload(
    payload: dict[str, Any],
) -> tuple[
    dict[str, Any] | None,
    JSONResponse | None,
]:
    """Validate every input against the trained model's known categories.

    Returns:
        (normalized_features, error_response)

    Exactly one is non-None.
    """

    required = (
        "airline",
        "source_city",
        "departure_time",
        "arrival_time",
        "destination_city",
        "duration",
        "days_left",
        "stops",
        "class",
    )

    # -----------------------------------------------------------------------
    # Required fields
    # -----------------------------------------------------------------------

    for key in required:
        if key not in payload:
            return None, _field_error(
                key,
                "This field is required.",
            )

    # -----------------------------------------------------------------------
    # Categorical validation
    # -----------------------------------------------------------------------

    for key, allowed in (
        ("airline", AIRLINES),
        ("source_city", CITIES),
        ("departure_time", TIME_SLOTS),
        ("arrival_time", TIME_SLOTS),
        ("destination_city", CITIES),
        ("stops", STOPS),
        ("class", CLASSES),
    ):
        value = payload[key]

        if not isinstance(value, str) or value not in allowed:
            return None, _field_error(
                key,
                f"Must be one of: {', '.join(allowed)}.",
            )

    # -----------------------------------------------------------------------
    # Source and destination validation
    # -----------------------------------------------------------------------

    if payload["source_city"] == payload["destination_city"]:
        return None, _field_error(
            "destination_city",
            "Source and destination cities must be different.",
        )

    # -----------------------------------------------------------------------
    # Numeric validation — duration
    # -----------------------------------------------------------------------

    duration = payload["duration"]

    if isinstance(duration, bool) or not isinstance(
        duration,
        (int, float),
    ):
        return None, _field_error(
            "duration",
            "Duration must be a number (0.1 – 50 hours).",
        )

    duration = float(duration)

    if duration != duration or duration in (
        float("inf"),
        float("-inf"),
    ):
        return None, _field_error(
            "duration",
            "Duration must be a finite number.",
        )

    if not (
        DURATION_MIN <= duration <= DURATION_MAX
    ):
        return None, _field_error(
            "duration",
            "Duration must be between 0.1 and 50 hours.",
        )

    # -----------------------------------------------------------------------
    # Numeric validation — days left
    # -----------------------------------------------------------------------

    days_left = payload["days_left"]

    if isinstance(days_left, bool) or not isinstance(
        days_left,
        int,
    ):
        return None, _field_error(
            "days_left",
            "Days left must be a whole number (1 – 49).",
        )

    if not (
        DAYS_LEFT_MIN <= days_left <= DAYS_LEFT_MAX
    ):
        return None, _field_error(
            "days_left",
            "Days left must be between 1 and 49.",
        )

    # -----------------------------------------------------------------------
    # Feature engineering
    #
    # IMPORTANT:
    # These transformations must remain identical to the trained model.
    # -----------------------------------------------------------------------

    features = {
        "airline": payload["airline"],
        "source_city": payload["source_city"],
        "departure_time": payload["departure_time"],
        "arrival_time": payload["arrival_time"],
        "destination_city": payload["destination_city"],
        "duration": duration,
        "days_left": int(days_left),
        "stops_encoded": STOPS_ENCODING[payload["stops"]],
        "route": (
            f"{payload['source_city']}_"
            f"{payload['destination_city']}"
        ),
        "class_encoded": CLASS_ENCODING[payload["class"]],
    }

    return features, None


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(_: FastAPI):
    """Warm the model when the server starts."""

    try:
        get_model()

    except RuntimeError:
        # The prediction endpoint will return HTTP 503 if the
        # model is unavailable.
        pass

    yield


app = FastAPI(
    title="Flight Intelligence API",
    version="1.0.0",
    description="ML-powered flight price estimation endpoint.",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

# Same-origin in production; localhost origins for local development.
# Additional origins can be supplied through:
#
# CORS_ALLOW_ORIGINS
#
# Example:
# CORS_ALLOW_ORIGINS=https://example.vercel.app

_extra_origins = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOW_ORIGINS",
        "",
    ).split(",")
    if origin.strip()
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *_extra_origins,
    ],
    allow_methods=[
        "GET",
        "POST",
    ],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health() -> dict[str, str]:
    if _model is not None:
        return {
            "status": "ok"
        }

    return {
        "status": "degraded" if _model_error else "ok"
    }


# ---------------------------------------------------------------------------
# Prediction endpoint
# ---------------------------------------------------------------------------

@app.post(
    "/api/predict",
    response_model=PredictionResponse,
)
async def predict(
    request: Request,
) -> PredictionResponse | JSONResponse:

    # -----------------------------------------------------------------------
    # Parse JSON
    # -----------------------------------------------------------------------

    try:
        payload = await request.json()

    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "INVALID_JSON",
                    "message": "Request body must be valid JSON.",
                }
            },
        )

    # -----------------------------------------------------------------------
    # Body validation
    # -----------------------------------------------------------------------

    if not isinstance(payload, dict):
        return _field_error(
            "body",
            "Request body must be a JSON object.",
        )

    # -----------------------------------------------------------------------
    # Feature validation + engineering
    # -----------------------------------------------------------------------

    features, error = validate_payload(payload)

    if error is not None or features is None:
        return error  # type: ignore[return-value]

    # -----------------------------------------------------------------------
    # Load model
    # -----------------------------------------------------------------------

    try:
        model = get_model()

    except RuntimeError:
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "MODEL_UNAVAILABLE",
                    "message": (
                        "The prediction model is temporarily unavailable. "
                        "Please try again later."
                    ),
                }
            },
        )

    # -----------------------------------------------------------------------
    # Prediction
    # -----------------------------------------------------------------------

    try:
        frame = pd.DataFrame(
            [features],
            columns=FEATURE_COLUMNS,
        )

        prediction = model.predict(frame)

        price = float(prediction[0])

        # NaN guard
        if price != price:
            raise ValueError(
                "model produced a non-finite price"
            )

    except Exception:
        logger.exception("prediction failed")

        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "PREDICTION_FAILED",
                    "message": (
                        "Prediction could not be completed. "
                        "Please try again."
                    ),
                }
            },
        )

    return PredictionResponse(
        predicted_price=round(price, 2)
    )


# ---------------------------------------------------------------------------
# React / Vite frontend
# ---------------------------------------------------------------------------
#
# Vercel builds the frontend into:
#
# flight-price-app/frontend/dist
#
# This makes FastAPI serve that production build at:
#
# /
#
# The /api/health and /api/predict routes are declared BEFORE this mount,
# so those API routes continue to take priority.
#
# check_dir=False allows the backend to start locally even if the frontend
# has not been built yet.
# ---------------------------------------------------------------------------

FRONTEND_DIR = (
    Path(__file__).resolve().parent.parent
    / "frontend"
    / "dist"
)

app.mount(
    "/",
    StaticFiles(
        directory=FRONTEND_DIR,
        html=True,
        check_dir=False,
    ),
    name="frontend",
)


# ---------------------------------------------------------------------------
# Local development entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
    )