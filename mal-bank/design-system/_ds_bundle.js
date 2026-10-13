/* @ds-bundle: {"format":4,"namespace":"MalDesignSystem_097b20","components":[{"name":"AccountCard","sourcePath":"components/banking/AccountCard.jsx"},{"name":"ChatBubble","sourcePath":"components/banking/ChatBubble.jsx"},{"name":"TransactionRow","sourcePath":"components/banking/TransactionRow.jsx"},{"name":"GradientMesh","sourcePath":"components/brand/GradientMesh.jsx"},{"name":"Icon","sourcePath":"components/brand/Icon.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"}],"sourceHashes":{"components/banking/AccountCard.jsx":"26d724e1df06","components/banking/ChatBubble.jsx":"257659905d77","components/banking/TransactionRow.jsx":"67b9c6b721e2","components/brand/GradientMesh.jsx":"55a2f1ca971d","components/brand/Icon.jsx":"bd5b93db89de","components/core/Badge.jsx":"3589aa8d3129","components/core/Button.jsx":"e22ca70da75b","components/core/Card.jsx":"7f5099090958","components/core/IconButton.jsx":"5d31e8bbe657","components/core/Tag.jsx":"84d3eb3fc748","components/feedback/Dialog.jsx":"fd673ccd5e36","components/feedback/Toast.jsx":"36b85385df1b","components/feedback/Tooltip.jsx":"4f158aa240ae","components/forms/Checkbox.jsx":"34d297b8b066","components/forms/Input.jsx":"f12768402036","components/forms/Select.jsx":"7d068e2f7d49","components/forms/Switch.jsx":"ddbc6d625f51","ui_kits/app/App.jsx":"71a640c9df7e","ui_kits/website/Landing.jsx":"c7be0c594476"},"inlinedExternals":[],"unexposedExports":[{"name":"iconNames","sourcePath":"components/brand/Icon.jsx"}]} */

(() => {

const __ds_ns = (window.MalDesignSystem_097b20 = window.MalDesignSystem_097b20 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/banking/AccountCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AccountCard — balance / payment-card surface on the signature mesh.
 */
function AccountCard({
  label = "Available balance",
  amount = "0.00",
  currency = "AED",
  cardName = null,
  cardLast4 = null,
  variant = "mesh",
  // mesh | ink | light
  hidden = false,
  // masks the amount
  footer = null,
  className = "",
  style = {},
  ...rest
}) {
  const surfaces = {
    mesh: {
      background: "var(--mesh-hero)",
      color: "var(--ink-900)",
      border: "1px solid var(--glass-border)"
    },
    ink: {
      background: "var(--ink-900)",
      color: "#fff",
      border: "1px solid var(--ink-900)"
    },
    light: {
      background: "var(--surface-card)",
      color: "var(--ink-900)",
      border: "1px solid var(--border-subtle)"
    }
  }[variant];
  const sub = variant === "ink" ? "rgba(255,255,255,0.7)" : "var(--text-secondary)";
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `mal-account-card mal-grain ${className}`,
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: "var(--radius-xl)",
      padding: "var(--space-6)",
      minHeight: 190,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxShadow: "var(--shadow-md)",
      ...surfaces,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "overline",
    style: {
      color: sub
    }
  }, label), /*#__PURE__*/React.createElement("svg", {
    width: "34",
    height: "22",
    viewBox: "0 0 34 22",
    fill: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "11",
    r: "9",
    fill: variant === "ink" ? "rgba(255,255,255,0.85)" : "var(--ink-900)",
    opacity: "0.85"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "22",
    cy: "11",
    r: "9",
    fill: variant === "ink" ? "rgba(255,255,255,0.4)" : "var(--ink-900)",
    opacity: "0.35"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "tnum",
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: "var(--weight-semibold)",
      letterSpacing: "-0.02em",
      fontSize: "var(--text-3xl)",
      display: "flex",
      alignItems: "baseline",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-lg)",
      fontWeight: "var(--weight-medium)",
      color: sub
    }
  }, currency), /*#__PURE__*/React.createElement("span", null, hidden ? "••••••" : amount))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tnum",
    style: {
      fontSize: "var(--text-sm)",
      color: sub,
      letterSpacing: "0.06em"
    }
  }, cardLast4 ? `•••• ${cardLast4}` : cardName || ""), footer));
}
Object.assign(__ds_scope, { AccountCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/banking/AccountCard.jsx", error: String((e && e.message) || e) }); }

// components/banking/ChatBubble.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ChatBubble — message bubble for Mal's AI assistant ("Conversations that create action").
 */
function ChatBubble({
  from = "assistant",
  // assistant | user
  children,
  actions = null,
  // optional action chips/buttons below the text
  timestamp = null,
  className = "",
  style = {},
  ...rest
}) {
  const isUser = from === "user";
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `mal-chat-bubble ${className}`,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      gap: 8,
      maxWidth: "82%",
      alignSelf: isUser ? "flex-end" : "flex-start",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderRadius: isUser ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
      background: isUser ? "var(--ink-900)" : "var(--surface-card)",
      color: isUser ? "var(--neutral-0)" : "var(--text-primary)",
      border: isUser ? "1px solid var(--ink-900)" : "1px solid var(--border-subtle)",
      boxShadow: isUser ? "none" : "var(--shadow-xs)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-md)",
      lineHeight: "var(--leading-normal)"
    }
  }, children), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, actions), timestamp && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xs)",
      color: "var(--text-muted)",
      padding: "0 4px"
    }
  }, timestamp));
}
Object.assign(__ds_scope, { ChatBubble });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/banking/ChatBubble.jsx", error: String((e && e.message) || e) }); }

// components/banking/TransactionRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TransactionRow — a single ledger line: icon, merchant, meta, amount.
 */
