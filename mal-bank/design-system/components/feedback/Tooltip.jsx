import React from "react";

/**
 * Tooltip — hover/focus label. CSS-driven, no portal.
 */
export function Tooltip({
  label,
  side = "top",   // top | bottom | left | right
  className = "",
  style = {},
  children,
  ...rest
}) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  }[side];

  return (
    <span
      className={className}
      style={{ position: "relative", display: "inline-flex", ...style }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocusCapture={() => setShow(true)}
      onBlurCapture={() => setShow(false)}
      {...rest}
    >
      {children}
      <span
        role="tooltip"
        style={{
          position: "absolute", ...pos, zIndex: 900,
          padding: "6px 10px",
          background: "var(--ink-900)", color: "var(--neutral-0)",
          fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)",
          borderRadius: "var(--radius-sm)", whiteSpace: "nowrap",
          boxShadow: "var(--shadow-md)",
          opacity: show ? 1 : 0,
          visibility: show ? "visible" : "hidden",
          transition: "opacity var(--dur-fast) var(--ease-standard)",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
    </span>
  );
}
