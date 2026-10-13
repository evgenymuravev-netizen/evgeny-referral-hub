import * as React from "react";

export interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** assistant (white, left) | user (ink, right). */
  from?: "assistant" | "user";
  /** Optional action chips/buttons rendered under the bubble. */
  actions?: React.ReactNode;
  timestamp?: React.ReactNode;
  children?: React.ReactNode;
}

/** Message bubble for Mal's AI assistant. Asymmetric tail; ink for the user. */
export function ChatBubble(props: ChatBubbleProps): JSX.Element;
