import React from "react";

/**
 * Dialog — centered modal over a dimmed scrim. Uncontrolled visibility via `open`.
 */
export function Dialog({
  open = false,
  onClose = null,
  title = null,
  description = null,
  footer = null,
  size = "md",     // sm | md | lg
  className = "",
  style = {},
  children,
  ...rest
}) {
  if (!open) return null;
  const maxW = { sm: 400, md: 520, lg: 680 }[size];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "var(--space-6)",
        background: "rgba(14,14,16,0.42)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        animation: "malFade var(--dur-base) var(--ease-out)",
      }}
    >
      <div
        className={`mal-dialog ${className}`}
        style={{
          width: "100%", maxWidth: maxW,
          background: "var(--surface-card)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--border-subtle)",
          overflow: "hidden",
          animation: "malPop var(--dur-slow) var(--ease-out)",
          ...style,
        }}
        {...rest}
      >
        <div style={{ padding: "var(--space-6)" }}>
          {(title || onClose) && (
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: description ? 6 : 12 }}>
              {title && <h3 style={{ fontSize: "var(--text-xl)", fontWeight: "var(--weight-semibold)" }}>{title}</h3>}
              {onClose && (
                <button type="button" aria-label="Close" onClick={onClose} style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", padding: 4, margin: -4 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          )}
          {description && <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "var(--text-md)", lineHeight: "var(--leading-normal)" }}>{description}</p>}
          {children}
        </div>
        {footer && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "var(--space-4) var(--space-6)", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-page)" }}>
            {footer}
          </div>
        )}
      </div>
      <style>{`@keyframes malFade{from{opacity:0}to{opacity:1}}@keyframes malPop{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
