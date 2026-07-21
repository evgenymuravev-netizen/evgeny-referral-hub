import React from "react";

/**
 * AccountCard — balance / payment-card surface on the signature mesh.
 */
export function AccountCard({
  label = "Available balance",
  amount = "0.00",
  currency = "AED",
  cardName = null,
  cardLast4 = null,
  variant = "mesh",   // mesh | ink | light
  hidden = false,     // masks the amount
  footer = null,
  className = "",
  style = {},
  ...rest
}) {
  const surfaces = {
    mesh: { background: "var(--mesh-hero)", color: "var(--ink-900)", border: "1px solid var(--glass-border)" },
    ink:  { background: "var(--ink-900)", color: "#fff", border: "1px solid var(--ink-900)" },
    light:{ background: "var(--surface-card)", color: "var(--ink-900)", border: "1px solid var(--border-subtle)" },
  }[variant];
  const sub = variant === "ink" ? "rgba(255,255,255,0.7)" : "var(--text-secondary)";

  return (
    <div
      className={`mal-account-card mal-grain ${className}`}
      style={{
        position: "relative", overflow: "hidden",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-6)",
        minHeight: 190,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        boxShadow: "var(--shadow-md)",
        ...surfaces, ...style,
      }}
      {...rest}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="overline" style={{ color: sub }}>{label}</span>
        <svg width="34" height="22" viewBox="0 0 34 22" fill="none" aria-hidden="true">
          <circle cx="12" cy="11" r="9" fill={variant === "ink" ? "rgba(255,255,255,0.85)" : "var(--ink-900)"} opacity="0.85" />
          <circle cx="22" cy="11" r="9" fill={variant === "ink" ? "rgba(255,255,255,0.4)" : "var(--ink-900)"} opacity="0.35" />
        </svg>
      </div>

      <div>
        <div className="tnum" style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-semibold)", letterSpacing: "-0.02em", fontSize: "var(--text-3xl)", display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-medium)", color: sub }}>{currency}</span>
          <span>{hidden ? "••••••" : amount}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="tnum" style={{ fontSize: "var(--text-sm)", color: sub, letterSpacing: "0.06em" }}>
          {cardLast4 ? `•••• ${cardLast4}` : (cardName || "")}
        </span>
        {footer}
      </div>
    </div>
  );
}
