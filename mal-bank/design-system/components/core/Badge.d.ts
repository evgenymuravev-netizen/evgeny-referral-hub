import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "iris" | "success" | "warning" | "danger" | "info";
  variant?: "soft" | "solid" | "outline";
  size?: "sm" | "md";
  /** Leading status dot. */
  dot?: boolean;
  children?: React.ReactNode;
}

/** Small status/label pill with soft tinted fills. */
export function Badge(props: BadgeProps): JSX.Element;
