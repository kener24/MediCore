#!/usr/bin/env python3
"""Bounded, read-only HTTP load probe for MediCore."""

import concurrent.futures
import json
import os
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


BASE_URL = os.environ.get("MEDICORE_LOAD_URL", "http://127.0.0.1:8000").rstrip("/")
EMAIL = os.environ.get("MEDICORE_LOAD_EMAIL", "")
PASSWORD = os.environ.get("MEDICORE_LOAD_PASSWORD", "")
PATHS = [item.strip() for item in os.environ.get("MEDICORE_LOAD_PATHS", "/health/ready/").split(",") if item.strip()]
LEVELS = [int(item) for item in os.environ.get("MEDICORE_LOAD_LEVELS", "5,10,25,50").split(",")]
REQUESTS_PER_WORKER = int(os.environ.get("MEDICORE_LOAD_REQUESTS_PER_WORKER", "5"))


def percentile(values, ratio):
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, max(0, int(len(ordered) * ratio) - 1))]


def request_json(path, method="GET", payload=None, headers=None):
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        f"{BASE_URL}{path}", data=body, method=method,
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            data = response.read()
            return response.status, (time.perf_counter() - started) * 1000, len(data), data
    except urllib.error.HTTPError as exc:
        return exc.code, (time.perf_counter() - started) * 1000, 0, exc.read()
    except Exception:
        return 0, (time.perf_counter() - started) * 1000, 0, b""


def auth_headers():
    if not EMAIL or not PASSWORD:
        return {}
    status, _, _, body = request_json(
        "/api/auth/login/", "POST", {"email": EMAIL, "password": PASSWORD}
    )
    if status != 200:
        raise SystemExit(f"Authentication failed with HTTP {status}")
    payload = json.loads(body)
    headers = {"Authorization": f"Bearer {payload['access']}"}
    session_key = payload.get("session_key") or payload.get("session")
    if session_key:
        headers["X-Session-Key"] = session_key
    return headers


def run_one(headers, index):
    return request_json(PATHS[index % len(PATHS)], headers=headers)[:3]


def main():
    hostname = urllib.parse.urlparse(BASE_URL).hostname or ""
    production = hostname not in {"127.0.0.1", "localhost", "::1"}
    if production and max(LEVELS) > 10 and os.environ.get("MEDICORE_ALLOW_PRODUCTION_HIGH_LOAD") != "true":
        raise SystemExit("Production probes are capped at concurrency 10 unless explicitly enabled.")
    headers = auth_headers()
    results = []
    for concurrency in LEVELS:
        total = concurrency * REQUESTS_PER_WORKER
        started = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
            samples = list(pool.map(lambda index: run_one(headers, index), range(total)))
        elapsed = time.perf_counter() - started
        timings = [sample[1] for sample in samples]
        errors = sum(1 for status, _, _ in samples if status < 200 or status >= 400)
        results.append({
            "concurrency": concurrency,
            "requests": total,
            "errors": errors,
            "rps": round(total / elapsed, 2),
            "p50_ms": round(statistics.median(timings), 2),
            "p95_ms": round(percentile(timings, 0.95), 2),
            "p99_ms": round(percentile(timings, 0.99), 2),
            "response_bytes": sum(sample[2] for sample in samples),
        })
        if errors:
            break
    print(json.dumps({"base_url": BASE_URL, "paths": PATHS, "results": results}, indent=2))
    return 1 if any(item["errors"] for item in results) else 0


if __name__ == "__main__":
    sys.exit(main())
