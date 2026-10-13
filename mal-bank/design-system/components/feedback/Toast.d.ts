import * as React from "react";

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  title?: React.ReactNode;
  message?: React.ReactNode;
  icon?: React.ReactNode;
  onClose?: () => void;
}

/** Transient notification card with a tone accent bar. Position it yourself. */
export function Toast(props: ToastProps): JSX.Element;
