import React from "react";

/**
 * IconButton — square/circular icon-only action.
 */
export function IconButton({
  variant = "secondary",  // primary | secondary | ghost
  size = "md",            // sm | md | lg
  shape = "circle",       // circle | rounded
  disabled = false,
  "aria-label": ariaLabel,
  className = "",
  style = {},
  children,               // an <Icon/>
  ...rest
}) {
  const dim = { sm: 36, md: 44, lg: 52 }[size];
  const variants = {
    primary: { background: "var(--action-primary)", color: "var(--action-primary-text)", border: "1px solid var(--action-primary)" },
    secondary: { background: "var(--surface-card)", color: "var(--text-primary)", border: "1px solid var(--border-default)" },
    ghost: { background: "transparent", color: "var(--text-primary)", border: "1px solid transparent" },
  }[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      className={`mal-iconbtn ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        borderRadius: shape === "circle" ? "var(--radius-pill)" : "var(--radius-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard)",
        ...variants,
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.94)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      {...rest}
    >
      {children}
    </button>
  );
}
