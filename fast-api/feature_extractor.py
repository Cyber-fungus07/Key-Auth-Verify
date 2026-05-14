"""
feature_extractor.py
--------------------
Converts raw keystroke JSON (from the frontend key-logger) into the
85-element feature vector expected by KeystrokeClassifier.

Passphrase:  "The quick brown fox jumps over the lazy dog"
Features  :  43 dwell times (T) + 42 flight times (F) = 85 columns

Dwell  (T) = keyup  - keydown          of the current key  (ms)
Flight (F) = keydown_next - keyup_curr  between consecutive keys (ms)
"""

from __future__ import annotations
from typing import Any

# Ordered sequence of keys in the passphrase
# Must match frontend: src/hooks/useKeystrokeCapture.js SENTENCE
PASSPHRASE_KEYS: list[str] = list(
    "the quick brown fox jumps over the lazy black dog"
)
# 49 characters total → 49 T + 48 F = 97 features


def _flatten_and_sort(word_records: list[dict[str, Any]]) -> list[dict]:

    # Flatten the per-word keystroke records into a single time-ordered list.

    all_events: list[dict] = []
    for record in word_records:
        events = record.get("data", [])
        all_events.extend(events)

    # Sort strictly by keydown timestamp so ordering is correct
    all_events.sort(key=lambda e: e["keydown"])
    return all_events

def _events_to_feature_vector(events: list[dict]) -> list[float]:

    # Given time-ordered key events, compute the 85 features.
    # T1, F1, T2, F2, ..., T42, F42, T43

    if len(events) < len(PASSPHRASE_KEYS):
        raise ValueError(
            f"Expected at least {len(PASSPHRASE_KEYS)} key events, "
            f"got {len(events)}. Ensure the full passphrase was typed."
        )

    # Use exactly the first N events (one per passphrase character)
    events = events[: len(PASSPHRASE_KEYS)]

    features: list[float] = []
    for i, event in enumerate(events):
        # Dwell time
        dwell = float(event["keyup"] - event["keydown"])
        # Guard against negative/zero dwell (clock jitter) — use holdTime fallback
        if dwell < 0:
            dwell = float(event.get("holdTime", 0))
        features.append(dwell)

        # Flight time (not added after the last key)
        if i < len(events) - 1:
            next_event = events[i + 1]
            flight = float(next_event["keydown"] - event["keyup"])
            # Negative flight can occur with very fast typists; clamp to 0
            features.append(max(flight, 0.0))

    return features  # length = 43 + 42 = 85


def extract_features(word_records: list[dict[str, Any]]) -> list[float]:
    # Public entry-point.
    events = _flatten_and_sort(word_records)
    return _events_to_feature_vector(events)