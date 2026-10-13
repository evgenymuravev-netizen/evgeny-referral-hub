import React from "react";

/**
 * ChatBubble — message bubble for Mal's AI assistant ("Conversations that create action").
 */
export function ChatBubble({
  from = "assistant",   // assistant | user
  children,
  actions = null,       // optional action chips/buttons below the text
  timestamp = null,
  className = "",
  style = {},
  ...rest
}) {
  const isUser = from === "user";
  return (
    <div
      className={`mal-chat-bubble ${className}`}
      style={{
        display: "flex", flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: 8, maxWidth: "82%",
        alignSelf: isUser ? "flex-end" : "flex-start",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          padding: "12px 16px",
          borderRadius: isUser ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
          background: isUser ? "var(--ink-900)" : "var(--surface-card)",
          color: isUser ? "var(--neutral-0)" : "var(--text-primary)",
          border: isUser ? "1px solid var(--ink-900)" : "1px solid var(--border-subtle)",
          boxShadow: isUser ? "none" : "var(--shadow-xs)",
          fontFamily: "var(--font-sans)", fontSize: "var(--text-md)", lineHeight: "var(--leading-normal)",
        }}
      >
        {children}
      </div>
      {actions && <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{actions}</div>}
      {timestamp && <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-muted)", padding: "0 4px" }}>{timestamp}</span>}
    </div>
  );
}
