import React from "react";

/**
 * Curated thin-line icon set matching Mal's iconography (Lucide-style,
 * 1.6px stroke, rounded caps/joins). Paths are Lucide (ISC licensed).
 * Kept inline so the component is self-contained — no CDN dependency.
 */
const PATHS = {
  "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  "arrow-up-right": '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sparkles: '<path d="M9.9 2.6 12 7l4.4 2.1L12 11.2 9.9 15.6 7.8 11.2 3.4 9.1 7.8 7z"/><path d="M18 4v4"/><path d="M20 6h-4"/>',
  "credit-card": '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
  "shield-check": '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1 1 0 0 1 1.5 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  crown: '<path d="M11.6 3.4a.6.6 0 0 1 .9 0l2.9 3.5 4.1-2.4a.6.6 0 0 1 .9.6l-1.7 8.5a1 1 0 0 1-1 .8H6.3a1 1 0 0 1-1-.8L3.6 5.1a.6.6 0 0 1 .9-.6l4.1 2.4z"/><path d="M5 20h14"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
  "map-pin": '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  wallet: '<path d="M19 7V5a1 1 0 0 0-1-1H4a2 2 0 0 0 0 4h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a2 2 0 0 1-2-2V6"/><path d="M17.5 12h.01"/>',
  "trending-up": '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
  "arrow-down-left": '<path d="M17 7 7 17"/><path d="M17 17H7V7"/>',
  "arrow-up-right-tx": '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
  bell: '<path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/><path d="M21 15c-1-1-1.7-2-1.7-4V7a7.3 7.3 0 0 0-14.6 0v4c0 2-.7 3-1.7 4z"/>',
  settings: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2 1.7 1.7 0 0 1-1 1.5 1.7 1.7 0 0 1-1.8-.3 2 2 0 0 0-2.7.1l-.4.4a2 2 0 0 0-.1 2.7 1.7 1.7 0 0 1 .3 1.9 1.7 1.7 0 0 1-1.5 1 2 2 0 0 0-2 2v.4a2 2 0 0 0 2 2 1.7 1.7 0 0 1 1.5 1 1.7 1.7 0 0 1-.3 1.8 2 2 0 0 0 .1 2.7l.4.4a2 2 0 0 0 2.7.1 1.7 1.7 0 0 1 1.9-.3 1.7 1.7 0 0 1 1 1.5 2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2 1.7 1.7 0 0 1 1-1.5 1.7 1.7 0 0 1 1.8.3 2 2 0 0 0 2.7-.1l.4-.4a2 2 0 0 0 .1-2.7 1.7 1.7 0 0 1-.3-1.9 1.7 1.7 0 0 1 1.5-1 2 2 0 0 0 2-2v-.4a2 2 0 0 0-2-2 1.7 1.7 0 0 1-1.5-1 1.7 1.7 0 0 1 .3-1.8 2 2 0 0 0-.1-2.7l-.4-.4a2 2 0 0 0-2.7-.1 1.7 1.7 0 0 1-1.9.3 1.7 1.7 0 0 1-1-1.5 2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  home: '<path d="M3 10.2 12 3l9 7.2"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  send: '<path d="M14.5 9.5 21 3l-6.5 18-3-7-7-3z"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7"/><circle cx="12" cy="12" r="3"/>',
  "eye-off": '<path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a13 13 0 0 1-2.2 3M6.6 6.6A13 13 0 0 0 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6"/><path d="m2 2 20 20"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  "alert-triangle": '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
};

/**
 * Icon — renders a thin-line brand icon by name.
 */
export function Icon({ name, size = 20, strokeWidth = 1.6, color = "currentColor", className = "", style = {}, ...rest }) {
  const d = PATHS[name];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "inline-block", flexShrink: 0, ...style }}
      aria-hidden={rest["aria-label"] ? undefined : true}
      {...rest}
      dangerouslySetInnerHTML={d ? { __html: d } : undefined}
    />
  );
}

export const iconNames = Object.keys(PATHS);
