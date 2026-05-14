import { useRef, useState, useCallback } from "react";

const SENTENCE = "the quick brown fox jumps over the lazy black dog" ;

const isIgnorableKey = (key) =>
  key === "Shift" ||
  key === "CapsLock" ||
  key === "Control" ||
  key === "Alt" ||
  key === "Meta" ||
  key === "AltGraph" ||
  key === "Backspace" ||
  key === "Delete" ||
  key === "Enter" ||
  key === "Tab" ||
  (key.length > 1 && key !== " ");

/**
 * Captures keystroke timing for a single typing round.
 * Returns { key, pressTime, releaseTime } per keystroke.
 */
export function useKeystrokeCapture() {
  const [typedText, setTypedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [backspaceUsed, setBackspaceUsed] = useState(false);
  const pressMap = useRef({});
  const events = useRef([]);
  const lastValueRef = useRef("");

  const onKeyDown = useCallback((e) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      setBackspaceUsed(true);
      return;
    }
    if (isIgnorableKey(e.key)) return;
    pressMap.current[e.code] = Date.now();
  }, []);

  const onKeyUp = useCallback((e) => {
    if (isIgnorableKey(e.key)) return;
    const pressTime = pressMap.current[e.code];
    if (!pressTime) return;
    events.current.push({
      key:         e.key,
      code:        e.code,
      pressTime,
      releaseTime: Date.now(),
    });
    delete pressMap.current[e.code];
  }, []);

  const onChange = useCallback((e) => {
    const val = e.target.value;
    setTypedText(val);
    setIsComplete(val === SENTENCE);
    setBackspaceUsed(lastValueRef.current.length > val.length);
    lastValueRef.current = val;
  }, []);

  const reset = useCallback(() => {
    setTypedText("");
    setIsComplete(false);
    setBackspaceUsed(false);
    lastValueRef.current = "";
    pressMap.current = {};
    events.current = [];
  }, []);

  // Returns { word, events } — the shape buildLogsPayload() expects
  const getRoundData = useCallback(() => ({
    word:   SENTENCE,
    events: [...events.current],
  }), []);

  return { typedText, isComplete, backspaceUsed, onKeyDown, onKeyUp, onChange, reset, getRoundData, SENTENCE };
}

export { SENTENCE };

