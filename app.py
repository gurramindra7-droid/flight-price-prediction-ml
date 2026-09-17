import streamlit as st
import pandas as pd
import joblib
from pathlib import Path

# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="Flight Price Prediction",
    page_icon="✈️",
    layout="wide"
)

# ============================================================
# LOAD MODEL
# ============================================================

MODEL_PATH = Path(__file__).parent / "flight_price_model_compressed.joblib"

try:
    model = joblib.load(MODEL_PATH)
except Exception as e:
    st.error(f"Could not load the model: {e}")
    st.stop()

# ============================================================
# TITLE
# ============================================================

st.title("✈️ Flight Price Prediction")
st.write(
    "Enter the flight details below to estimate the ticket price."
)

st.divider()

# ============================================================
# INPUTS
# ============================================================

col1, col2 = st.columns(2)

with col1:

    airline = st.selectbox(
        "Airline",
        [
            "Air_India",
            "AirAsia",
            "GO_FIRST",
            "Indigo",
            "SpiceJet",
            "Vistara"
        ]
    )

    source_city = st.selectbox(
        "Source City",
        [
            "Delhi",
            "Mumbai",
            "Bangalore",
            "Kolkata",
            "Hyderabad",
            "Chennai"
        ]
    )

    destination_city = st.selectbox(
        "Destination City",
        [
            "Delhi",
            "Mumbai",
            "Bangalore",
            "Kolkata",
            "Hyderabad",
            "Chennai"
        ]
    )

    departure_time = st.selectbox(
        "Departure Time",
        [
            "Early_Morning",
            "Morning",
            "Afternoon",
            "Evening",
            "Night",
            "Late_Night"
        ]
    )

with col2:

    arrival_time = st.selectbox(
        "Arrival Time",
        [
            "Early_Morning",
            "Morning",
            "Afternoon",
            "Evening",
            "Night",
            "Late_Night"
        ]
    )

    duration = st.number_input(
        "Duration (hours)",
        min_value=0.1,
        max_value=50.0,
        value=10.0,
        step=0.1
    )

    days_left = st.number_input(
        "Days Left Before Departure",
        min_value=1,
        max_value=49,
        value=15,
        step=1
    )

    stops = st.selectbox(
        "Number of Stops",
        [
            "zero",
            "one",
            "two_or_more"
        ]
    )

    flight_class = st.selectbox(
        "Class",
        [
            "Economy",
            "Business"
        ]
    )

# ============================================================
# PREDICTION
# ============================================================

st.divider()

if st.button("🔮 Predict Flight Price", use_container_width=True):

    # Encode stops
    stops_mapping = {
        "zero": 0,
        "one": 1,
        "two_or_more": 2
    }

    stops_encoded = stops_mapping[stops]

    # Encode class
    class_mapping = {
        "Economy": 0,
        "Business": 1
    }

    class_encoded = class_mapping[flight_class]

    # Create route
    route = source_city + "_" + destination_city

    # Create input dataframe
    input_data = pd.DataFrame({
        "airline": [airline],
        "source_city": [source_city],
        "departure_time": [departure_time],
        "arrival_time": [arrival_time],
        "destination_city": [destination_city],
        "duration": [duration],
        "days_left": [days_left],
        "stops_encoded": [stops_encoded],
        "route": [route],
        "class_encoded": [class_encoded]
    })

    # Predict
    try:

        prediction = model.predict(input_data)[0]

        st.success("Prediction completed successfully!")

        st.metric(
            label="Estimated Flight Price",
            value=f"₹{prediction:,.2f}"
        )

        st.info(
            f"Route: {source_city} → {destination_city}"
        )

    except Exception as e:

        st.error(f"Prediction failed: {e}")

# ============================================================
# FOOTER
# ============================================================

st.divider()

st.caption(
    "Flight Price Prediction • Machine Learning Regression Project"
)