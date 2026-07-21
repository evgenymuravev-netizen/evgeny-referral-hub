import * as React from "react";

export type IconName =
  | "arrow-right" | "arrow-up-right" | "chevron-right" | "chevron-down"
  | "plus" | "check" | "x" | "search" | "sparkles" | "credit-card"
  | "shield-check" | "crown" | "message" | "map-pin" | "wallet"
  | "trending-up" | "arrow-down-left" | "arrow-up-right-tx" | "bell"
  | "settings" | "home" | "user" | "send" | "eye" | "eye-off"
  | "info" | "alert-triangle";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon name from the curated Mal set. */
  name: IconName;
  /** Pixel size (width & height). Default 20. */
  size?: number;
  /** Stroke width. Default 1.6 (thin-line brand look). */
  strokeWidth?: number;
  /** Stroke color. Default currentColor. */
  color?: string;
}

/**
 * Thin-line icon in Mal's iconography (Lucide-style, 1.6px rounded stroke).
 */
export function Icon(props: IconProps): JSX.Element;

export const iconNames: IconName[];
