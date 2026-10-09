import React from "react";

/**
 * GradientMesh — Mal's signature iridescent pastel background.
 * Recreates the mal.ai mesh in pure CSS (layered radial gradients).
 */
export function GradientMesh({
  variant = "hero",       // "hero" | "cool" | "warm" | "veil"
  grain = true,           // soft film-grain overlay
  radius = "var(--radius-xl)",
  className = "",
  style = {},
  children,
  ...rest
}) {
  const bg = {
    hero: "var(--mesh-hero)",
    cool: "var(--mesh-cool)",
    warm: "var(--mesh-warm)",
    veil: "var(--mesh-veil)",
  }[variant] || "var(--mesh-hero)";

  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: radius,
        background: bg,
        backgroundColor: variant === "veil" ? "var(--neutral-50)" : undefined,
        ...style,
      }}
      {...rest}
    >
      {grain && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.5,
            mixBlendMode: "soft-light",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      )}
      {children}
    </div>
  );
}
