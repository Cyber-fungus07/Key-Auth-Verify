# ⌨️ Key-Auth-Verify: Keystroke Biometric Authentication

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Frontend-React-blue)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-green)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/ML--API-FastAPI-009688)](https://fastapi.tiangolo.com/)

**Key-Auth-Verify** is a cutting-edge authentication system that goes beyond passwords. By analyzing the unique rhythm and timing of your typing—known as **Keystroke Dynamics**—it adds a powerful layer of biometric security to the login process.

---

## 🚀 Key Features

- **🧠 Behavioral Biometrics**: Captures precise timing data (hold times, inter-key intervals) to create a unique "typing signature" for every user.
- **🤖 Machine Learning Engine**: Powered by a Python FastAPI backend using a K-Nearest Neighbors (KNN) model for real-time verification with confidence scoring.
- **🔐 Multi-Factor Security**: Combines traditional MongoDB-backed user credentials with biometric verification.
- **📊 Real-time Analysis**: Provides instant feedback on verification status and biometric confidence levels.
- **🛡️ Protected Routes**: Robust JWT-based authentication for securing sensitive API endpoints and frontend views.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js
- **Styling**: Modern CSS / Styled Components
- **State Management**: React Hooks

### Backend (Orchestration)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Security**: JWT, Bcrypt

### AI/ML Engine (Biometrics)
- **Language**: Python 3.x
- **Framework**: FastAPI
- **Libraries**: Scikit-learn, Pandas, NumPy
- **Model**: K-Nearest Neighbors (KNN) with Manhattan distance

---

## 🔬 Biometric Features

The system extracts **97 distinct features** from each typing sample:
- **Hold Time (HT)**: Duration between Key-Down and Key-Up.
- **Flight Time (FT)**: Time elapsed between consecutive keystrokes.
- **DD, DU, UD Intervals**: Variations of Inter-key timing.
- **Phasor Vectors**: Calculated timing relationships for specific word patterns.

---

## 📂 Project Structure

```text
keystroke-auth/
├── frontend/             # React application (UI/UX)
├── backend/              # Node.js Express server (User management)
├── fast-api/             # Python FastAPI server (ML & Biometrics)
│   ├── main.py           # ML API endpoints
│   ├── feature_extractor.py # Keystroke processing logic
│   └── ModelTraining.ipynb # Model prototyping & evaluation
└── .env                  # Global configuration (needs to be created)
```

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Cyber-fungus07/Key-Auth-Verify.git
cd Key-Auth-Verify
```

### 2. Backend Setup (Node.js)
```bash
cd backend
npm install
# Create a .env file with:
# PORT=5001
# MONGO_URI=your_mongodb_uri
# JWT_SECRET=your_secret
npm run dev
```

### 3. AI/ML Engine Setup (FastAPI)
```bash
cd ../fast-api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Frontend Setup (React)
```bash
cd ../frontend
npm install
npm start
```

---

## 📖 How it Works

1. **Enrollment**: During registration, the user provides multiple samples of their typing rhythm for a specific phrase.
2. **Feature Extraction**: The system calculates `Hold Time` (time a key is pressed) and `Flight Time` (time between keys) for 90+ biometric features.
3. **Training**: The KNN model learns the user's specific typing pattern and stores it.
4. **Verification**: During login, the system compares the current typing rhythm against the stored profile. If the confidence score exceeds the threshold, access is granted.

---

## 🧪 Research & Development

This project was built upon extensive research into keystroke dynamics. For the underlying model experiments, dataset evaluations, and KNN prototyping, visit the experimental repository:
👉 **[Keystroke-Dynamic Experimental Repo](https://github.com/Cyber-fungus07/Keystroke-Dynamic)**

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">    Built for secure authentication by Ayush & Ashmit 😎</p>