function TransactionRow({
  icon = null,
  title,
  subtitle = null,
  amount,
  currency = "AED",
  direction = "out",
  // out | in
  badge = null,
  onClick = null,
  className = "",
  style = {},
  ...rest
}) {
  const isIn = direction === "in";
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `mal-tx-row ${className}`,
    onClick: onClick,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 8px",
      cursor: onClick ? "pointer" : "default",
      borderRadius: "var(--radius-md)",
      transition: "background var(--dur-fast) var(--ease-standard)",
      ...style
    },
    onMouseEnter: onClick ? e => e.currentTarget.style.background = "var(--surface-hover)" : undefined,
    onMouseLeave: onClick ? e => e.currentTarget.style.background = "transparent" : undefined
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 42,
      height: 42,
      flexShrink: 0,
      borderRadius: "var(--radius-md)",
      background: "var(--surface-sunken)",
      color: "var(--ink-800)"
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-md)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-primary)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, title), badge), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)",
      marginTop: 1
    }
  }, subtitle)), /*#__PURE__*/React.createElement("span", {
    className: "tnum",
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-md)",
      fontWeight: "var(--weight-semibold)",
      color: isIn ? "var(--success-500)" : "var(--text-primary)",
      whiteSpace: "nowrap"
    }
  }, isIn ? "+" : "−", currency, " ", amount));
}
Object.assign(__ds_scope, { TransactionRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/banking/TransactionRow.jsx", error: String((e && e.message) || e) }); }

// components/brand/GradientMesh.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * GradientMesh — Mal's signature iridescent pastel background.
 * Recreates the mal.ai mesh in pure CSS (layered radial gradients).
 */
function GradientMesh({
  variant = "hero",
  // "hero" | "cool" | "warm" | "veil"
  grain = true,
  // soft film-grain overlay
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
    veil: "var(--mesh-veil)"
  }[variant] || "var(--mesh-hero)";
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: radius,
      background: bg,
      backgroundColor: variant === "veil" ? "var(--neutral-50)" : undefined,
      ...style
    }
  }, rest), grain && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      opacity: 0.5,
      mixBlendMode: "soft-light",
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
    }
  }), children);
}
Object.assign(__ds_scope, { GradientMesh });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/GradientMesh.jsx", error: String((e && e.message) || e) }); }

// components/brand/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
  "alert-triangle": '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
};

/**
 * Icon — renders a thin-line brand icon by name.
 */
function Icon({
  name,
  size = 20,
  strokeWidth = 1.6,
  color = "currentColor",
  className = "",
  style = {},
  ...rest
}) {
  const d = PATHS[name];
  return /*#__PURE__*/React.createElement("svg", _extends({
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: {
      display: "inline-block",
      flexShrink: 0,
      ...style
    },
    "aria-hidden": rest["aria-label"] ? undefined : true
  }, rest, {
    dangerouslySetInnerHTML: d ? {
      __html: d
    } : undefined
  }));
}
const iconNames = Object.keys(PATHS);
Object.assign(__ds_scope, { Icon, iconNames });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — small status/label pill. Soft tinted fills.
 */
function Badge({
  tone = "neutral",
  // neutral | iris | success | warning | danger | info
  variant = "soft",
  // soft | solid | outline
  size = "md",
  // sm | md
  dot = false,
  className = "",
  style = {},
  children,
  ...rest
}) {
  const tones = {
    neutral: {
      soft: ["var(--neutral-100)", "var(--ink-700)"],
      solid: ["var(--ink-900)", "#fff"],
      line: "var(--border-strong)",
      dot: "var(--ink-500)"
    },
    iris: {
      soft: ["var(--tint-iris)", "#3d3a8f"],
      solid: ["var(--iris-periwinkle)", "var(--ink-900)"],
      line: "var(--iris-periwinkle)",
      dot: "var(--iris-periwinkle)"
    },
    success: {
      soft: ["var(--success-100)", "#166b47"],
      solid: ["var(--success-500)", "#fff"],
      line: "var(--success-500)",
      dot: "var(--success-500)"
    },
    warning: {
      soft: ["var(--warning-100)", "#8c5c12"],
      solid: ["var(--warning-500)", "#fff"],
      line: "var(--warning-500)",
      dot: "var(--warning-500)"
    },
    danger: {
      soft: ["var(--danger-100)", "#a1352d"],
      solid: ["var(--danger-500)", "#fff"],
      line: "var(--danger-500)",
      dot: "var(--danger-500)"
    },
    info: {
      soft: ["var(--info-100)", "#3446a8"],
      solid: ["var(--info-500)", "#fff"],
      line: "var(--info-500)",
      dot: "var(--info-500)"
    }
  }[tone];
  const dims = size === "sm" ? {
    h: 20,
    px: 8,
    fs: "var(--text-2xs)"
  } : {
    h: 24,
    px: 10,
    fs: "var(--text-xs)"
  };
  let bg = "transparent",
    color = tones.soft[1],
    border = "1px solid transparent";
  if (variant === "soft") {
    bg = tones.soft[0];
    color = tones.soft[1];
  } else if (variant === "solid") {
    bg = tones.solid[0];
    color = tones.solid[1];
  } else if (variant === "outline") {
    color = tones.soft[1];
    border = `1px solid ${tones.line}`;
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `mal-badge ${className}`,
    style: {
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
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: tones.dot
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — Mal's primary action. Pill-shaped, ink-forward, calm motion.
 */
function Button({
  variant = "primary",
  // primary | secondary | ghost | accent
  size = "md",
  // sm | md | lg
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
    sm: {
      height: 36,
      padding: "0 16px",
      font: "var(--text-sm)",
      gap: 6
    },
    md: {
      height: 44,
      padding: "0 22px",
      font: "var(--text-md)",
      gap: 8
    },
    lg: {
      height: 54,
      padding: "0 30px",
      font: "var(--text-lg)",
      gap: 10
    }
  }[size];
  const variants = {
    primary: {
      background: "var(--action-primary)",
      color: "var(--action-primary-text)",
      border: "1px solid var(--action-primary)"
    },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-default)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-primary)",
      border: "1px solid transparent"
    },
    accent: {
      background: "var(--action-accent)",
      color: "var(--neutral-0)",
      border: "1px solid var(--action-accent)"
    }
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    "data-variant": variant,
    className: `mal-btn ${className}`,
    style: {
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
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.97)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — surface container. Soft radius, hairline border, light shadow.
 */
function Card({
  variant = "default",
  // default | elevated | outline | mesh
  padding = "lg",
  // none | sm | md | lg
  interactive = false,
  className = "",
  style = {},
  children,
  ...rest
}) {
  const pads = {
    none: 0,
    sm: "var(--space-4)",
    md: "var(--space-5)",
    lg: "var(--space-6)"
  }[padding];
  const variants = {
    default: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      boxShadow: "var(--shadow-sm)"
    },
    elevated: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      boxShadow: "var(--shadow-lg)"
    },
    outline: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      boxShadow: "none"
    },
    mesh: {
      background: "var(--mesh-cool)",
      border: "1px solid var(--glass-border)",
      boxShadow: "var(--shadow-md)"
    }
  }[variant];
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `mal-card ${className}`,
    style: {
      borderRadius: "var(--radius-lg)",
      padding: pads,
      transition: interactive ? "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)" : undefined,
      cursor: interactive ? "pointer" : undefined,
      ...variants,
      ...style
    },
    onMouseEnter: interactive ? e => {
      e.currentTarget.style.transform = "translateY(-3px)";
      e.currentTarget.style.boxShadow = "var(--shadow-lg)";
    } : undefined,
    onMouseLeave: interactive ? e => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = variants.boxShadow;
    } : undefined
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * IconButton — square/circular icon-only action.
 */
