import os
import time
import pandas as pd
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from feature_extractor import extract_features
from pymongo import MongoClient
from dotenv import load_dotenv

# Load configuration
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/keystroke_biometrics")
DB_NAME = "key_logger"
COLLECTION_NAME = "biometrics"

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

app = FastAPI(title="Keystroke Biometric API ")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _to_raw(word_records):
    return [{"word": wr.word,"data": [{"key": k.key, "keydown": k.keydown, "keyup": k.keyup, "holdTime": k.holdTime} for k in wr.data]} for wr in word_records]

@app.post("/enroll")
def enroll(req: EnrollRequest):
    user_id = req.user_id.strip()
    if not user_id: raise HTTPException(400, "user_id required")
    
    new_docs = []
    for attempt in req.samples:
        features = extract_features(_to_raw(attempt))
        new_docs.append({
            "user_id": user_id,
            "features": features.tolist() if hasattr(features, 'tolist') else list(features),
            "created_at": time.time()
        })

    if new_docs:
        collection.insert_many(new_docs)
    
    return {"enrolled": True, "message": f"User {user_id} enrolled and saved to MongoDB"}

@app.post("/verify")
def verify(req: VerifyRequest):
    # 1. Fetch ONLY the requested user's data (Stateless, O(1) database lookup)
    user_docs = list(collection.find({"user_id": req.user_id}))
    

    if not user_docs or len(user_docs) < 2:
        raise HTTPException(404, f"User {req.user_id} not enrolled or insufficient data (needs 2+ samples)")

    # 2. Extract enrolled data
    enrolled_features = [doc["features"] for doc in user_docs]
    
    # 3. Scale the user's specific data / standard scaler
    scaler = StandardScaler()
    X_train = scaler.fit_transform(enrolled_features)

    # 4. Dimensionality Reduction (PCA) /top 3 principal component
    n_comps = min(3, len(X_train))
    pca = PCA(n_components=n_comps)
    X_train_pca = pca.fit_transform(X_train)

    # 5. Train One-Class SVM on-the-fly
    svm = OneClassSVM(kernel="rbf", gamma="scale", nu=0.5)
    svm.fit(X_train_pca)

    # 6. Extract, scale, and compress incoming attempt features
    attempt_raw = extract_features(_to_raw(req.keystrokes))
    attempt_scaled = scaler.transform([attempt_raw])
    attempt_pca = pca.transform(attempt_scaled)

    # 7. Predict: 1 for inlier (Match), -1 for outlier (Imposter)
    prediction = svm.predict(attempt_pca)[0]
    
    # Decision function returns signed distance to the separating hyperplane.
    # > 0 means inlier (authentic user), < 0 means outlier (imposter).
    score = float(svm.decision_function(attempt_pca)[0])
    
    verified = bool(prediction == 1)

    # Normalize score to a pseudo-confidence percentage (0 to 1)
    confidence = (score + 1) / 2.0
    confidence = max(0.0, min(1.0, confidence))

    if verified:
        # Incremental Learning: Save successful attempt to continuously improve model
        collection.insert_one({
            "user_id": req.user_id,
            "features": attempt_raw.tolist() if hasattr(attempt_raw, 'tolist') else list(attempt_raw),
            "created_at": time.time()
        })
        
        # Keep a rolling window of the 25 most recent samples to avoid drift
        total_samples = collection.count_documents({"user_id": req.user_id})
        if total_samples > 25:
            oldest = list(collection.find({"user_id": req.user_id}).sort("created_at", 1).limit(1))
            if oldest:
                collection.delete_one({"_id": oldest[0]["_id"]})

    return {
        "verified": verified,
        "predicted_user": req.user_id,
        "confidence": round(confidence, 4),
        "message": "Access granted" if verified else "Access denied"
    }

@app.get("/health")
def health():
    return {
        "status": "ok", 
        "architecture": "One-Class SVM (Anomaly Detection)",
        "enrolled_samples_in_db": collection.estimated_document_count()
    }
