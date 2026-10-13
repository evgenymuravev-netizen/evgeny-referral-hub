import * as React from "react";

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Square checkbox, ink fill when checked, with optional label. */
export function Checkbox(props: CheckboxProps): JSX.Element;