function IconButton({
  variant = "secondary",
  // primary | secondary | ghost
  size = "md",
  // sm | md | lg
  shape = "circle",
  // circle | rounded
  disabled = false,
  "aria-label": ariaLabel,
  className = "",
  style = {},
  children,
  // an <Icon/>
  ...rest
}) {
  const dim = {
    sm: 36,
    md: 44,
    lg: 52
  }[size];
  const variants = {
    primary: {
      background: "var(--action-primary)",
      color: "var(--action-primary-text)",
      border: "1px solid var(--action-primary)"
    },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-default)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-primary)",
      border: "1px solid transparent"
    }
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    "aria-label": ariaLabel,
    className: `mal-iconbtn ${className}`,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: dim,
      height: dim,
      borderRadius: shape === "circle" ? "var(--radius-pill)" : "var(--radius-md)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "background var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard)",
      ...variants,
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.94)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tag — selectable/removable chip. Used for filters and categories.
 */
function Tag({
  selected = false,
  removable = false,
  onRemove = null,
  iconLeft = null,
  className = "",
  style = {},
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `mal-tag ${className}`,
    style: {
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
      ...style
    }
  }, rest), iconLeft, children, removable && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Remove",
    onClick: e => {
      e.stopPropagation();
      onRemove && onRemove(e);
    },
    style: {
      display: "inline-flex",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      padding: 0,
      marginRight: -2,
      color: "inherit",
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Dialog — centered modal over a dimmed scrim. Uncontrolled visibility via `open`.
 */
function Dialog({
  open = false,
  onClose = null,
  title = null,
  description = null,
  footer = null,
  size = "md",
  // sm | md | lg
  className = "",
  style = {},
  children,
  ...rest
}) {
  if (!open) return null;
  const maxW = {
    sm: 400,
    md: 520,
    lg: 680
  }[size];
  return /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    onClick: e => {
      if (e.target === e.currentTarget && onClose) onClose();
    },
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "var(--space-6)",
      background: "rgba(14,14,16,0.42)",
      backdropFilter: "blur(4px)",
      WebkitBackdropFilter: "blur(4px)",
      animation: "malFade var(--dur-base) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("div", _extends({
    className: `mal-dialog ${className}`,
    style: {
      width: "100%",
      maxWidth: maxW,
      background: "var(--surface-card)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-xl)",
      border: "1px solid var(--border-subtle)",
      overflow: "hidden",
      animation: "malPop var(--dur-slow) var(--ease-out)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-6)"
    }
  }, (title || onClose) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: description ? 6 : 12
    }
  }, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--text-xl)",
      fontWeight: "var(--weight-semibold)"
    }
  }, title), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Close",
    onClick: onClose,
    style: {
      display: "inline-flex",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "var(--text-muted)",
      padding: 4,
      margin: -4
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  })))), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 16px",
      color: "var(--text-secondary)",
      fontSize: "var(--text-md)",
      lineHeight: "var(--leading-normal)"
    }
  }, description), children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      padding: "var(--space-4) var(--space-6)",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--surface-page)"
    }
  }, footer)), /*#__PURE__*/React.createElement("style", null, `@keyframes malFade{from{opacity:0}to{opacity:1}}@keyframes malPop{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:none}}`));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Toast — transient notification. Render inline where you manage positioning.
 */
function Toast({
  tone = "neutral",
  // neutral | success | warning | danger | info
  title = null,
  message = null,
  icon = null,
  onClose = null,
  className = "",
  style = {},
  ...rest
}) {
  const tones = {
    neutral: "var(--ink-900)",
    success: "var(--success-500)",
    warning: "var(--warning-500)",
    danger: "var(--danger-500)",
    info: "var(--info-500)"
  };
  const accent = tones[tone];
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    className: `mal-toast ${className}`,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      minWidth: 280,
      maxWidth: 420,
      padding: "14px 16px",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-lg)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      alignSelf: "stretch",
      borderRadius: 4,
      background: accent,
      flexShrink: 0
    }
  }), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: accent,
      display: "inline-flex",
      marginTop: 1
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-primary)"
    }
  }, title), message && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      color: "var(--text-secondary)",
      marginTop: title ? 2 : 0
    }
  }, message)), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Dismiss",
    onClick: onClose,
    style: {
      display: "inline-flex",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "var(--text-muted)",
      padding: 2,
      margin: -2
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tooltip — hover/focus label. CSS-driven, no portal.
 */
function Tooltip({
  label,
  side = "top",
  // top | bottom | left | right
  className = "",
  style = {},
  children,
  ...rest
}) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: {
      bottom: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    bottom: {
      top: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    left: {
      right: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)"
    },
    right: {
      left: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)"
    }
  }[side];
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      position: "relative",
      display: "inline-flex",
      ...style
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocusCapture: () => setShow(true),
    onBlurCapture: () => setShow(false)
  }, rest), children, /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      ...pos,
      zIndex: 900,
      padding: "6px 10px",
      background: "var(--ink-900)",
      color: "var(--neutral-0)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-medium)",
      borderRadius: "var(--radius-sm)",
      whiteSpace: "nowrap",
      boxShadow: "var(--shadow-md)",
      opacity: show ? 1 : 0,
      visibility: show ? "visible" : "hidden",
      transition: "opacity var(--dur-fast) var(--ease-standard)",
      pointerEvents: "none"
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Checkbox — square check control with optional label.
 */
