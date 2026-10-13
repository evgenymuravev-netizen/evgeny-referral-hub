import * as React from "react";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Selected (filled ink) state. */
  selected?: boolean;
  /** Show a remove (×) button. */
  removable?: boolean;
  onRemove?: (e: React.MouseEvent) => void;
  iconLeft?: React.ReactNode;
  children?: React.ReactNode;
}

/** Selectable/removable chip for filters and categories. */
export function Tag(props: TagProps): JSX.Element;
