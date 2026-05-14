import { tokenStore } from "../api/auth";

export default function HomePage({ user, onLogout }) {
  function handleLogout() {
    tokenStore.clear();
    onLogout();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center",
        textAlign: "center", padding: "8px 0" }}>

      {/* Welcome Icon */}
      <div style={{ width: 72, height: 72, borderRadius: "50%",
          background: "var(--color-background-success)",
          border: "2px solid var(--color-border-success)",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
        <HomeIcon />
      </div>

      {/* Heading */}
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 500 }}>
          Welcome, {user.username}!
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)" }}>
          Your keystroke biometric profile has been successfully created and stored securely.
        </p>
      </div>

      {/* User Info Card */}
      <div style={{ width: "100%", background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)",
          padding: "16px 18px", textAlign: "left" }}>
        <Row label="Username" value={user.username} />
        <Row label="Email" value={user.email} />
        <Row label="User ID" value={user.id} mono />
        <Row label="Status" value="Profile Complete" last />
      </div>

      {/* Next Steps */}
      <div style={{ width: "100%", background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)",
          padding: "12px 14px", textAlign: "left" }}>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 }}>
          Next time you log in:
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
          <li>Enter your username and password</li>
          <li>Type the sentence once</li>
          <li>Your typing pattern will be verified against this profile</li>
        </ul>
      </div>

      {/* Actions */}
      <button onClick={handleLogout} style={{ width: "100%" }}>
        Sign out
      </button>
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

function HomeIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
      <path d="M4 16L16 5L28 16V26H20V20H12V26H4V16Z" stroke="var(--color-text-success)"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
