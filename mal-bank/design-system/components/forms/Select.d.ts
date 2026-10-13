import * as React from "react";

export interface SelectOption { value: string; label: string; }

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** Options as strings or {value,label}. */
  options?: (string | SelectOption)[];
  placeholder?: string;
}

/** Native select styled to match Mal fields, with chevron and focus ring. */
export function Select(props: SelectProps): JSX.Element;
