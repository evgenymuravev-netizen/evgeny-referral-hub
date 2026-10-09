import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style.
   * - primary: ink fill, white text (default CTA)
   * - secondary: white with hairline border
   * - ghost: transparent
   * - accent: iris-blue fill
   */
  variant?: "primary" | "secondary" | "ghost" | "accent";
  /** Control height. Default "md". */
  size?: "sm" | "md" | "lg";
  /** Optional leading node (e.g. <Icon/>). */
  iconLeft?: React.ReactNode;
  /** Optional trailing node. */
  iconRight?: React.ReactNode;
  /** Stretch to container width. */
  fullWidth?: boolean;
  children?: React.ReactNode;
}

/**
 * Mal's pill-shaped action button. Ink-forward, calm press (scale 0.97).
 *
 * @startingPoint section="Core" subtitle="Pill button — primary / secondary / ghost / accent" viewport="700x150"
 */
export function Button(props: ButtonProps): JSX.Element;
