"use client";

import React, { useEffect, useRef, useState, memo } from "react";
import { Check, Clipboard, Sparkles } from "lucide-react";

interface CyberCodeSlotInputProps {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  isJoined?: boolean;
  statusText?: string;
  className?: string;
}

// Regex to clean and validate: allows uppercase A-Z (excluding confusing O, I) and digits 2-9 (excluding 0, 1)
const CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;
const VALID_CHAR_REGEX = /[A-HJ-NP-Z2-9]/;

export const CyberCodeSlotInput = memo(function CyberCodeSlotInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  errorMessage,
  isJoined = false,
  statusText,
  className = "",
}: CyberCodeSlotInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [pasteFeedback, setPasteFeedback] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Pad to 6 slots
  const chars = Array.from({ length: 6 }, (_, i) => value[i] || "");
  const isVerified = CODE_REGEX.test(value);

  useEffect(() => {
    if (isVerified && onComplete) {
      onComplete(value);
    }
  }, [isVerified, value, onComplete]);

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.toUpperCase();
    if (!rawVal) {
      // Deleting character
      const next = chars.slice();
      next[index] = "";
      onChange(next.join(""));
      return;
    }

    // Filter to valid characters
    const filteredChars = rawVal.split("").filter((c) => VALID_CHAR_REGEX.test(c));
    if (filteredChars.length === 0) return;

    if (filteredChars.length > 1) {
      // Pasted or typed multiple characters
      handlePastedString(filteredChars.join(""), index);
      return;
    }

    const next = chars.slice();
    next[index] = filteredChars[0];
    const newCode = next.join("");
    onChange(newCode);

    // Auto-advance to next slot
    if (index < 5 && filteredChars[0]) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!chars[index] && index > 0) {
        // Empty slot backspace moves to previous slot and clears it
        const next = chars.slice();
        next[index - 1] = "";
        onChange(next.join(""));
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePastedString = (pasted: string, startIndex = 0) => {
    // If user pasted a full URL like /room-join?room=ABC123, extract code
    let clean = pasted.trim().toUpperCase();
    const urlMatch = clean.match(/[?&]ROOM=([A-HJ-NP-Z2-9]{6})/i);
    if (urlMatch && urlMatch[1]) {
      clean = urlMatch[1];
      startIndex = 0;
    }

    const validChars = clean.split("").filter((c) => VALID_CHAR_REGEX.test(c));
    if (validChars.length === 0) return;

    const next = chars.slice();
    for (let i = 0; i < validChars.length && startIndex + i < 6; i += 1) {
      next[startIndex + i] = validChars[i];
    }
    const newCode = next.join("").slice(0, 6);
    onChange(newCode);

    setPasteFeedback(true);
    setTimeout(() => setPasteFeedback(false), 1400);

    // Focus on the next empty slot or last slot
    const nextEmptyIndex = next.findIndex((c) => !c);
    const targetIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : 5;
    inputsRef.current[targetIndex]?.focus();
  };

  const handleGlobalPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    handlePastedString(pasted, 0);
  };

  const handleClipboardButtonClick = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        handlePastedString(text, 0);
      }
    } catch {
      // Fallback focus first slot
      inputsRef.current[0]?.focus();
    }
  };

  return (
    <div
      className={`cyber-code-input-wrap ${isVerified ? "is-code-verified" : ""} ${
        hasError ? "has-code-error" : ""
      } ${className}`}
      onPaste={handleGlobalPaste}
    >
      <div className="cyber-code-header-bar">
        <span className="cyber-code-label">
          <Sparkles size={11} className={isVerified ? "text-emerald" : "text-cyan"} />
          FREQUENCY CODE // 6-SLOT MATRIX
        </span>
        <button
          type="button"
          className="cyber-code-paste-quickbtn"
          onClick={handleClipboardButtonClick}
          disabled={disabled}
          title="Paste code from clipboard"
        >
          {pasteFeedback ? <Check size={12} className="text-emerald" /> : <Clipboard size={12} />}
          <span>{pasteFeedback ? "PASTED!" : "PASTE CODE"}</span>
        </button>
      </div>

      <div className="cyber-code-slots-grid">
        {chars.map((char, idx) => {
          const isCurrentSlotFilled = Boolean(char);
          return (
            <div
              key={idx}
              className={`cyber-code-slot ${isCurrentSlotFilled ? "is-filled" : ""} ${
                isVerified ? "is-slot-verified" : ""
              }`}
              onClick={() => inputsRef.current[idx]?.focus()}
            >
              <div className="slot-corner top-left" />
              <div className="slot-corner top-right" />
              <div className="slot-corner bottom-left" />
              <div className="slot-corner bottom-right" />

              <input
                ref={(el) => {
                  inputsRef.current[idx] = el;
                }}
                type="text"
                maxLength={6}
                inputMode="text"
                autoCapitalize="characters"
                value={char}
                disabled={disabled}
                onChange={(e) => handleInputChange(idx, e)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="cyber-code-slot-input"
                aria-label={`Digit ${idx + 1} of room code`}
              />

              {!char ? <span className="slot-placeholder-dot" /> : null}
            </div>
          );
        })}

        {/* Dynamic laser scanline sweep when verified */}
        {isVerified ? <div className="cyber-scanline-beam" aria-hidden="true" /> : null}
      </div>

      <div className="cyber-code-status-row">
        {hasError ? (
          <span className="cyber-code-status error-text">
            <span className="status-indicator-dot error" /> {errorMessage ? `SIGNAL REJECTED // ${errorMessage.toUpperCase()}` : "SIGNAL REJECTED // INVALID FREQUENCY"}
          </span>
        ) : isJoined ? (
          <span className="cyber-code-status verified-text">
            <span className="status-indicator-dot verified" /> {statusText || "FREQUENCY VERIFIED // CONNECTED TO HOST ARENA"}
          </span>
        ) : isVerified ? (
          <span className="cyber-code-status verified-text">
            <span className="status-indicator-dot verified" /> FREQUENCY VERIFIED // READY TO CONNECT
          </span>
        ) : (
          <span className="cyber-code-status awaiting-text">
            <span className="status-indicator-dot awaiting" /> ENTER 6-CHARACTER TACTICAL FREQUENCY
          </span>
        )}
      </div>
    </div>
  );
});
