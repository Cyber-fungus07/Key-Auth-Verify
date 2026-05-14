import { useKeystrokeCapture, SENTENCE } from "../hooks/useKeystrokeCapture";

export default function TypingCaptcha({ roundIndex, totalRounds, onComplete, disabled }) {
  const { typedText, isComplete, backspaceUsed, onKeyDown, onKeyUp, onChange, reset, getRoundData } =
    useKeystrokeCapture();

  function handleConfirm() {
    if (!isComplete) return;
    const roundData = getRoundData(); // { word, events }
    reset();
    onComplete(roundData);
  }

  const progress = Math.min(typedText.length / SENTENCE.length, 1);
  const hasTyped = typedText.length > 0;
  const isMismatch = hasTyped && typedText !== SENTENCE;
  const hasBackspaced = backspaceUsed && isMismatch;

  const chars = SENTENCE.split("").map((char, i) => {
    const typed = typedText[i];
    let color = "var(--color-text-secondary)";
    if (typed === char) color = "var(--color-text-success)";
    else if (typed !== undefined) color = "var(--color-text-danger)";
    return { char, color };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {Array.from({ length: totalRounds }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background:
                i < roundIndex
                  ? "var(--color-background-success)"
                  : i === roundIndex
                  ? "var(--color-text-primary)"
                  : "var(--color-border-tertiary)",
              transition: "background 0.3s",
            }}
          />
        ))}
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap", marginLeft: 4 }}>
          {totalRounds > 1 ? `Round ${roundIndex + 1} of ${totalRounds}` : "Type once to verify"}
        </span>
      </div>

      <div
        style={{
          background: "var(--color-background-secondary)",
          borderRadius: "var(--border-radius-md)",
          padding: "12px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          letterSpacing: "0.03em",
          lineHeight: 1.7,
          userSelect: "none",
          border: "0.5px solid var(--color-border-tertiary)",
          wordBreak: "break-all",
        }}
      >
        {chars.map(({ char, color }, i) => (
          <span key={i} style={{ color, transition: "color 0.08s" }}>
            {char}
          </span>
        ))}
      </div>

      <div style={{ height: 3, background: "var(--color-border-tertiary)", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: isComplete ? "var(--color-text-success)" : "var(--color-text-primary)",
            transition: "width 0.1s, background 0.3s",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ color: isComplete ? "var(--color-text-success)" : hasBackspaced ? "var(--color-text-danger)" : isMismatch ? "var(--color-text-danger)" : "var(--color-text-secondary)", fontSize: 13, flex: 1 }}>
          {isComplete
            ? "✓ Perfect match! Submit now."
            : hasBackspaced
            ? "⚠ Backspace/Delete detected. Reset this round and try again."
            : isMismatch
            ? "✗ Fix the highlighted text so it matches exactly."
            : "Type the sentence above using your keyboard."}
        </div>
        {hasTyped && (
          <button
            type="button"
            onClick={reset}
            style={{ background: "none", border: "none", padding: 0, color: "var(--color-text-primary)", fontSize: 13, cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}
          >
            Reset
          </button>
        )}
      </div>

      <input
        autoFocus
        type="text"
        value={typedText}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        disabled={disabled}
        placeholder="Type the sentence above…"
        maxLength={SENTENCE.length}
        style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
        onPaste={(e) => e.preventDefault()}
      />

      <button
        onClick={handleConfirm}
        disabled={!isComplete || disabled}
        style={{ opacity: isComplete ? 1 : 0.4, cursor: isComplete ? "pointer" : "not-allowed" }}
      >
        {roundIndex + 1 < totalRounds ? `Next round →` : "Submit"}
      </button>
    </div>
  );
}
