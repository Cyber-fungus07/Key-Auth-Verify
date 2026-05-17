import os
import threading
import pandas as pd
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from feature_extractor import extract_features
from pymongo import MongoClient
from dotenv import load_dotenv

# Load configuration
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/keystroke_biometrics")
DB_NAME = "key_logger" # As seen in your backend .env
COLLECTION_NAME = "biometrics"

# Constants
FEATURE_COUNT = 97
CONFIDENCE_THRESHOLD = 0.60
KNN_K = 3

# MongoDB Client
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

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
        # Fetch all data from MongoDB
        cursor = collection.find({})
        data = list(cursor)
        
        if len(data) < 2:
            print("Not enough data in MongoDB to train.")
            return

        # Convert MongoDB documents to DataFrame
        df = pd.DataFrame(data)
        
        # Extract features and labels
        # Assuming the document structure: { "features": [f1, f2, ...], "user_id": "..." }
        X_raw = pd.DataFrame(df['features'].tolist())
        y = df["user_id"].astype(str)
        
        scaler = StandardScaler()
        X = scaler.fit_transform(X_raw)
        
        k = min(KNN_K, len(df) - 1)
        model = KNeighborsClassifier(n_neighbors=max(1, k), metric="manhattan", weights="distance")
        model.fit(X, y)

        with self._lock:
            self.scaler = scaler
            self.model = model
            self.classes = y.unique().tolist()
        print(f"Model trained successfully with {len(df)} samples from {len(self.classes)} users.")

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
app = FastAPI(title="Keystroke Biometric API (v2 - MongoDB Powered)")

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
    
    new_docs = []
    for attempt in req.samples:
        features = extract_features(_to_raw(attempt))
        new_docs.append({
            "user_id": user_id,
            "features": features.tolist() if hasattr(features, 'tolist') else list(features)
        })

    if new_docs:
        collection.insert_many(new_docs)
    
    # Retrain model after enrollment
    cache.train()
    return {"enrolled": True, "message": f"User {user_id} enrolled and saved to MongoDB"}

@app.post("/verify")
def verify(req: VerifyRequest):
    if not cache.is_enrolled(req.user_id):
        # Fallback check directly in DB if cache isn't ready
        if collection.count_documents({"user_id": req.user_id}) == 0:
            raise HTTPException(404, f"User {req.user_id} not enrolled")
        else:
            cache.train() # Force retrain if user exists in DB but not in cache

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
    return {
        "status": "ok", 
        "storage": "mongodb",
        "enrolled_users": len(cache.classes),
        "total_samples": collection.count_documents({})
    }
