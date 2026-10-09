import * as React from "react";

export interface TooltipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Tooltip text. */
  label: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  /** The trigger element. */
  children: React.ReactNode;
}

/** Ink hover/focus tooltip. Wrap the trigger. */
export function Tooltip(props: TooltipProps): JSX.Element;
