import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResultPage from "./pages/ResultPage";
import HomePage from "./pages/HomePage";

export default function App() {
  const [page, setPage] = useState("login"); // login | register | home | result
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);

  function handleRegistrationSuccess(res) {
    setUser(res.user);
    setPage("home");
  }

  function handleLoginSuccess(res) {
    setResult(res);
    setPage("result");
  }

  function handleLogout() {
    setUser(null);
    setResult(null);
    setPage("login");
  }

  function handleReset() {
    setResult(null);
    setPage("login");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Sora:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Sora', sans-serif;
          background: #f4f2ef;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .card {
          background: #ffffff;
          border: 0.5px solid rgba(0,0,0,0.1);
          border-radius: 16px;
          padding: 36px 32px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }

        .brand-mark {
          width: 32px;
          height: 32px;
          background: #111;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-name {
          font-size: 15px;
          font-weight: 500;
          letter-spacing: -0.01em;
        }

        input {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 0.5px solid rgba(0,0,0,0.18);
          border-radius: 8px;
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          background: #fff;
          color: #111;
          outline: none;
          transition: border-color 0.15s;
        }
        input:focus { border-color: rgba(0,0,0,0.5); }
        input::placeholder { color: #aaa; }
        input:disabled { opacity: 0.5; cursor: not-allowed; }

        button[type=submit], button:not([style*="background: none"]):not([style*="background:none"]) {
          width: 100%;
          height: 40px;
          border: 0.5px solid rgba(0,0,0,0.2);
          border-radius: 8px;
          background: #111;
          color: #fff;
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        button[type=submit]:hover, button:not([style*="background: none"]):not([style*="background:none"]):hover {
          background: #333;
        }
        button:disabled {
          cursor: not-allowed;
        }

        input[type=text][style*="mono"], input[style*="mono"] {
          font-family: 'IBM Plex Mono', monospace !important;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

        .card > * { animation: fadeIn 0.25s ease; }

        --color-background-success: #e6f4ea;
        --color-background-danger: #fce8e6;
        --color-text-success: #1e7e34;
        --color-text-danger: #c5221f;
        --color-border-success: #a8d5b5;
        --color-border-danger: #f5c6c6;

        :root {
          --color-background-primary: #ffffff;
          --color-background-secondary: #f7f6f3;
          --color-background-success: #eaf4ee;
          --color-background-danger: #fdf0f0;
          --color-text-primary: #111111;
          --color-text-secondary: #888888;
          --color-text-success: #1a7a3c;
          --color-text-danger: #c0392b;
          --color-border-tertiary: rgba(0,0,0,0.1);
          --color-border-secondary: rgba(0,0,0,0.2);
          --color-border-primary: rgba(0,0,0,0.35);
          --color-border-success: rgba(26,122,60,0.3);
          --color-border-danger: rgba(192,57,43,0.3);
          --font-mono: 'IBM Plex Mono', monospace;
          --border-radius-md: 8px;
          --border-radius-lg: 12px;
        }
      `}</style>

      <div className="card">
        {/* Brand */}
        <div className="brand">
          <div className="brand-mark">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="6" width="3" height="8" rx="1" fill="white" />
              <rect x="6.5" y="3" width="3" height="11" rx="1" fill="white" />
              <rect x="11" y="1" width="3" height="13" rx="1" fill="white" />
            </svg>
          </div>
          <span className="brand-name">KeyAuth</span>
        </div>

        {page === "login" && (
          <LoginPage
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setPage("register")}
          />
        )}
        {page === "register" && (
          <RegisterPage
            onSuccess={handleRegistrationSuccess}
            onSwitchToLogin={() => setPage("login")}
          />
        )}
        {page === "home" && user && (
          <HomePage
            user={user}
            onLogout={handleLogout}
          />
        )}
        {page === "result" && result && (
          <ResultPage result={result} onReset={handleReset} />
        )}
      </div>
    </>
  );
}
