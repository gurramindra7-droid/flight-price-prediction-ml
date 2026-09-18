"""One-shot API test harness: boots uvicorn in a thread, runs the full
valid/invalid test matrix, cross-checks a prediction against a direct model
call, then exits. Used for local verification only — not deployed."""

import json
import sys
import threading
import time
import urllib.error
import urllib.request

import uvicorn

sys.path.insert(0, ".")
from api.predict import app, get_model  # noqa: E402

import pandas as pd  # noqa: E402

HOST, PORT = "127.0.0.1", 8123
BASE = f"http://{HOST}:{PORT}"


def request(method: str, path: str, body: dict | None = None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        BASE + path,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"} if data else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def main() -> int:
    import warnings

    warnings.filterwarnings("ignore")

    thread = threading.Thread(
        target=uvicorn.run,
        args=(app,),
        kwargs={"host": HOST, "port": PORT, "log_level": "error"},
        daemon=True,
    )
    thread.start()
    for _ in range(120):
        time.sleep(0.5)
        try:
            status, _ = request("GET", "/api/health")
            break
        except Exception:
            continue
    else:
        print("FAIL: server never came up")
        return 1

    failures = []

    def check(name: str, cond: bool, detail: str = ""):
        print(f"{'PASS' if cond else 'FAIL'}  {name}" + (f"  [{detail}]" if detail and not cond else ""))
        if not cond:
            failures.append(name)

    # ---- health ----
    status, body = request("GET", "/api/health")
    check("health returns 200", status == 200, str(body))

    # ---- valid predictions ----
    valid_cases = [
        dict(airline="Vistara", source_city="Delhi", destination_city="Mumbai",
             departure_time="Morning", arrival_time="Evening", duration=2.5,
             days_left=15, stops="one", **{"class": "Economy"}),
        dict(airline="Air_India", source_city="Bangalore", destination_city="Kolkata",
             departure_time="Early_Morning", arrival_time="Night", duration=6.0,
             days_left=3, stops="zero", **{"class": "Business"}),
        dict(airline="SpiceJet", source_city="Hyderabad", destination_city="Chennai",
             departure_time="Late_Night", arrival_time="Early_Morning", duration=1.2,
             days_left=49, stops="two_or_more", **{"class": "Economy"}),
        dict(airline="Indigo", source_city="Mumbai", destination_city="Delhi",
             departure_time="Afternoon", arrival_time="Afternoon", duration=2.1,
             days_left=25, stops="zero", **{"class": "Business"}),
    ]
    for i, case in enumerate(valid_cases):
        status, body = request("POST", "/api/predict", case)
        ok = status == 200 and isinstance(body.get("predicted_price"), (int, float)) and body["predicted_price"] > 0
        check(f"valid case {i + 1} -> 200 + positive price", ok, f"{status} {body}")
        if ok:
            print(f"      price: {body['predicted_price']}  ({case['source_city']}->{case['destination_city']}, {case['class']})")

    # ---- cross-check API vs direct model call ----
    case = valid_cases[0]
    features = {
        "airline": case["airline"],
        "source_city": case["source_city"],
        "departure_time": case["departure_time"],
        "arrival_time": case["arrival_time"],
        "destination_city": case["destination_city"],
        "duration": case["duration"],
        "days_left": case["days_left"],
        "stops_encoded": {"zero": 0, "one": 1, "two_or_more": 2}[case["stops"]],
        "route": f"{case['source_city']}_{case['destination_city']}",
        "class_encoded": {"Economy": 0, "Business": 1}[case["class"]],
    }
    columns = ["airline", "source_city", "departure_time", "arrival_time",
               "destination_city", "duration", "days_left", "stops_encoded",
               "route", "class_encoded"]
    direct = float(get_model().predict(pd.DataFrame([features], columns=columns))[0])
    status, body = request("POST", "/api/predict", case)
    api_price = body.get("predicted_price")
    check("API matches direct model call", status == 200 and abs(api_price - direct) < 0.01,
          f"api={api_price} direct={direct}")
    print(f"      api={api_price}  direct={direct}")

    # ---- invalid inputs ----
    invalid_cases = [
        ("same city", dict(valid_cases[0], destination_city="Delhi"), 422),
        ("bad airline", dict(valid_cases[0], airline="Emirates"), 422),
        ("bad city", dict(valid_cases[0], source_city="Paris"), 422),
        ("bad time slot", dict(valid_cases[0], departure_time="Noon"), 422),
        ("bad stops", dict(valid_cases[0], stops="three"), 422),
        ("bad class", dict(valid_cases[0], **{"class": "First"}), 422),
        ("duration too high", dict(valid_cases[0], duration=51), 422),
        ("duration too low", dict(valid_cases[0], duration=0.05), 422),
        ("days_left too high", dict(valid_cases[0], days_left=50), 422),
        ("days_left float", dict(valid_cases[0], days_left=3.5), 422),
        ("missing field", {k: v for k, v in valid_cases[0].items() if k != "duration"}, 422),
        ("duration as string", dict(valid_cases[0], duration="2.5"), 422),
        ("days_left as string", dict(valid_cases[0], days_left="15"), 422),
    ]
    for name, payload, expected in invalid_cases:
        status, body = request("POST", "/api/predict", payload)
        has_msg = isinstance(body.get("error"), dict) and bool(body["error"].get("message"))
        check(f"invalid '{name}' -> {expected} + message", status == expected and has_msg,
              f"{status} {body}")

    # ---- malformed body ----
    req = urllib.request.Request(BASE + "/api/predict", data=b"{not json", method="POST",
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            status = res.status
    except urllib.error.HTTPError as e:
        status = e.code
    check("malformed JSON -> 400", status == 400, str(status))

    print()
    if failures:
        print(f"{len(failures)} FAILURE(S): {failures}")
        return 1
    print("ALL TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
