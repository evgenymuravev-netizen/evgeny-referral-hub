import React from "react";

/**
 * Button — Mal's primary action. Pill-shaped, ink-forward, calm motion.
 */
export function Button({
  variant = "primary",   // primary | secondary | ghost | accent
  size = "md",           // sm | md | lg
  iconLeft = null,
  iconRight = null,
  fullWidth = false,
  disabled = false,
  type = "button",
  className = "",
  style = {},
  children,
  ...rest
}) {
  const sizes = {
    sm: { height: 36, padding: "0 16px", font: "var(--text-sm)", gap: 6 },
    md: { height: 44, padding: "0 22px", font: "var(--text-md)", gap: 8 },
    lg: { height: 54, padding: "0 30px", font: "var(--text-lg)", gap: 10 },
  }[size];

  const variants = {
    primary: {
      background: "var(--action-primary)",
      color: "var(--action-primary-text)",
      border: "1px solid var(--action-primary)",
    },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-default)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-primary)",
      border: "1px solid transparent",
    },
    accent: {
      background: "var(--action-accent)",
      color: "var(--neutral-0)",
      border: "1px solid var(--action-accent)",
    },
  }[variant];

  return (
    <button
      type={type}
      disabled={disabled}
      data-variant={variant}
      className={`mal-btn ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: sizes.gap,
        height: sizes.height,
        padding: sizes.padding,
        width: fullWidth ? "100%" : undefined,
        fontFamily: "var(--font-sans)",
        fontSize: sizes.font,
        fontWeight: "var(--weight-semibold)",
        letterSpacing: "-0.01em",
        borderRadius: "var(--radius-pill)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)",
        whiteSpace: "nowrap",
        ...variants,
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
