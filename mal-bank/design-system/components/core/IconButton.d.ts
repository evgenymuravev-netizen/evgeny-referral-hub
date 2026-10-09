import * as React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "rounded";
  /** Required for accessibility. */
  "aria-label": string;
  /** An <Icon/> element. */
  children: React.ReactNode;
}

/** Icon-only action button. Circle by default, matching the app's toolbar affordances. */
export function IconButton(props: IconButtonProps): JSX.Element;
