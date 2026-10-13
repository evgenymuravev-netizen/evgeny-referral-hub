import React from "react";

/**
 * Input — text field with optional label, icons, and helper/error text.
 */
export function Input({
  label = null,
  hint = null,
  error = null,
  iconLeft = null,
  iconRight = null,
  size = "md",        // sm | md | lg
  disabled = false,
  id,
  className = "",
  style = {},
  ...rest
}) {
  const dims = { sm: 40, md: 48, lg: 56 }[size];
  const inputId = id || (label ? `in-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const invalid = !!error;

  return (
    <div className={`mal-field ${className}`} style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label htmlFor={inputId} style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>
          {label}
        </label>
      )}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          height: dims, padding: "0 14px",
          background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
          border: `1px solid ${invalid ? "var(--danger-500)" : "var(--border-default)"}`,
          borderRadius: "var(--radius-md)",
          transition: "border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)",
          opacity: disabled ? 0.6 : 1,
        }}
        onFocusCapture={(e) => { if (!invalid) { e.currentTarget.style.borderColor = "var(--border-focus)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--focus-ring)"; } }}
        onBlurCapture={(e) => { e.currentTarget.style.borderColor = invalid ? "var(--danger-500)" : "var(--border-default)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        {iconLeft && <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>{iconLeft}</span>}
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          style={{
            flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
            fontFamily: "var(--font-sans)", fontSize: "var(--text-md)", color: "var(--text-primary)",
          }}
          {...rest}
        />
        {iconRight && <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>{iconRight}</span>}
      </div>
      {(error || hint) && (
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: invalid ? "var(--danger-500)" : "var(--text-muted)" }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
