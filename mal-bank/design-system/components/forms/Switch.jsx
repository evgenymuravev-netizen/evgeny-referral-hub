import React from "react";

/**
 * Switch — on/off toggle. Ink-filled track when on.
 */
export function Switch({
  checked = false,
  onChange = null,
  disabled = false,
  size = "md",     // sm | md
  label = null,
  id,
  className = "",
  style = {},
  ...rest
}) {
  const dims = size === "sm" ? { w: 40, h: 24, k: 18 } : { w: 48, h: 28, k: 22 };
  const pad = (dims.h - dims.k) / 2;
  const switchId = id || (label ? `sw-${String(label).replace(/\s+/g, "-").toLowerCase()}` : undefined);

  const control = (
    <button
      type="button"
      role="switch"
      id={switchId}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        position: "relative",
        width: dims.w, height: dims.h,
        flexShrink: 0,
        borderRadius: "var(--radius-pill)",
        border: "none",
        background: checked ? "var(--action-primary)" : "var(--neutral-300)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background var(--dur-base) var(--ease-standard)",
        padding: 0,
      }}
      {...rest}
    >
      <span
        style={{
          position: "absolute", top: pad,
          left: checked ? dims.w - dims.k - pad : pad,
          width: dims.k, height: dims.k,
          borderRadius: "50%", background: "#fff",
          boxShadow: "var(--shadow-sm)",
          transition: "left var(--dur-base) var(--ease-out)",
        }}
      />
    </button>
  );

  if (!label) return control;
  return (
    <label htmlFor={switchId} className={className} style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", ...style }}>
      {control}
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-md)", color: "var(--text-primary)" }}>{label}</span>
    </label>
  );
}
