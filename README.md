Absolutely. Copy everything inside this single cell directly into your GitHub `README.md`.

````markdown
# ✈️ Flight Intelligence — Flight Price Prediction

<p align="center">
  <img src="https://img.shields.io/badge/Machine%20Learning-Regression-111111?style=for-the-badge" alt="Machine Learning">
  <img src="https://img.shields.io/badge/Backend-FastAPI-111111?style=for-the-badge" alt="FastAPI">
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-111111?style=for-the-badge" alt="React">
  <img src="https://img.shields.io/badge/3D-Three.js-111111?style=for-the-badge" alt="Three.js">
  <img src="https://img.shields.io/badge/Deploy-Vercel-111111?style=for-the-badge" alt="Vercel">
</p>

<p align="center">
  <strong>Predict flight ticket prices with a trained machine learning model through a modern, cinematic 3D web application.</strong>
</p>

<p align="center">
  <a href="https://flight-price-app-pi.vercel.app/">🌐 Live Demo</a>
  •
  <a href="#-features">Features</a>
  •
  <a href="#-machine-learning-pipeline">ML Pipeline</a>
  •
  <a href="#-tech-stack">Tech Stack</a>
</p>

---

## 🌟 Overview

**Flight Intelligence** is an end-to-end **Flight Price Prediction** project that combines a machine learning regression pipeline with a production-style web application.

The project takes historical flight data, performs data cleaning and feature engineering, compares multiple regression algorithms, tunes an **Extra Trees Regressor**, saves the trained model with **Joblib**, exposes predictions through **FastAPI**, and provides an interactive **React + TypeScript + 3D** frontend.

### 🎯 Core Idea

