import os
import threading
import time
import pandas as pd
from typing import Any
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from feature_extractor import extract_features

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "bio_bio.csv")
FEATURE_COUNT = 97
REQUIRED_SAMPLES = 5
CONFIDENCE_THRESHOLD = 0.60
KNN_K = 3

class KeyEvent(BaseModel):
    key: str
    keydown: int
    keyup: int
    holdTime: int
    word: str = ""

class WordRecord(BaseModel):
    word: str = ""
    data: list[KeyEvent]
    timestamp: Any = None

class EnrollRequest(BaseModel):
    user_id: str
    samples: list[list[WordRecord]]

class VerifyRequest(BaseModel):
    user_id: str
    keystrokes: list[WordRecord]

class ModelCache:
    def __init__(self):
        self.scaler = None
        self.model = None
        self.classes = []
        self._lock = threading.Lock()

    def train(self):
        if not os.path.exists(CSV_PATH):
            cols = [f"feature_{i}" for i in range(FEATURE_COUNT)] + ["CLASS"]
            pd.DataFrame(columns=cols).to_csv(CSV_PATH, index=False)
            return

        df = pd.read_csv(CSV_PATH, keep_default_na=False)
        if len(df) < 2: return # Need at least 2 samples to train

        X_raw = df.iloc[:, :FEATURE_COUNT]
        y = df["CLASS"].astype(str)
        scaler = StandardScaler()
        X = scaler.fit_transform(X_raw)
        
        k = min(KNN_K, len(df) - 1)
        model = KNeighborsClassifier(n_neighbors=max(1, k), metric="manhattan", weights="distance")
        model.fit(X, y)

        with self._lock:
            self.scaler = scaler
            self.model = model
            self.classes = y.unique().tolist()

    def predict(self, features):
        with self._lock:
            if not self.model: raise RuntimeError("Model not trained")
            scaled = self.scaler.transform([features])
            pred = self.model.predict(scaled)[0]
            proba = self.model.predict_proba(scaled)[0]
            return str(pred), float(max(proba))

    def is_enrolled(self, user_id):
        with self._lock: return str(user_id) in self.classes

cache = ModelCache()
app = FastAPI(title="Keystroke Biometric API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    cache.train()

def _to_raw(word_records):
    return [{"word": wr.word, "data": [{"key": k.key, "keydown": k.keydown, "keyup": k.keyup, "holdTime": k.holdTime} for k in wr.data]} for wr in word_records]

@app.post("/enroll")
def enroll(req: EnrollRequest):
    user_id = req.user_id.strip()
    if not user_id: raise HTTPException(400, "user_id required")
    
    feature_rows = []
    for attempt in req.samples:
        feature_rows.append(extract_features(_to_raw(attempt)))

    df_existing = pd.read_csv(CSV_PATH, keep_default_na=False)
    new_rows = [dict(zip(df_existing.columns[:FEATURE_COUNT], vec), CLASS=user_id) for vec in feature_rows]
    pd.concat([df_existing, pd.DataFrame(new_rows)], ignore_index=True).to_csv(CSV_PATH, index=False)
    
    cache.train()
    return {"enrolled": True, "message": f"User {user_id} enrolled"}

@app.post("/verify")
def verify(req: VerifyRequest):
    if not cache.is_enrolled(req.user_id):
        raise HTTPException(404, f"User {req.user_id} not enrolled")

    features = extract_features(_to_raw(req.keystrokes))
    pred_user, confidence = cache.predict(features)
    
    verified = (pred_user == req.user_id) and (confidence >= CONFIDENCE_THRESHOLD)
    return {
        "verified": verified,
        "predicted_user": pred_user,
        "confidence": round(confidence, 4),
        "message": "Access granted" if verified else "Access denied"
    }

@app.get("/health")
def health():
    return {"status": "ok", "enrolled_users": len(cache.classes)}