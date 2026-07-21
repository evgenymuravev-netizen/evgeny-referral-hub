import React from "react";

/**
 * Select — native <select> styled to match Mal fields, with a chevron.
 */
export function Select({
  label = null,
  hint = null,
  error = null,
  size = "md",      // sm | md | lg
  disabled = false,
  id,
  options = [],     // [{value,label}] or string[]
  placeholder = null,
  className = "",
  style = {},
  children,
  ...rest
}) {
  const dims = { sm: 40, md: 48, lg: 56 }[size];
  const selId = id || (label ? `sel-${String(label).replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const invalid = !!error;
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));

  return (
    <div className={`mal-field ${className}`} style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label htmlFor={selId} style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-secondary)" }}>{label}</label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select
          id={selId}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          style={{
            appearance: "none", WebkitAppearance: "none",
            width: "100%", height: dims, padding: "0 40px 0 14px",
            background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
            border: `1px solid ${invalid ? "var(--danger-500)" : "var(--border-default)"}`,
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-sans)", fontSize: "var(--text-md)", color: "var(--text-primary)",
            cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, outline: "none",
          }}
          onFocus={(e) => { if (!invalid) { e.currentTarget.style.borderColor = "var(--border-focus)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--focus-ring)"; } }}
          onBlur={(e) => { e.currentTarget.style.borderColor = invalid ? "var(--danger-500)" : "var(--border-default)"; e.currentTarget.style.boxShadow = "none"; }}
          {...rest}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          {children}
        </select>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 14, pointerEvents: "none" }}><path d="m6 9 6 6 6-6" /></svg>
      </div>
      {(error || hint) && (
        <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: invalid ? "var(--danger-500)" : "var(--text-muted)" }}>{error || hint}</span>
      )}
    </div>
  );
}
