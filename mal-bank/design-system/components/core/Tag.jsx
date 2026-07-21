import React from "react";

/**
 * Tag — selectable/removable chip. Used for filters and categories.
 */
export function Tag({
  selected = false,
  removable = false,
  onRemove = null,
  iconLeft = null,
  className = "",
  style = {},
  children,
  ...rest
}) {
  return (
    <span
      className={`mal-tag ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 32,
        padding: "0 12px",
        background: selected ? "var(--surface-inverse)" : "var(--surface-card)",
        color: selected ? "var(--text-inverse)" : "var(--text-secondary)",
        border: `1px solid ${selected ? "var(--surface-inverse)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-medium)",
        cursor: rest.onClick ? "pointer" : "default",
        transition: "background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {iconLeft}
      {children}
      {removable && (
        <button
          type="button"
          aria-label="Remove"
          onClick={(e) => { e.stopPropagation(); onRemove && onRemove(e); }}
          style={{
            display: "inline-flex", border: "none", background: "transparent",
            cursor: "pointer", padding: 0, marginRight: -2, color: "inherit", opacity: 0.7,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      )}
    </span>
  );
}
