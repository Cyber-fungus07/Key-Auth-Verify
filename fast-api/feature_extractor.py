from __future__ import annotations
from typing import Any

# Passphrase: "the quick brown fox jumps over the lazy black dog" (49 chars)
# Features: 49 Dwell (T) + 48 Flight (F) = 97
PASSPHRASE_KEYS: list[str] = list("the quick brown fox jumps over the lazy black dog")

def extract_features(word_records: list[dict[str, Any]]) -> list[float]:
    # Flatten and sort events by keydown
    events = []
    for record in word_records:
        events.extend(record.get("data", []))
    events.sort(key=lambda e: e["keydown"])
    
    if len(events) < len(PASSPHRASE_KEYS):
        raise ValueError(f"Expected {len(PASSPHRASE_KEYS)} keys, got {len(events)}")

    events = events[:len(PASSPHRASE_KEYS)]
    features = []
    for i, event in enumerate(events):
        # Dwell time
        dwell = float(event["keyup"] - event["keydown"])
        if dwell < 0: dwell = float(event.get("holdTime", 0))
        features.append(max(0.0, dwell))

        # Flight time
        if i < len(events) - 1:
            flight = float(events[i+1]["keydown"] - event["keyup"])
            features.append(max(0.0, flight))

    return features