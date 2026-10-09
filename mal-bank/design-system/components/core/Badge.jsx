import React from "react";

/**
 * Badge — small status/label pill. Soft tinted fills.
 */
export function Badge({
  tone = "neutral",  // neutral | iris | success | warning | danger | info
  variant = "soft",  // soft | solid | outline
  size = "md",       // sm | md
  dot = false,
  className = "",
  style = {},
  children,
  ...rest
}) {
  const tones = {
    neutral: { soft: ["var(--neutral-100)", "var(--ink-700)"], solid: ["var(--ink-900)", "#fff"], line: "var(--border-strong)", dot: "var(--ink-500)" },
    iris:    { soft: ["var(--tint-iris)", "#3d3a8f"], solid: ["var(--iris-periwinkle)", "var(--ink-900)"], line: "var(--iris-periwinkle)", dot: "var(--iris-periwinkle)" },
    success: { soft: ["var(--success-100)", "#166b47"], solid: ["var(--success-500)", "#fff"], line: "var(--success-500)", dot: "var(--success-500)" },
    warning: { soft: ["var(--warning-100)", "#8c5c12"], solid: ["var(--warning-500)", "#fff"], line: "var(--warning-500)", dot: "var(--warning-500)" },
    danger:  { soft: ["var(--danger-100)", "#a1352d"], solid: ["var(--danger-500)", "#fff"], line: "var(--danger-500)", dot: "var(--danger-500)" },
    info:    { soft: ["var(--info-100)", "#3446a8"], solid: ["var(--info-500)", "#fff"], line: "var(--info-500)", dot: "var(--info-500)" },
  }[tone];

  const dims = size === "sm" ? { h: 20, px: 8, fs: "var(--text-2xs)" } : { h: 24, px: 10, fs: "var(--text-xs)" };
  let bg = "transparent", color = tones.soft[1], border = "1px solid transparent";
  if (variant === "soft") { bg = tones.soft[0]; color = tones.soft[1]; }
  else if (variant === "solid") { bg = tones.solid[0]; color = tones.solid[1]; }
  else if (variant === "outline") { color = tones.soft[1]; border = `1px solid ${tones.line}`; }

  return (
    <span
      className={`mal-badge ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: dims.h,
        padding: `0 ${dims.px}px`,
        background: bg,
        color,
        border,
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-sans)",
        fontSize: dims.fs,
        fontWeight: "var(--weight-semibold)",
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: tones.dot }} />}
      {children}
    </span>
  );
}
