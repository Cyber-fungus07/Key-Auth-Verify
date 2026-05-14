import { tokenStore } from "../api/auth";

export default function ResultPage({ result, onReset }) {
  const isLogin    = result.type === "login";
  const { user, savedWords, verified, confidence, predicted_user } = result;

  function handleLogout() {
    tokenStore.clear();
    onReset();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center",
        textAlign: "center", padding: "8px 0" }}>

      {/* Icon */}
      <div style={{ width: 72, height: 72, borderRadius: "50%",
          background: verified !== false ? "var(--color-background-success)" : "var(--color-background-danger)",
          border: verified !== false ? "2px solid var(--color-border-success)" : "2px solid var(--color-border-danger)",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
        {verified !== false ? <CheckIcon /> : <XIcon />}
      </div>

      {/* Heading */}
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 500 }}>
          {isLogin
            ? verified !== false
              ? "Login Successful!"
              : "Login Failed"
            : "Account Created!"}
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)" }}>
          {isLogin
            ? verified !== false
              ? `Your typing pattern was verified. Welcome back, ${user.username}!`
              : `Typing pattern does not match your profile. Try again.`
            : `Your typing profile with 5 samples has been created.`}
        </p>
      </div>

      {/* User detail card */}
      <div style={{ width: "100%", background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)",
          padding: "16px 18px", textAlign: "left" }}>
        <Row label="Username"   value={user.username} />
        <Row label="Email"      value={user.email} />
        <Row label="User ID"    value={user.id} mono />
        <Row label="Action"     value={isLogin ? "Login Verification" : "Registration"} />
        {isLogin && verified !== false && (
          <>
            <Row label="Predicted User" value={predicted_user} />
            <Row label="Confidence" value={`${(confidence * 100).toFixed(1)}%`} />
          </>
        )}
        <Row label="Keystrokes saved" value={`${savedWords} word${savedWords !== 1 ? "s" : ""}`} last />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        {isLogin && verified === false && (
          <button onClick={onReset}
            style={{ flex: 1, background: "none", border: "0.5px solid var(--color-border-secondary)",
              color: "var(--color-text-primary)" }}>
            ← Try Again
          </button>
        )}
        <button onClick={handleLogout} style={{ flex: isLogin && verified === false ? 1 : 1 }}>
          {isLogin ? "Sign out" : "Continue"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, mono, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 0", borderBottom: last ? "none" : "0.5px solid var(--color-border-tertiary)", gap: 12 }}>
      <span style={{ fontSize: 12, color: "var(--color-text-secondary)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, fontFamily: mono ? "var(--font-mono)" : undefined,
          fontSize: mono ? 11 : 13, color: "var(--color-text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
      <polyline points="6,17 13,24 26,10" stroke="var(--color-text-success)"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
      <line x1="8" y1="8" x2="24" y2="24" stroke="var(--color-text-danger)"
        strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="8" x2="8" y2="24" stroke="var(--color-text-danger)"
        strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
