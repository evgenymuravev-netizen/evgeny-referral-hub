import * as React from "react";

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Footer actions (usually Buttons). */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

/** Centered modal over a blurred ink scrim; gentle pop-in. */
export function Dialog(props: DialogProps): JSX.Element | null;