```text
Historical Flight Data
        ↓
   Data Cleaning
        ↓
  Feature Engineering
        ↓
    Train / Test
        ↓
   Preprocessing
        ↓
 Multiple ML Models
        ↓
   Evaluation
        ↓
Hyperparameter Tuning
        ↓
 Final Extra Trees Model
        ↓
   Saved Joblib Model
        ↓
      FastAPI
        ↓
 React + TypeScript UI
        ↓
   Predicted Price
````

---

## 🚀 Live Application

### 🌐 Production

**[https://flight-price-app-pi.vercel.app/](https://flight-price-app-pi.vercel.app/)**

Enter the flight details, submit the form, and the application sends the request to the prediction API, which runs the trained model and returns an estimated price.

> 💡 **Note:** The predicted amount is a machine-learning estimate based on historical data, not a guaranteed real-world ticket price.

---

## ✨ Features

* ✈️ Flight ticket price prediction
* 🧠 Machine learning regression pipeline
* 📊 Exploratory data analysis
* 🔧 Feature engineering
* 🔢 Categorical feature encoding
* 🌲 Extra Trees regression
* 🔍 Hyperparameter tuning with `RandomizedSearchCV`
* 📏 MAE, RMSE and R² evaluation
* 💾 Compressed Joblib model
* ⚡ FastAPI prediction backend
* ⚛️ React + TypeScript frontend
* 🎬 Framer Motion animations
* 🌐 Three.js / React Three Fiber 3D experience
* 📱 Responsive and mobile-safe UI
* ☁️ Vercel deployment

---

# 🧠 Machine Learning Pipeline

## 1️⃣ Dataset

The project uses the **Flight Price Prediction** dataset and works with:

```text
Data/Clean_Dataset.csv
```

### Dataset size

| Stage                   |    Rows | Columns |
| ----------------------- | ------: | ------: |
| Original                | 300,153 |      12 |
| After duplicate removal | 297,940 |      11 |

Missing values after cleaning:

```text
0
```

---

## 2️⃣ Feature Engineering

The final model uses these 10 input features:

```text
airline
source_city
departure_time
arrival_time
destination_city
duration
days_left
stops_encoded
route
class_encoded
```

### 🔄 Encoding

**Stops**

```text
zero          → 0
one           → 1
two_or_more   → 2
```

**Class**

```text
Economy  → 0
Business → 1
```

**Route**

```text
route = source_city + "_" + destination_city
```

The original `flight` column was removed because its code prefixes corresponded to airlines, making it redundant for this modeling setup.

---

## 3️⃣ Train / Test Split

The dataset was divided using:

```python
train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)
```

### Result

```text
Training samples : 238,352
Testing samples  : 59,588
```

---

## 4️⃣ Preprocessing

The machine learning pipeline uses:

* `ColumnTransformer`
* `OneHotEncoder(handle_unknown="ignore")`
* Numeric features passed through

Categorical features are converted into machine-readable binary columns while numerical features are preserved.

This also keeps training-time and prediction-time preprocessing consistent.

---

## 5️⃣ Models Compared

The project evaluates multiple regression algorithms:

| Model             |  MAE (₹) | RMSE (₹) |     R² |
| ----------------- | -------: | -------: | -----: |
| Linear Regression | 4,526.75 | 6,787.68 | 0.9103 |
| Ridge             | 4,526.17 | 6,787.60 | 0.9103 |
| Random Forest     | 1,072.37 | 2,734.12 | 0.9854 |
| Extra Trees       | 1,133.84 | 2,963.50 | 0.9829 |
| Gradient Boosting | 2,907.93 | 4,890.96 | 0.9534 |

> 📌 **Important:** MAE, RMSE and R² are **regression evaluation metrics**. They are not classification accuracy.

---

# 🏆 Final Model

## Extra Trees Regressor + Hyperparameter Tuning

The Extra Trees model was tuned using:

```text
RandomizedSearchCV
CV = 3
n_iter = 5
scoring = neg_root_mean_squared_error
n_jobs = -1
```

### 🔍 Best Parameters

```text
n_estimators       = 100
max_depth          = None
min_samples_split  = 10
min_samples_leaf   = 1
```

### 📈 Final Performance

```text
MAE  = ₹1,133.70
RMSE = ₹2,619.02
R²   = 0.9866
```

The final tuned model was selected based on the evaluation results obtained on the project's test data.

---

# 💾 Model Persistence

The trained model is stored as:

```text
model/flight_price_model_compressed.joblib
```

### Model size

```text
Original model     ≈ 542 MB
Compressed model   ≈ 146.35 MB
```

The application loads the saved model for inference instead of retraining it whenever a user requests a prediction.

---

# ⚡ Backend — FastAPI

The backend exposes the trained model through a REST API.

## API Endpoints

### ❤️ Health Check

```http
GET /api/health
```

Used to verify that the backend service is running.

### 🔮 Prediction

```http
POST /api/predict
```

The endpoint receives flight details, converts them into the feature structure expected by the model, performs inference, and returns the estimated price.

### Example response

```json
{
  "predicted_price": 2786.92
}
```

---

# 🎨 Frontend — Flight Intelligence

The frontend is designed as a cinematic aviation interface rather than a traditional form-based ML demo.

### 🛩️ Visual Experience

* 3D aircraft
* India flight network
* Animated city nodes
* Animated flight routes
* Cinematic introduction
* Interactive prediction interface
* Animated result display
* Responsive layouts
* Mobile-safe 3D fallback

The 3D interface is the **presentation layer**. The actual prediction is performed by the backend using the trained machine learning model.

---

# 🔄 Full Prediction Flow

```text
👤 User
  ↓
🖥️ React Frontend
  ↓
📨 POST /api/predict
  ↓
⚡ FastAPI
  ↓
🔧 Feature Transformation
  ↓
🌲 Saved Extra Trees Model
  ↓
💰 Predicted Price
  ↓
📦 JSON Response
  ↓
🎨 React Result Animation
```

---

# 🧩 Architecture

```text
                         ┌──────────────────────┐
                         │      React UI        │
                         │ TypeScript + Vite    │
                         │  3D / Animations     │
                         └──────────┬───────────┘
                                    │
                                    │ POST /api/predict
                                    ▼
                         ┌──────────────────────┐
                         │       FastAPI        │
                         │ Prediction Backend   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Feature Processing   │
                         │ Encoding + Route     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Extra Trees Model    │
                         │     Joblib File      │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Predicted Price    │
                         └──────────────────────┘
