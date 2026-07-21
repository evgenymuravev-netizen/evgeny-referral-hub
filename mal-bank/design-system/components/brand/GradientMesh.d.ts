import * as React from "react";

export interface GradientMeshProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Mesh palette. Default "hero". */
  variant?: "hero" | "cool" | "warm" | "veil";
  /** Soft film-grain overlay. Default true. */
  grain?: boolean;
  /** Corner radius (any CSS value). Default var(--radius-xl). */
  radius?: string;
  children?: React.ReactNode;
}

/**
 * Mal's signature iridescent pastel gradient mesh (CSS recreation).
 *
 * @dsCard group="Brand"
 * @startingPoint section="Brand" subtitle="Signature iridescent mesh panel" viewport="700x360"
 */
export function GradientMesh(props: GradientMeshProps): JSX.Element;