function Checkbox({
  checked = false,
  onChange = null,
  disabled = false,
  label = null,
  id,
  className = "",
  style = {},
  ...rest
}) {
  const boxId = id || (label ? `cb-${String(label).replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const box = /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "checkbox",
    id: boxId,
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 22,
      height: 22,
      flexShrink: 0,
      padding: 0,
      borderRadius: "var(--radius-xs)",
      border: `1.5px solid ${checked ? "var(--action-primary)" : "var(--border-strong)"}`,
      background: checked ? "var(--action-primary)" : "var(--surface-card)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)"
    }
  }, rest), checked && /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  })));
  if (!label) return box;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: boxId,
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      ...style
    }
  }, box, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-md)",
      color: "var(--text-primary)"
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Input — text field with optional label, icons, and helper/error text.
 */
function Input({
  label = null,
  hint = null,
  error = null,
  iconLeft = null,
  iconRight = null,
  size = "md",
  // sm | md | lg
  disabled = false,
  id,
  className = "",
  style = {},
  ...rest
}) {
  const dims = {
    sm: 40,
    md: 48,
    lg: 56
  }[size];
  const inputId = id || (label ? `in-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const invalid = !!error;
  return /*#__PURE__*/React.createElement("div", {
    className: `mal-field ${className}`,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      height: dims,
      padding: "0 14px",
      background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
      border: `1px solid ${invalid ? "var(--danger-500)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-md)",
      transition: "border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)",
      opacity: disabled ? 0.6 : 1
    },
    onFocusCapture: e => {
      if (!invalid) {
        e.currentTarget.style.borderColor = "var(--border-focus)";
        e.currentTarget.style.boxShadow = "0 0 0 3px var(--focus-ring)";
      }
    },
    onBlurCapture: e => {
      e.currentTarget.style.borderColor = invalid ? "var(--danger-500)" : "var(--border-default)";
      e.currentTarget.style.boxShadow = "none";
    }
  }, iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      display: "inline-flex"
    }
  }, iconLeft), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-md)",
      color: "var(--text-primary)"
    }
  }, rest)), iconRight && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      display: "inline-flex"
    }
  }, iconRight)), (error || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      color: invalid ? "var(--danger-500)" : "var(--text-muted)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Select — native <select> styled to match Mal fields, with a chevron.
 */
function Select({
  label = null,
  hint = null,
  error = null,
  size = "md",
  // sm | md | lg
  disabled = false,
  id,
  options = [],
  // [{value,label}] or string[]
  placeholder = null,
  className = "",
  style = {},
  children,
  ...rest
}) {
  const dims = {
    sm: 40,
    md: 48,
    lg: 56
  }[size];
  const selId = id || (label ? `sel-${String(label).replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const invalid = !!error;
  const opts = options.map(o => typeof o === "string" ? {
    value: o,
    label: o
  } : o);
  return /*#__PURE__*/React.createElement("div", {
    className: `mal-field ${className}`,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: selId,
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-secondary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: selId,
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    style: {
      appearance: "none",
      WebkitAppearance: "none",
      width: "100%",
      height: dims,
      padding: "0 40px 0 14px",
      background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
      border: `1px solid ${invalid ? "var(--danger-500)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-md)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-md)",
      color: "var(--text-primary)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
      outline: "none"
    },
    onFocus: e => {
      if (!invalid) {
        e.currentTarget.style.borderColor = "var(--border-focus)";
        e.currentTarget.style.boxShadow = "0 0 0 3px var(--focus-ring)";
      }
    },
    onBlur: e => {
      e.currentTarget.style.borderColor = invalid ? "var(--danger-500)" : "var(--border-default)";
      e.currentTarget.style.boxShadow = "none";
    }
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), opts.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label)), children), /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--text-muted)",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      position: "absolute",
      right: 14,
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }))), (error || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-xs)",
      color: invalid ? "var(--danger-500)" : "var(--text-muted)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Switch — on/off toggle. Ink-filled track when on.
 */
function Switch({
  checked = false,
  onChange = null,
  disabled = false,
  size = "md",
  // sm | md
  label = null,
  id,
  className = "",
  style = {},
  ...rest
}) {
  const dims = size === "sm" ? {
    w: 40,
    h: 24,
    k: 18
  } : {
    w: 48,
    h: 28,
    k: 22
  };
  const pad = (dims.h - dims.k) / 2;
  const switchId = id || (label ? `sw-${String(label).replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const control = /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    id: switchId,
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      position: "relative",
      width: dims.w,
      height: dims.h,
      flexShrink: 0,
      borderRadius: "var(--radius-pill)",
      border: "none",
      background: checked ? "var(--action-primary)" : "var(--neutral-300)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "background var(--dur-base) var(--ease-standard)",
      padding: 0
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: pad,
      left: checked ? dims.w - dims.k - pad : pad,
      width: dims.k,
      height: dims.k,
      borderRadius: "50%",
      background: "#fff",
      boxShadow: "var(--shadow-sm)",
      transition: "left var(--dur-base) var(--ease-out)"
    }
  }));
  if (!label) return control;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: switchId,
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      ...style
    }
  }, control, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-md)",
      color: "var(--text-primary)"
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/App.jsx
try { (() => {
/* Mal mobile banking app — interactive click-through recreation.
   External Babel file: use globals, no import/export. */
const {
  AccountCard,
  TransactionRow,
  ChatBubble,
  Card,
  Button,
  IconButton,
  Badge,
  Tag,
  Icon,
  Input,
  Switch
} = window.MalDesignSystem_097b20;

/* ---------- shared data ---------- */
const TXNS = [{
  icon: "credit-card",
  title: "Careem",
  subtitle: "Transport · Today",
  amount: "42.00",
  direction: "out",
  tag: "Halal"
}, {
  icon: "wallet",
  title: "Carrefour",
  subtitle: "Groceries · Today",
  amount: "218.40",
  direction: "out"
}, {
  icon: "arrow-down-left",
  title: "Salary — ADCB",
  subtitle: "Income · 1 Jul",
  amount: "12,000.00",
  direction: "in"
}, {
  icon: "sparkles",
  title: "Noon",
  subtitle: "Shopping · 30 Jun",
  amount: "89.00",
  direction: "out"
}, {
  icon: "map-pin",
  title: "Emirates",
  subtitle: "Travel · 28 Jun",
  amount: "1,240.00",
  direction: "out",
  tag: "Halal"
}];

/* ---------- Status bar ---------- */
function StatusBar({
  dark
}) {
  const c = dark ? "#fff" : "var(--ink-900)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 24px 4px",
      fontSize: 14,
      fontWeight: 600,
      color: c,
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tnum"
  }, "9:41"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "12",
    viewBox: "0 0 18 12",
    fill: c
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7",
    width: "3",
    height: "5",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.5",
    y: "4.5",
    width: "3",
    height: "7.5",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "2",
    width: "3",
    height: "10",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13.5",
    y: "0",
    width: "3",
    height: "12",
    rx: "1"
  })), /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "12",
    viewBox: "0 0 22 12",
    fill: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "18",
    height: "11",
    rx: "3",
    stroke: c,
    opacity: "0.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "14",
    height: "8",
    rx: "1.5",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "19.5",
    y: "4",
    width: "1.5",
    height: "4",
    rx: "0.75",
    fill: c
  }))));
}

