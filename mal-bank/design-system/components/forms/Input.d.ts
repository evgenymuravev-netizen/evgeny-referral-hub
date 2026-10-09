import * as React from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: React.ReactNode;
  /** Helper text below the field. */
  hint?: React.ReactNode;
  /** Error text (turns the field danger + shows message). */
  error?: React.ReactNode;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

/** Text field with label, icons, focus ring, and helper/error states. */
export function Input(props: InputProps): JSX.Element;
