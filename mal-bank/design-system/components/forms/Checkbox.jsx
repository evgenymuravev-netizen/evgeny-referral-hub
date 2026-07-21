import React from "react";

/**
 * Checkbox — square check control with optional label.
 */
export function Checkbox({
  checked = false,
  onChange = null,
  disabled = false,
  label = null,
  id,
  className = "",
  style = {},
  ...rest
}) {
  const boxId = id || (label ? `cb-${String(label).replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const box = (
    <button
      type="button"
      role="checkbox"
      id={boxId}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 22, height: 22, flexShrink: 0, padding: 0,
        borderRadius: "var(--radius-xs)",
        border: `1.5px solid ${checked ? "var(--action-primary)" : "var(--border-strong)"}`,
        background: checked ? "var(--action-primary)" : "var(--surface-card)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)",
      }}
      {...rest}
    >
      {checked && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      )}
    </button>
  );

  if (!label) return box;
  return (
    <label htmlFor={boxId} className={className} style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", ...style }}>
      {box}
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-md)", color: "var(--text-primary)" }}>{label}</span>
    </label>
  );
}