/* ---------- Tab bar ---------- */
function TabBar({
  active,
  onNav
}) {
  const tabs = [["home", "Home"], ["trending-up", "Insights"], ["sparkles", "Ask Mal"], ["credit-card", "Card"], ["user", "Profile"]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      padding: "10px 8px 22px",
      borderTop: "1px solid var(--border-subtle)",
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(20px)"
    }
  }, tabs.map(([icon, label]) => {
    const on = active === label;
    return /*#__PURE__*/React.createElement("button", {
      key: label,
      onClick: () => onNav(label),
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        border: "none",
        background: "none",
        cursor: "pointer",
        color: on ? "var(--ink-900)" : "var(--text-muted)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: icon,
      size: 22,
      strokeWidth: on ? 2 : 1.6
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: on ? 600 : 500
      }
    }, label));
  }));
}

/* ---------- Home ---------- */
function Home({
  onNav
}) {
  const [hidden, setHidden] = React.useState(false);
  const actions = [["send", "Send"], ["arrow-down-left", "Request"], ["credit-card", "Pay"], ["plus", "Top up"]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "8px 18px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 0 16px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Assalamu alaikum"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      letterSpacing: "-0.01em"
    }
  }, "Layla")), /*#__PURE__*/React.createElement(IconButton, {
    "aria-label": "Notifications"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell"
  }))), /*#__PURE__*/React.createElement(AccountCard, {
    label: "Available balance",
    currency: "AED",
    amount: "12,480.50",
    cardLast4: "4417",
    hidden: hidden,
    footer: /*#__PURE__*/React.createElement("button", {
      onClick: () => setHidden(h => !h),
      style: {
        border: "none",
        background: "var(--glass-fill)",
        borderRadius: "var(--radius-pill)",
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: hidden ? "eye" : "eye-off",
      size: 18
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 18
    }
  }, actions.map(([icon, label]) => /*#__PURE__*/React.createElement("button", {
    key: label,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      border: "none",
      background: "none",
      cursor: "pointer",
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 52,
      height: 52,
      borderRadius: "var(--radius-lg)",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      boxShadow: "var(--shadow-xs)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 22
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-secondary)",
      fontWeight: 500
    }
  }, label)))), /*#__PURE__*/React.createElement("div", {
    onClick: () => onNav("Ask Mal"),
    style: {
      marginTop: 20,
      position: "relative",
      overflow: "hidden",
      borderRadius: "var(--radius-lg)",
      padding: 16,
      background: "var(--mesh-cool)",
      border: "1px solid var(--glass-border)",
      cursor: "pointer",
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mal-grain",
    style: {
      position: "absolute",
      inset: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      zIndex: 2,
      width: 40,
      height: 40,
      borderRadius: "var(--radius-md)",
      background: "var(--glass-fill)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 2,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, "You could save AED 320 this month"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--ink-700)"
    }
  }, "Ask Mal how \u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 22,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 600
    }
  }, "Recent activity"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 13
    }
  }, "See all")), /*#__PURE__*/React.createElement("div", null, TXNS.slice(0, 4).map((t, i) => /*#__PURE__*/React.createElement(TransactionRow, {
    key: i,
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: t.icon
    }),
    title: t.title,
    subtitle: t.subtitle,
    amount: t.amount,
    direction: t.direction,
    badge: t.tag ? /*#__PURE__*/React.createElement(Badge, {
      tone: "iris",
      size: "sm"
    }, t.tag) : null
  }))));
}