```

---

# 🛠️ Tech Stack

## 🧪 Data Science & ML

* 🐍 Python
* 🐼 Pandas
* 🔢 NumPy
* 📓 Jupyter Notebook
* 📊 Matplotlib
* 🌈 Seaborn
* 🤖 Scikit-learn
* 🔍 RandomizedSearchCV
* 💾 Joblib

## 🧠 Machine Learning

* Linear Regression
* Ridge Regression
* Random Forest Regressor
* Extra Trees Regressor
* Gradient Boosting Regressor
* ColumnTransformer
* OneHotEncoder
* Cross-validation
* Hyperparameter tuning

## ⚙️ Backend

* ⚡ FastAPI
* 🚀 Uvicorn
* 📦 REST API
* 🔄 JSON

## 🎨 Frontend

* ⚛️ React
* 🟦 TypeScript
* ⚡ Vite
* 🎨 Tailwind CSS
* 🎞️ Framer Motion

## 🧊 3D

* 🌐 Three.js
* ⚛️ React Three Fiber
* 🧰 Drei
* ✨ React Three Postprocessing

## ☁️ Development & Deployment

* 🔧 Git
* 🐙 GitHub
* ▲ Vercel

---

# 📁 Project Structure

```text
flight-price-prediction-ml/
│
├── 📂 Data/
│   ├── business.csv
│   ├── Clean_Dataset.csv
│   └── economy.csv
│
├── 📂 Notebooks/
│   ├── flight_price_eda.ipynb
│   └── flight_price_model.joblib
│
├── 📂 flight-price-app/
│   ├── 📂 api/
│   │   └── predict.py
│   │
│   ├── 📂 frontend/
│   │   ├── 📂 src/
│   │   ├── 📂 public/
│   │   └── ...
│   │
│   ├── 📂 model/
│   │   └── flight_price_model_compressed.joblib
│   │
│   ├── 📂 scripts/
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── vercel.json
│   └── README.md
│
└── ...
```

---

# ▶️ Run Locally

## 1️⃣ Start the Backend

From the `flight-price-app` directory:

```powershell
.\.venv-py312\Scripts\python.exe -m uvicorn api.predict:app --host 127.0.0.1 --port 8000
```

Backend:

```text
http://127.0.0.1:8000
```

---

## 2️⃣ Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite development server proxies `/api` requests to the FastAPI backend.

---

# 🚀 Deployment

The application is deployed using **Vercel**.

```text
GitHub Repository
        ↓
     Vercel
        ↓
    Build Process
        ↓
Frontend + API
        ↓
Production Deployment
```

### 🌍 Production URL

**[https://flight-price-app-pi.vercel.app/](https://flight-price-app-pi.vercel.app/)**

---

# 🛡️ Reliability & Mobile Support

The project includes frontend safeguards for devices that cannot reliably render the full 3D experience.

Implemented protections include:

* ✅ WebGL capability checks
* ✅ Scene error boundary
* ✅ Fallback rendering
* ✅ Cinematic intro fail-safe
* ✅ Reduced-motion / no-WebGL fallback behavior where supported

This allows the core application to remain usable even when full 3D rendering is unavailable.

---

# 📚 What This Project Demonstrates

This project demonstrates practical knowledge of:

```text
📊 Data Analysis
      +
🧹 Data Cleaning
      +
🔧 Feature Engineering
      +
🤖 Machine Learning
      +
📈 Model Evaluation
      +
🔍 Hyperparameter Tuning
      +
💾 Model Deployment
      +
⚡ FastAPI
      +
⚛️ React
      +
🧊 3D Web Development
      +
☁️ Cloud Deployment
```

---

# 🔮 Future Improvements

Possible next steps:

* 🌐 Real-time airline / booking API integration
* 📅 Time-aware validation
* 🔁 Automated model retraining
* 📡 Model monitoring
* 🔎 Explainable AI
* 📊 Feature importance dashboard
* 📈 Prediction confidence intervals
* 🪶 Model size / inference optimization
* 🌍 More recent and broader flight datasets

---

# 👨‍💻 Author

**Gurram Indrasena Yadav**

🎓 B.Tech — Bioscience & Engineering
🏫 NIT Calicut

---

## ⭐ If You Find This Project Interesting

Feel free to explore the repository and try the live application.

<p align="center">
  <strong>✈️ From historical flight data to a deployed ML-powered aviation interface.</strong>
</p>
```
