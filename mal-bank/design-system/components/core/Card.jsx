import React from "react";

/**
 * Card — surface container. Soft radius, hairline border, light shadow.
 */
export function Card({
  variant = "default",   // default | elevated | outline | mesh
  padding = "lg",        // none | sm | md | lg
  interactive = false,
  className = "",
  style = {},
  children,
  ...rest
}) {
  const pads = { none: 0, sm: "var(--space-4)", md: "var(--space-5)", lg: "var(--space-6)" }[padding];
  const variants = {
    default:  { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)" },
    elevated: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-lg)" },
    outline:  { background: "var(--surface-card)", border: "1px solid var(--border-default)", boxShadow: "none" },
    mesh:     { background: "var(--mesh-cool)", border: "1px solid var(--glass-border)", boxShadow: "var(--shadow-md)" },
  }[variant];

  return (
    <div
      className={`mal-card ${className}`}
      style={{
        borderRadius: "var(--radius-lg)",
        padding: pads,
        transition: interactive ? "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)" : undefined,
        cursor: interactive ? "pointer" : undefined,
        ...variants,
        ...style,
      }}
      onMouseEnter={interactive ? (e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; } : undefined}
      onMouseLeave={interactive ? (e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = variants.boxShadow; } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