/* ---------- Ask Mal (chat) ---------- */
function AskMal() {
  const [msgs, setMsgs] = React.useState([{
    from: "assistant",
    text: "As-salamu alaykum, Layla. I'm Mal. Ask me to move money, plan a trip, or find halal options — I'll handle it."
  }]);
  const [draft, setDraft] = React.useState("");
  const scroller = React.useRef(null);
  React.useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs]);
  function send(text) {
    const t = text || draft;
    if (!t.trim()) return;
    setMsgs(m => [...m, {
      from: "user",
      text: t
    }]);
    setDraft("");
    setTimeout(() => {
      setMsgs(m => [...m, {
        from: "assistant",
        text: "Found 3 halal-friendly hotels in Istanbul under AED 600. Top pick: Sura Hagia Sophia — AED 540/night, fully refundable, 8-min walk to the Blue Mosque.",
        action: "Book AED 540"
      }]);
    }, 600);
  }
  const prompts = ["Find a halal hotel in Istanbul", "Split dinner with Omar", "How much did I spend on travel?"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 18px 12px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: "var(--radius-pill)",
      background: "var(--mesh-hero)",
      border: "1px solid var(--glass-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 18
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, "Ask Mal"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "var(--success-500)"
    }
  }, "\u25CF Online"))), /*#__PURE__*/React.createElement("div", {
    ref: scroller,
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "8px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, msgs.map((m, i) => /*#__PURE__*/React.createElement(ChatBubble, {
    key: i,
    from: m.from,
    actions: m.action ? /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      iconRight: /*#__PURE__*/React.createElement(Icon, {
        name: "arrow-right",
        size: 16
      })
    }, m.action) : null
  }, m.text))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 14px",
      display: "flex",
      gap: 8,
      overflowX: "auto"
    }
  }, prompts.map(p => /*#__PURE__*/React.createElement(Tag, {
    key: p,
    onClick: () => send(p)
  }, p))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      padding: "8px 14px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Ask Mal anything\u2026",
    value: draft,
    onChange: e => setDraft(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") send();
    }
  })), /*#__PURE__*/React.createElement(IconButton, {
    variant: "primary",
    "aria-label": "Send",
    onClick: () => send()
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send"
  }))));
}

/* ---------- Card ---------- */
function CardScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "8px 18px 20px"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      margin: "8px 0 16px"
    }
  }, "Your card"), /*#__PURE__*/React.createElement(AccountCard, {
    variant: "ink",
    label: "Mal Platinum",
    currency: "AED",
    amount: "12,480.50",
    cardName: "LAYLA AL MANSOORI"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    fullWidth: true,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "eye",
      size: 18
    })
  }, "Details"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    fullWidth: true,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "settings",
      size: 18
    })
  }, "Freeze")), /*#__PURE__*/React.createElement(Card, {
    variant: "default",
    padding: "md",
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, "Halal spending only"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--text-muted)"
    }
  }, "Block non-compliant merchants")), /*#__PURE__*/React.createElement(Switch, {
    checked: true,
    onChange: () => {}
  }))), /*#__PURE__*/React.createElement(Card, {
    variant: "default",
    padding: "md",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, "Round-up savings"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--text-muted)"
    }
  }, "Save spare change automatically")), /*#__PURE__*/React.createElement(Switch, {
    checked: true,
    onChange: () => {}
  }))));
}

/* ---------- Simple screens ---------- */
function Insights() {
  const cats = [["Travel", 1240, "iris"], ["Groceries", 640, "success"], ["Transport", 210, "warning"], ["Shopping", 380, "info"]];
  const max = 1240;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "8px 18px 20px"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      margin: "8px 0 4px"
    }
  }, "July insights"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginTop: 0
    }
  }, "You've spent ", /*#__PURE__*/React.createElement("b", {
    className: "tnum",
    style: {
      color: "var(--text-primary)"
    }
  }, "AED 2,470"), " so far."), /*#__PURE__*/React.createElement(Card, {
    variant: "mesh",
    padding: "lg",
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--ink-700)"
    }
  }, "Projected savings"), /*#__PURE__*/React.createElement("div", {
    className: "tnum",
    style: {
      fontSize: 30,
      fontWeight: 600,
      letterSpacing: "-0.02em"
    }
  }, "AED 320")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, cats.map(([name, val, tone]) => /*#__PURE__*/React.createElement("div", {
    key: name
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, name), /*#__PURE__*/React.createElement("span", {
    className: "tnum",
    style: {
      color: "var(--text-secondary)"
    }
  }, "AED ", val)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      borderRadius: 4,
      background: "var(--surface-sunken)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: val / max * 100 + "%",
      height: "100%",
      borderRadius: 4,
      background: tone === "iris" ? "var(--iris-periwinkle)" : `var(--${tone}-500)`
    }
  }))))));
}
function Profile() {
  const rows = [["shield-check", "Security & Sharia settings"], ["credit-card", "Cards & accounts"], ["bell", "Notifications"], ["settings", "Preferences"]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "8px 18px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 0 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 60,
      borderRadius: "var(--radius-pill)",
      background: "var(--mesh-hero)",
      border: "1px solid var(--glass-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 600,
      fontSize: 22
    }
  }, "L"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 18
    }
  }, "Layla Al Mansoori"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "layla@mal.ai"))), /*#__PURE__*/React.createElement(Card, {
    variant: "default",
    padding: "none"
  }, rows.map(([icon, label], i) => /*#__PURE__*/React.createElement("div", {
    key: label,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 18px",
      borderTop: i ? "1px solid var(--border-subtle)" : "none",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 20,
    color: "var(--ink-700)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 15,
      fontWeight: 500
    }
  }, label), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 18,
    color: "var(--text-muted)"
  })))));
}

/* ---------- Login ---------- */
function Login({
  onEnter
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      position: "relative",
      display: "flex",
      flexDirection: "column",
      background: "var(--mesh-hero)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mal-grain",
    style: {
      position: "absolute",
      inset: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 2,
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      padding: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 40,
      fontWeight: 600,
      letterSpacing: "-0.04em"
    }
  }, "Mal"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: "var(--ink-800)",
      lineHeight: 1.4,
      margin: "12px 0 0",
      maxWidth: 260
    }
  }, "The future of finance is here. Your AI companion for everyday money.")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 2,
      background: "var(--surface-card)",
      borderRadius: "28px 28px 0 0",
      padding: "26px 24px 30px",
      boxShadow: "0 -12px 40px rgba(14,14,16,0.12)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    size: "lg",
    onClick: onEnter,
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 20
    })
  }, "Continue with Face ID"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      gap: 6,
      marginTop: 16,
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "New to Mal?", /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onEnter();
    }
  }, "Join the waitlist"))));
}

