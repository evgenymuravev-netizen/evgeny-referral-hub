import * as React from "react";

export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  /** Optional trailing label; wraps control + text in a <label>. */
  label?: React.ReactNode;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** On/off toggle. Ink-filled track when on, calm slide. */
export function Switch(props: SwitchProps): JSX.Element;
