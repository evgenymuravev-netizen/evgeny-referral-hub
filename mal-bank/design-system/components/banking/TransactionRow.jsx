import React from "react";

/**
 * TransactionRow — a single ledger line: icon, merchant, meta, amount.
 */
export function TransactionRow({
  icon = null,
  title,
  subtitle = null,
  amount,
  currency = "AED",
  direction = "out",   // out | in
  badge = null,
  onClick = null,
  className = "",
  style = {},
  ...rest
}) {
  const isIn = direction === "in";
  return (
    <div
      className={`mal-tx-row ${className}`}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 8px",
        cursor: onClick ? "pointer" : "default",
        borderRadius: "var(--radius-md)",
        transition: "background var(--dur-fast) var(--ease-standard)",
        ...style,
      }}
      onMouseEnter={onClick ? (e) => (e.currentTarget.style.background = "var(--surface-hover)") : undefined}
      onMouseLeave={onClick ? (e) => (e.currentTarget.style.background = "transparent") : undefined}
      {...rest}
    >
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 42, height: 42, flexShrink: 0,
        borderRadius: "var(--radius-md)",
        background: "var(--surface-sunken)", color: "var(--ink-800)",
      }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-md)", fontWeight: "var(--weight-medium)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          {badge}
        </div>
        {subtitle && <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 1 }}>{subtitle}</div>}
      </div>
      <span className="tnum" style={{
        fontFamily: "var(--font-sans)", fontSize: "var(--text-md)", fontWeight: "var(--weight-semibold)",
        color: isIn ? "var(--success-500)" : "var(--text-primary)", whiteSpace: "nowrap",
      }}>
        {isIn ? "+" : "−"}{currency} {amount}
      </span>
    </div>
  );
}