/* ---------- Shell ---------- */
function PhoneApp() {
  const [screen, setScreen] = React.useState("login");
  const [tab, setTab] = React.useState("Home");
  const dark = screen === "login";
  const body = screen === "login" ? /*#__PURE__*/React.createElement(Login, {
    onEnter: () => setScreen("app")
  }) : tab === "Home" ? /*#__PURE__*/React.createElement(Home, {
    onNav: setTab
  }) : tab === "Ask Mal" ? /*#__PURE__*/React.createElement(AskMal, null) : tab === "Card" ? /*#__PURE__*/React.createElement(CardScreen, null) : tab === "Insights" ? /*#__PURE__*/React.createElement(Insights, null) : /*#__PURE__*/React.createElement(Profile, null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--surface-page)",
      padding: 32,
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 390,
      height: 800,
      borderRadius: 46,
      background: "#000",
      padding: 11,
      boxShadow: "var(--shadow-xl)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: "100%",
      height: "100%",
      borderRadius: 36,
      overflow: "hidden",
      background: dark ? "transparent" : "var(--surface-page)",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 10,
      left: "50%",
      transform: "translateX(-50%)",
      width: 120,
      height: 30,
      background: "#000",
      borderRadius: 20,
      zIndex: 20
    }
  }), /*#__PURE__*/React.createElement(StatusBar, {
    dark: dark
  }), body, screen === "app" && /*#__PURE__*/React.createElement(TabBar, {
    active: tab,
    onNav: setTab
  }))));
}
window.PhoneApp = PhoneApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Landing.jsx
try { (() => {
const {
  GradientMesh,
  Icon,
  Button,
  Card,
  Input
} = window.MalDesignSystem_097b20;

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */
function Nav() {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px clamp(20px, 5vw, 48px)",
      background: "rgba(247,247,249,0.72)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 26,
      fontWeight: 600,
      letterSpacing: "-0.04em"
    }
  }, "Mal"), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#contact",
    style: {
      fontSize: 15,
      color: "var(--text-secondary)"
    }
  }, "Contact Us"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 15,
      color: "var(--text-secondary)"
    }
  }, "Career"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "Join Waitlist")));
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
function Hero({
  onJoin
}) {
  const [email, setEmail] = React.useState("");
  const [joined, setJoined] = React.useState(false);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "clamp(48px,8vw,96px) clamp(20px,5vw,48px) 0",
      maxWidth: 1120,
      margin: "0 auto",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "overline",
    style: {
      color: "var(--text-muted)"
    }
  }, "AI-native \xB7 Islamic \xB7 Digital finance"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      fontSize: "clamp(3rem, 7vw, 5.25rem)",
      lineHeight: 1.02,
      letterSpacing: "-0.035em",
      margin: "18px auto 0",
      maxWidth: 900
    }
  }, "The future of finance is here."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "clamp(1.05rem,2vw,1.25rem)",
      color: "var(--text-secondary)",
      lineHeight: 1.55,
      maxWidth: 640,
      margin: "22px auto 0"
    }
  }, "The first AI-native Islamic digital financial platform. Your digital companion for everyday choices, from travel to transactions. It finds value where others miss it, helping you do more with less effort."), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      if (email) {
        setJoined(true);
        onJoin && onJoin(email);
      }
    },
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center",
      maxWidth: 460,
      margin: "32px auto 0",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 220
    }
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "you@email.com",
    value: email,
    onChange: e => setEmail(e.target.value),
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "user",
      size: 18
    })
  })), /*#__PURE__*/React.createElement(Button, {
    type: "submit",
    variant: "primary",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 18
    })
  }, joined ? "You're in" : "Get Early Access")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginTop: 14
    }
  }, joined ? "Thanks — we'll be in touch." : "Be amongst the first to get Exclusive Early Access to our app."), /*#__PURE__*/React.createElement(GradientMesh, {
    variant: "hero",
    radius: "var(--radius-2xl)",
    style: {
      height: "clamp(280px, 42vw, 460px)",
      marginTop: 48,
      boxShadow: "var(--shadow-xl)",
      border: "1px solid var(--glass-border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 20px",
      borderRadius: "var(--radius-pill)",
      background: "var(--glass-fill)",
      border: "1px solid var(--glass-border)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      boxShadow: "var(--shadow-md)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, "Ask Mal anything \u2014 from travel to transactions")))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 14
    }
  }, "Mal is a technology company and not a bank."));
}

/* ------------------------------------------------------------------ */
/* Feature row                                                         */
/* ------------------------------------------------------------------ */
const FEATURES = [{
  icon: "sparkles",
  variant: "cool",
  title: "Smarter Journeys, Powered by AI",
  body: "Your digital companion for everyday choices, from travel to transactions. It finds value where others miss it, helping you do more with less effort."
}, {
  icon: "credit-card",
  variant: "warm",
  title: "An Intelligent Financial Layer",
  body: "Built for how you move, spend, and connect. Quietly powerful systems designed to make your financial needs feel seamless."
}, {
  icon: "message",
  variant: "hero",
  title: "Conversations That Create Action",
  body: "Ask. Act. Done. A new kind of AI that turns everyday requests into real results, instantly."
}];
function Features() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "clamp(64px,10vw,120px) clamp(20px,5vw,48px)",
      maxWidth: 1120,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "clamp(1.25rem,2.4vw,1.6rem)",
      color: "var(--text-primary)",
      maxWidth: 720,
      lineHeight: 1.4,
      fontWeight: 500,
      letterSpacing: "-0.01em"
    }
  }, "A new kind of digital platform built for how you live, earn, and grow \u2014 where AI understands your goals, anticipates your needs, and helps you move through your financial world, all at the click of a button."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 20,
      marginTop: 48
    }
  }, FEATURES.map(f => /*#__PURE__*/React.createElement(Card, {
    key: f.title,
    variant: "default",
    padding: "none",
    interactive: true,
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(GradientMesh, {
    variant: f.variant,
    radius: "0",
    style: {
      height: 190,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: "var(--radius-md)",
      background: "var(--glass-fill)",
      border: "1px solid var(--glass-border)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: f.icon,
    size: 26
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      letterSpacing: "-0.01em"
    }
  }, f.title), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 8,
      color: "var(--text-secondary)",
      fontSize: 15,
      lineHeight: 1.55
    }
  }, f.body))))));
}

