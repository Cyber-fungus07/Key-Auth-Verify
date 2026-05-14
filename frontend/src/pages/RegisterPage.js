import { useState } from "react";
import TypingCaptcha from "../components/TypingCaptcha";
import { register, submitTypingData } from "../api/auth";

const TOTAL_ROUNDS = 5;

export default function RegisterPage({ onSuccess, onSwitchToLogin }) {
  const [step, setStep]           = useState("form"); // form | captcha | loading
  const [error, setError]         = useState("");
  const [fields, setFields]       = useState({ username: "", email: "", password: "" });
  const [currentRound, setRound]  = useState(0);
  const [rounds, setRounds]       = useState([]);

  function setField(k, v) { setFields((f) => ({ ...f, [k]: v })); }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (!fields.username.trim() || !fields.email.trim() || !fields.password.trim()) {
      setError("All fields are required.");
      return;
    }
    setError("");
    setStep("captcha");
  }

  async function handleRoundComplete(roundData) {
    const newRounds = [...rounds, roundData];
    setRounds(newRounds);

    if (currentRound + 1 < TOTAL_ROUNDS) {
      setRound(currentRound + 1);
    } else {
      await finishRegistration(newRounds);
    }
  }

  async function finishRegistration(allRounds) {
    setStep("loading");
    setError("");
    try {
      // 1. Create the account
      const authResult = await register(fields.username, fields.email, fields.password);

      // 2. Submit all 5 typing rounds (token is now stored automatically)
      let typingResult = null;
      try {
        // typingResult = await submitTypingData(allRounds);
        typingResult = await submitTypingData(allRounds, true);  // ← add true
      } catch (typingErr) {
        setError(`Typing data submit failed: ${typingErr.message}`);
        setStep("captcha");
        setRound(0);
        setRounds([]);
        return;
      }

      if (!typingResult || !typingResult.verified) {
        setError("Typing profile could not be saved. Please retry the 5 rounds.");
        setStep("captcha");
        setRound(0);
        setRounds([]);
        return;
      }

      onSuccess({
        type:         "register",
        user:         authResult.user,
        savedWords:   typingResult?.savedWords ?? 0,
        verified:     true,
        confidence:   1.0,
        predicted_user: authResult.user.username,
      });
    } catch (err) {
      setError(err.message);
      setStep("form");
      setRound(0);
      setRounds([]);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 500 }}>Create account</h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)" }}>
          You'll type a sentence <strong style={{ fontWeight: 500 }}>5 times</strong> so we can learn your unique typing pattern.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {step === "form" && (
        <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Username">
            <input autoFocus type="text" placeholder="choose a username"
              value={fields.username} onChange={(e) => setField("username", e.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" placeholder="you@example.com"
              value={fields.email} onChange={(e) => setField("email", e.target.value)} />
          </Field>
          <Field label="Password">
            <input type="password" placeholder="choose a password"
              value={fields.password} onChange={(e) => setField("password", e.target.value)} />
          </Field>
          <button type="submit" style={{ marginTop: 4 }}>Continue to typing test →</button>
        </form>
      )}

      {step === "captcha" && (
        <TypingCaptcha
          roundIndex={currentRound}
          totalRounds={TOTAL_ROUNDS}
          onComplete={handleRoundComplete}
          disabled={false}
        />
      )}

      {step === "loading" && <Loader text="Saving your typing profile…" />}

      <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 16, fontSize: 13,
          color: "var(--color-text-secondary)", textAlign: "center" }}>
        Already have an account?{" "}
        <InlineLink onClick={onSwitchToLogin}>Sign in</InlineLink>
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
