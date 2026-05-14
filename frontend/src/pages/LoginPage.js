import { useState } from "react";
import TypingCaptcha from "../components/TypingCaptcha";
import { login, submitTypingData } from "../api/auth";

export default function LoginPage({ onSuccess, onSwitchToRegister }) {
  const [step, setStep]     = useState("form"); // form | captcha | loading
  const [error, setError]   = useState("");
  const [fields, setFields] = useState({ username: "", password: "" });

  function setField(k, v) { setFields((f) => ({ ...f, [k]: v })); }

  function handleFormSubmit(e) {
    e.preventDefault();
    // if (!fields.username.trim() || !fields.password.trim()) {
    //   setError("Please fill in all fields.");
    //   return;
    // }
    if (!fields.username.trim() || !fields.password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (fields.username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (fields.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setStep("captcha");
  }

  async function handleTypingComplete(roundData) {
    setStep("loading");
    setError("");
    try {
      // 1. Verify credentials → get JWT
      const authResult = await login(fields.username, fields.password);

      // 2. Submit the single typing round (token now stored)
      let typingResult = null;
      try {
        typingResult = await submitTypingData([roundData]);
      } catch (typingErr) {
        setError(`Typing data submit failed: ${typingErr.message}`);
        setStep("captcha");
        return;
      }

      if (!typingResult) {
        setError("Typing verification failed. Please try again.");
        setStep("captcha");
        return;
      }

      onSuccess({
        type:       "login",
        user:       authResult.user,
        savedWords: typingResult?.savedWords ?? 0,
        verified:   typingResult?.verified ?? false,
        confidence: typingResult?.confidence ?? 0,
        predicted_user: typingResult?.predicted_user ?? "",
      });
    } catch (err) {
      setError(err.message);
      setStep("form");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 500 }}>Welcome back</h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)" }}>
          Sign in and type once so we can verify it's really you.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {step === "form" && (
        <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Username">
            <input autoFocus type="text" placeholder="your username"
              value={fields.username} onChange={(e) => setField("username", e.target.value)} />
          </Field>
          <Field label="Password">
            <input type="password" placeholder="your password"
              value={fields.password} onChange={(e) => setField("password", e.target.value)} />
          </Field>
          <button type="submit" style={{ marginTop: 4 }}>Continue to typing test →</button>
        </form>
      )}

      {step === "captcha" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
              padding: "8px 12px", background: "var(--color-background-secondary)",
              borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-text-success)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Typing as <strong style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{fields.username}</strong>
            </span>
          </div>
          <TypingCaptcha
            roundIndex={0}
            totalRounds={1}
            onComplete={handleTypingComplete}
            disabled={false}
          />
        </div>
      )}

      {step === "loading" && <Loader text="Verifying your typing pattern…" />}

      <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 16,
          fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center" }}>
        No account yet?{" "}
        <InlineLink onClick={onSwitchToRegister}>Register</InlineLink>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div style={{ padding: "10px 14px", background: "var(--color-background-danger)",
        border: "0.5px solid var(--color-border-danger)", borderRadius: "var(--border-radius-md)",
        fontSize: 13, color: "var(--color-text-danger)" }}>
      {message}
    </div>
  );
}

function Loader({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-secondary)", fontSize: 14 }}>
      <div style={{ width: 32, height: 32, border: "2px solid var(--color-border-tertiary)",
          borderTopColor: "var(--color-text-primary)", borderRadius: "50%",
          animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
      <p>{text}</p>
    </div>
  );
}

function InlineLink({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", padding: 0,
        fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", textDecoration: "underline" }}>
      {children}
    </button>
  );
}