/* ------------------------------------------------------------------ */
/* Values                                                              */
/* ------------------------------------------------------------------ */
const VALUES = [{
  icon: "shield-check",
  title: "Act with Integrity",
  body: "Trust guides everything we do. From how we design to how we decide, every action reflects our belief that technology should serve with honesty, empathy, and respect."
}, {
  icon: "crown",
  title: "Empower the Many",
  body: "We build for access, not advantage. Our goal is to make intelligent tools that open doors, helping people move, grow, and thrive in a fairer digital world."
}];
function Values() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "clamp(48px,8vw,96px) clamp(20px,5vw,48px)",
      background: "var(--surface-card)",
      borderTop: "1px solid var(--border-subtle)",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1120,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: "clamp(2rem,4vw,2.75rem)",
      fontWeight: 600,
      letterSpacing: "-0.025em",
      maxWidth: 620
    }
  }, "Our values and culture"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 16,
      fontSize: 17,
      color: "var(--text-secondary)",
      maxWidth: 620,
      lineHeight: 1.6
    }
  }, "The way we build defines who we are. Transparent, ethical, and built around people. We believe progress means nothing if it leaves the people behind."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-up-right",
      size: 18
    })
  }, "Join Us")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))",
      gap: 20,
      marginTop: 40
    }
  }, VALUES.map(v => /*#__PURE__*/React.createElement("div", {
    key: v.title,
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: "var(--radius-xl)",
      minHeight: 260,
      padding: 32,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      border: "1px solid var(--glass-border)",
      background: "var(--mesh-cool)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mal-grain",
    style: {
      position: "absolute",
      inset: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      zIndex: 2,
      width: 48,
      height: 48,
      borderRadius: "var(--radius-md)",
      background: "var(--glass-fill)",
      border: "1px solid var(--glass-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "auto"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: v.icon,
    size: 24
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      position: "relative",
      zIndex: 2,
      fontSize: 22,
      fontWeight: 600,
      marginTop: 20
    }
  }, v.title), /*#__PURE__*/React.createElement("p", {
    style: {
      position: "relative",
      zIndex: 2,
      marginTop: 8,
      color: "var(--ink-700)",
      fontSize: 15,
      lineHeight: 1.55,
      maxWidth: 420
    }
  }, v.body))))));
}

/* ------------------------------------------------------------------ */
/* Contact + Footer                                                    */
/* ------------------------------------------------------------------ */
function Contact() {
  return /*#__PURE__*/React.createElement("section", {
    id: "contact",
    style: {
      padding: "clamp(48px,8vw,96px) clamp(20px,5vw,48px)",
      maxWidth: 1120,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))",
      gap: 40,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: "clamp(1.75rem,3.5vw,2.5rem)",
      fontWeight: 600,
      letterSpacing: "-0.025em"
    }
  }, "Get in touch"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      fontSize: 16,
      color: "var(--text-secondary)",
      lineHeight: 1.9
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: "var(--text-primary)"
    }
  }, "Mal HQ"), /*#__PURE__*/React.createElement("div", null, "21st floor, Sky Tower"), /*#__PURE__*/React.createElement("div", null, "Al Reem Island"), /*#__PURE__*/React.createElement("div", null, "Abu Dhabi, UAE"), /*#__PURE__*/React.createElement("a", {
    href: "mailto:contact@mal.ai",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 16
  }), "contact@mal.ai"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 260,
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
      border: "1px solid var(--border-subtle)",
      background: "var(--neutral-100)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 40,
    color: "var(--ink-900)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      bottom: 12,
      left: 12,
      fontSize: 12,
      color: "var(--text-muted)",
      background: "var(--surface-card)",
      padding: "4px 10px",
      borderRadius: "var(--radius-pill)",
      border: "1px solid var(--border-subtle)"
    }
  }, "Al Reem Island \xB7 Abu Dhabi"))));
}
function Footer() {
  const cols = [["Website", ["Terms", "Privacy"]], ["SME", ["Terms", "Privacy"]], ["App", ["Terms", "Privacy"]], ["Social", ["Facebook", "Instagram", "TikTok"]]];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      padding: "48px clamp(20px,5vw,48px)",
      background: "var(--ink-900)",
      color: "var(--neutral-0)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1120,
      margin: "0 auto",
      display: "flex",
      flexWrap: "wrap",
      gap: 40,
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: "-0.04em"
    }
  }, "Mal"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 10,
      fontSize: 13,
      color: "rgba(255,255,255,0.5)",
      maxWidth: 240
    }
  }, "Copyright \xA9 2025. All rights reserved. Mal is a technology company and not a bank.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 48,
      flexWrap: "wrap"
    }
  }, cols.map(([h, items]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("div", {
    className: "overline",
    style: {
      color: "rgba(255,255,255,0.5)"
    }
  }, h), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginTop: 12
    }
  }, items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it,
    href: "#",
    style: {
      fontSize: 14,
      color: "rgba(255,255,255,0.85)"
    }
  }, it))))))));
}

/* ------------------------------------------------------------------ */
function Landing() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-page)",
      minHeight: "100vh"
    }
  }, /*#__PURE__*/React.createElement(Nav, null), /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(Features, null), /*#__PURE__*/React.createElement(Values, null), /*#__PURE__*/React.createElement(Contact, null), /*#__PURE__*/React.createElement(Footer, null));
}
window.Landing = Landing;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Landing.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AccountCard = __ds_scope.AccountCard;

__ds_ns.ChatBubble = __ds_scope.ChatBubble;

__ds_ns.TransactionRow = __ds_scope.TransactionRow;

__ds_ns.GradientMesh = __ds_scope.GradientMesh;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

})();
