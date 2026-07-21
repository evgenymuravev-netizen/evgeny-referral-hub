import React from "react";

/**
 * Toast — transient notification. Render inline where you manage positioning.
 */
export function Toast({
  tone = "neutral",   // neutral | success | warning | danger | info
  title = null,
  message = null,
  icon = null,
  onClose = null,
  className = "",
  style = {},
  ...rest
}) {
  const tones = {
    neutral: "var(--ink-900)",
    success: "var(--success-500)",
    warning: "var(--warning-500)",
    danger: "var(--danger-500)",
    info: "var(--info-500)",
  };
  const accent = tones[tone];

  return (
    <div
      role="status"
      className={`mal-toast ${className}`}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        minWidth: 280, maxWidth: 420, padding: "14px 16px",
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-lg)",
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: accent, flexShrink: 0 }} />
      {icon && <span style={{ color: accent, display: "inline-flex", marginTop: 1 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>{title}</div>}
        {message && <div style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: title ? 2 : 0 }}>{message}</div>}
      </div>
      {onClose && (
        <button type="button" aria-label="Dismiss" onClick={onClose} style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", padding: 2, margin: -2 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
}
