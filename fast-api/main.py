"""
main.py  —  Keystroke Biometric Authentication API
===================================================

Endpoints
---------
GET  /health          → liveness check
POST /enroll          → sign up: register a new user with 5 typing samples
POST /verify          → sign in: authenticate via keystroke dynamics
POST /evaluate        → dev-only: full model diagnostics

Key design decision — MODEL CACHE
----------------------------------
The KNN model is trained ONCE at startup and held in memory.
On every /verify call we just run predict() — no reloading, no retraining.
On /enroll we append new rows to the CSV, then retrain and update the cache.
This makes /verify fast and keeps the model always up-to-date.

Run with:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os
import threading
import time
import json
from typing import Any
from datetime import datetime, timedelta

import pandas as pd
from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from passlib.context import CryptContext
import jwt

from feature_extractor import extract_features

# configs

BASE_DIR            = os.path.dirname(os.path.abspath(__file__))
CSV_PATH            = os.path.join(BASE_DIR, "bio_bio.csv")
USERS_DB_PATH       = os.path.join(BASE_DIR, "users.json")
FEATURE_COUNT       = 97       # "the quick brown fox jumps over the lazy black dog" = 49 chars → 49T + 48F = 97
REQUIRED_SAMPLES    = 5       # number of typing repetitions required for enrollment
CONFIDENCE_THRESHOLD = 0.60   # >= 60% neighbour vote required to pass
KNN_K               = 3
KNN_METRIC          = "manhattan"
KNN_WEIGHTS         = "distance"

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "ashmit_secretkey")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# User Database Manager
class UserDB:
    """Simple JSON-based user store."""
    
    @staticmethod
    def load():
        if not os.path.exists(USERS_DB_PATH):
            return {}
        try:
            with open(USERS_DB_PATH, "r") as f:
                return json.load(f)
        except:
            return {}
    
    @staticmethod
    def save(users):
        with open(USERS_DB_PATH, "w") as f:
            json.dump(users, f, indent=2)
    
    @staticmethod
    def get_user(username: str):
        users = UserDB.load()
        return users.get(username)
    
    @staticmethod
    def user_exists(username: str) -> bool:
        return UserDB.get_user(username) is not None
    
    @staticmethod
    def create_user(username: str, email: str, password: str) -> dict:
        users = UserDB.load()
        if username in users:
            raise ValueError(f"User '{username}' already exists")
        
        users[username] = {
            "username": username,
            "email": email,
            "password": pwd_context.hash(password),
            "created_at": datetime.now().isoformat(),
            "typing_rounds": 0,
        }
        UserDB.save(users)
        return users[username]
    
    @staticmethod
    def verify_password(username: str, password: str) -> bool:
        user = UserDB.get_user(username)
        if not user:
            return False
        return pwd_context.verify(password, user["password"])
    
    @staticmethod
    def update_typing_rounds(username: str, rounds: int):
        users = UserDB.load()
        if username in users:
            users[username]["typing_rounds"] = rounds
            UserDB.save(users)

# JWT Token Functions
def create_access_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(authorization: str = None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1]
    return verify_token(token)



class ModelCache:
    """
    Holds the trained scaler + KNN model in memory.
    A threading.Lock guards against concurrent enroll calls retraining
    simultaneously.
    """
    def __init__(self):
        self.scaler:  StandardScaler | None       = None
        self.model:   KNeighborsClassifier | None = None
        self.classes: list[str]                   = []
        self._lock = threading.Lock()

    def train(self):
        # Load CSV, fit scaler + KNN, update cache automically.
        if not os.path.exists(CSV_PATH):
            raise RuntimeError(f"Biometric database not found: {CSV_PATH}")

        df    = pd.read_csv(CSV_PATH, keep_default_na=False)
        X_raw = df.iloc[:, :FEATURE_COUNT]
        y     = df["CLASS"].astype(str)

        scaler = StandardScaler()
        X      = scaler.fit_transform(X_raw)

        # Guard k against very small datasets during development
        k = min(KNN_K, len(df) - 1)

        model = KNeighborsClassifier(
            n_neighbors=k,
            metric=KNN_METRIC,
            weights=KNN_WEIGHTS,
        )
        model.fit(X, y)

        with self._lock:
            self.scaler  = scaler
            self.model   = model
            self.classes = y.unique().tolist()

    def predict(self, feature_vector: list[float]) -> tuple[str, float]:
        # Returns (predicted_class, confidence).
        with self._lock:
            if self.model is None or self.scaler is None:
                raise RuntimeError("Model not initialised — call train() first.")
            scaled = self.scaler.transform([feature_vector])
            pred   = self.model.predict(scaled)[0]
            proba  = self.model.predict_proba(scaled)[0]
            return str(pred), float(max(proba))

    def is_enrolled(self, user_id: str) -> bool:
        with self._lock:
            return str(user_id) in self.classes


cache = ModelCache()

# App + CORS
app = FastAPI(
    title="Keystroke Biometric API",
    version="2.0.0",
    description="KNN keystroke dynamics authentication — enrollment + verification.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten to your frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    # Create users.json if missing
    if not os.path.exists(USERS_DB_PATH):
        print(f"Creating new user database at {USERS_DB_PATH}")
        UserDB.save({})
    
    # Check if bio_bio.csv exists
    if not os.path.exists(CSV_PATH):
        print(f"⚠️  WARNING: {CSV_PATH} not found!")
        print("Creating empty bio_bio.csv with feature columns...")
        # Create CSV with feature column headers
        cols = [f"feature_{i}" for i in range(FEATURE_COUNT)] + ["CLASS"]
        pd.DataFrame(columns=cols).to_csv(CSV_PATH, index=False)
    
    # Train the model once when the server boots.
    print("Loading biometric database and training model...")
    try:
        cache.train()
        print(f"✓ Model ready — {len(cache.classes)} enrolled users.")
    except Exception as e:
        print(f"⚠️  Model training failed: {e}")
        print("Server will still start, but /verify may fail.")

# Schema
class KeyEvent(BaseModel):
    key:      str
    keydown:  int = Field(..., description="Epoch ms — key pressed")
    keyup:    int = Field(..., description="Epoch ms — key released")
    holdTime: int = Field(..., description="keyup - keydown (ms), pre-computed on client")
    word:     str = Field(default="")


class WordRecord(BaseModel):
    word:      str = Field(default="")
    data:      list[KeyEvent]
    timestamp: Any = None   # MongoDB field — ignored by classifier


def _to_raw(word_records: list[WordRecord]) -> list[dict]:
    # Convert Pydantic WordRecord list to plain dicts for feature_extractor.
    return [
        {
            "word": wr.word,
            "data": [
                {
                    "key":      ke.key,
                    "keydown":  ke.keydown,
                    "keyup":    ke.keyup,
                    "holdTime": ke.holdTime,
                }
                for ke in wr.data
            ],
        }
        for wr in word_records
    ]

# ─── AUTH ENDPOINTS SCHEMAS ───────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)

class AuthResponse(BaseModel):
    message: str
    token: str
    user: dict

class TypingSubmitRequest(BaseModel):
    logs: list[WordRecord]

class TypingSubmitResponse(BaseModel):
    message: str
    savedWords: int
    verified: bool = False
    confidence: float = 0.0
    predicted_user: str = ""

# ─── MAIN ENDPOINTS (ORIGINAL) ───


class EnrollRequest(BaseModel):
    user_id: str = Field(
        ...,
        description="Unique user ID — becomes the CLASS label in the CSV.",
    )
    samples: list[list[WordRecord]] = Field(
        ...,
        description=(
            f"Exactly {REQUIRED_SAMPLES} typing attempts of the passphrase. "
            "Each attempt is a list of WordRecord objects."
        ),
        min_length=REQUIRED_SAMPLES,
        max_length=REQUIRED_SAMPLES,
    )


class EnrollResponse(BaseModel):
    enrolled:      bool
    user_id:       str
    samples_saved: int
    total_users:   int
    message:       str


@app.post("/enroll", response_model=EnrollResponse, tags=["Authentication"])
def enroll(req: EnrollRequest):
    """
    Register a new user with 5 typing samples of the passphrase.

    Flow:
    1. Frontend prompts the user to type the passphrase 5 times.
    2. All 5 keystroke payloads are sent together in one POST.
    3. Server extracts 97 features from each sample.
    4. 5 new rows are appended to bio_bio.csv (CLASS = user_id).
    5. The in-memory model is retrained immediately.
    6. /verify is ready to authenticate this user straight away.
    """
    user_id = str(req.user_id).strip()

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id must not be empty.")

    if cache.is_enrolled(user_id):
        raise HTTPException(
            status_code=409,
            detail=f"User '{user_id}' is already enrolled. Use /verify to authenticate.",
        )

    # 1. Extract features from all 5 samples
    feature_rows: list[list[float]] = []
    for i, attempt in enumerate(req.samples):
        try:
            vec = extract_features(_to_raw(attempt))
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Sample {i + 1} is invalid: {exc}",
            )
        feature_rows.append(vec)

    # 2. Append new rows to CSV
    df_existing = pd.read_csv(CSV_PATH, keep_default_na=False)
    col_names   = df_existing.columns.tolist()  # 97 feature cols + CLASS

    new_rows = []
    for vec in feature_rows:
        row = dict(zip(col_names[:FEATURE_COUNT], vec))
        row["CLASS"] = user_id
        new_rows.append(row)

    df_updated = pd.concat(
        [df_existing, pd.DataFrame(new_rows, columns=col_names)],
        ignore_index=True,
    )
    df_updated.to_csv(CSV_PATH, index=False)

    # 3. Retrain in-memory model with the new data
    cache.train()

    return EnrollResponse(
        enrolled=True,
        user_id=user_id,
        samples_saved=len(feature_rows),
        total_users=len(cache.classes),
        message=(
            f"User '{user_id}' enrolled successfully with "
            f"{len(feature_rows)} samples. Model retrained and ready."
        ),
    )


# POST /verify
class VerifyRequest(BaseModel):
    user_id:    str              = Field(..., description="Claimed user identity")
    keystrokes: list[WordRecord] = Field(..., description="One full typing attempt")


class VerifyResponse(BaseModel):
    verified:       bool
    claimed_user:   str
    predicted_user: str
    confidence:     float = Field(..., description="KNN vote fraction [0-1]")
    message:        str
    elapsed_ms:     float


@app.post("/verify", response_model=VerifyResponse, tags=["Authentication"])
def verify(req: VerifyRequest):
    """
    Authenticate a user via keystroke dynamics.

    Dual-gate check:
    1. Predicted user must equal claimed user_id.
    2. KNN confidence must be >= 60%.

    Uses the cached in-memory model — no retraining, responds in ~5-20ms.
    """
    t0 = time.perf_counter()

    if not cache.is_enrolled(str(req.user_id)):
        raise HTTPException(
            status_code=404,
            detail=f"User '{req.user_id}' is not enrolled. Please sign up first.",
        )

    try:
        features = extract_features(_to_raw(req.keystrokes))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    try:
        predicted_user, confidence = cache.predict(features)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    identity_match  = (predicted_user == str(req.user_id))
    confidence_pass = (confidence >= CONFIDENCE_THRESHOLD)
    verified        = identity_match and confidence_pass

    if verified:
        message = "Access granted — identity and confidence checks passed."
    elif not identity_match:
        message = "Access denied — typing pattern does not match this account."
    else:
        message = (
            f"Access denied — confidence {confidence:.1%} is below "
            f"the {CONFIDENCE_THRESHOLD:.0%} threshold."
        )

    elapsed_ms = (time.perf_counter() - t0) * 1000

    return VerifyResponse(
        verified=verified,
        claimed_user=str(req.user_id),
        predicted_user=predicted_user,
        confidence=confidence,
        message=message,
        elapsed_ms=round(elapsed_ms, 2),
    )


@app.get("/health", tags=["Utility"])
def health():
    return {
        "status":         "ok",
        "csv_found":      os.path.exists(CSV_PATH),
        "model_ready":    cache.model is not None,
        "enrolled_users": len(cache.classes),
    }

# ─── NEW AUTH API ENDPOINTS ───────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=AuthResponse, tags=["Auth"])
def api_register(req: RegisterRequest):
    """
    Register a new user with username, email, and password.
    No typing data is submitted yet — just account creation.
    Returns JWT token for subsequent typing data submission.
    """
    if UserDB.user_exists(req.username):
        raise HTTPException(status_code=409, detail=f"Username '{req.username}' already exists")
    
    try:
        user = UserDB.create_user(req.username, req.email, req.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    token = create_access_token(req.username)
    
    return AuthResponse(
        message="Account created successfully",
        token=token,
        user={
            "id": req.username,
            "username": user["username"],
            "email": user["email"],
        }
    )

@app.post("/api/auth/login", response_model=AuthResponse, tags=["Auth"])
def api_login(req: LoginRequest):
    """
    Authenticate user with username and password.
    Returns JWT token if credentials are valid.
    """
    if not UserDB.user_exists(req.username):
        raise HTTPException(status_code=404, detail=f"User '{req.username}' not found")
    
    if not UserDB.verify_password(req.username, req.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    user = UserDB.get_user(req.username)
    token = create_access_token(req.username)
    
    return AuthResponse(
        message="Logged in successfully",
        token=token,
        user={
            "id": req.username,
            "username": user["username"],
            "email": user["email"],
        }
    )

@app.post("/api/protected/typing/submit", response_model=TypingSubmitResponse, tags=["Auth"])
def api_submit_typing(req: TypingSubmitRequest, authorization: str = Header(None)):
    """
    Submit typing samples — handles both registration enrollment and login verification.
    Requires Bearer JWT token in Authorization header.
    
    For registration: 5 typing samples are submitted (after /api/auth/register)
    For login: 1 typing sample is submitted (after /api/auth/login)
    """
    # Verify JWT
    try:
        username = get_current_user(authorization)
    except HTTPException:
        raise
    
    # Check if user exists
    if not UserDB.user_exists(username):
        raise HTTPException(status_code=404, detail=f"User '{username}' not found")
    
    user = UserDB.get_user(username)
    
    # Determine if this is enrollment (register) or verification (login)
    is_enrollment = user["typing_rounds"] == 0  # First time submitting typing data
    
    try:
        if is_enrollment:
            # REGISTRATION: Expect exactly 5 samples
            if len(req.logs) != REQUIRED_SAMPLES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Expected {REQUIRED_SAMPLES} typing samples for registration, got {len(req.logs)}"
                )
            
            # Convert to the format /enroll expects
            samples = [[log] for log in req.logs]
            
            # Extract features from all 5 samples
            feature_rows: list[list[float]] = []
            for i, attempt in enumerate(samples):
                try:
                    vec = extract_features(_to_raw(attempt))
                except ValueError as exc:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Sample {i + 1} is invalid: {exc}",
                    )
                feature_rows.append(vec)
            
            # Append new rows to CSV
            df_existing = pd.read_csv(CSV_PATH, keep_default_na=False)
            col_names   = df_existing.columns.tolist()
            
            new_rows = []
            for vec in feature_rows:
                row = dict(zip(col_names[:FEATURE_COUNT], vec))
                row["CLASS"] = username
                new_rows.append(row)
            
            df_updated = pd.concat(
                [df_existing, pd.DataFrame(new_rows, columns=col_names)],
                ignore_index=True,
            )
            df_updated.to_csv(CSV_PATH, index=False)
            
            # Retrain model
            cache.train()
            
            # Update user record
            UserDB.update_typing_rounds(username, REQUIRED_SAMPLES)
            
            return TypingSubmitResponse(
                message="Registration typing profile saved successfully",
                savedWords=len(feature_rows),
                verified=True,
            )
        
        else:
            # LOGIN: Expect exactly 1 sample for verification
            if len(req.logs) != 1:
                raise HTTPException(
                    status_code=400,
                    detail=f"Expected 1 typing sample for login verification, got {len(req.logs)}"
                )
            
            try:
                features = extract_features(_to_raw([req.logs[0]]))
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc))
            
            try:
                predicted_user, confidence = cache.predict(features)
            except RuntimeError as exc:
                raise HTTPException(status_code=503, detail=str(exc))
            
            identity_match  = (predicted_user == username)
            confidence_pass = (confidence >= CONFIDENCE_THRESHOLD)
            verified        = identity_match and confidence_pass
            
            # Update user record with the login attempt
            current_rounds = user.get("typing_rounds", 0)
            UserDB.update_typing_rounds(username, current_rounds + 1)
            
            if verified:
                message = "Login verified — typing pattern matches your profile."
            elif not identity_match:
                message = f"Login failed — typing pattern does not match. (Predicted: {predicted_user})"
            else:
                message = f"Login failed — confidence {confidence:.1%} below threshold {CONFIDENCE_THRESHOLD:.0%}"
            
            return TypingSubmitResponse(
                message=message,
                savedWords=1,
                verified=verified,
                confidence=confidence,
                predicted_user=predicted_user,
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing typing data: {str(e)}")

# ─── LEGACY ENDPOINTS (KEPT FOR COMPATIBILITY) ───


class EvaluateResponse(BaseModel):
    cv_mean_accuracy: float
    grid_best_score:  float
    grid_best_params: dict

@app.post("/evaluate", response_model=EvaluateResponse, tags=["Development"])
def evaluate():
    """Dev diagnostics — cross-validation + grid search on the full dataset."""
    from sklearn.model_selection import cross_validate, GridSearchCV

    df = pd.read_csv(CSV_PATH, keep_default_na=False)
    X  = pd.DataFrame(
        cache.scaler.transform(df.iloc[:, :FEATURE_COUNT]),
        columns=df.columns[:FEATURE_COUNT],
    )
    y = df["CLASS"].astype(str)

    cv_scores = cross_validate(
        KNeighborsClassifier(n_neighbors=KNN_K, metric=KNN_METRIC),
        X, y, scoring=["accuracy"],
    )
    cv_mean = float(cv_scores["test_accuracy"].mean() * 100)

    param_grid = {
        "n_neighbors": list(range(1, 10)),
        "weights":     ["uniform", "distance"],
        "p":           [1, 2],
    }
    grid = GridSearchCV(KNeighborsClassifier(), param_grid, scoring="accuracy")
    grid.fit(X, y)

    return EvaluateResponse(
        cv_mean_accuracy=cv_mean,
        grid_best_score=float(grid.best_score_),
        grid_best_params=grid.best_params_,
    )