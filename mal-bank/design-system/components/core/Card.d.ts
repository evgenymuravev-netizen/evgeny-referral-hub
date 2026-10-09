import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** default (hairline+soft shadow) | elevated | outline | mesh (iridescent fill). */
  variant?: "default" | "elevated" | "outline" | "mesh";
  padding?: "none" | "sm" | "md" | "lg";
  /** Lift on hover. */
  interactive?: boolean;
  children?: React.ReactNode;
}

/**
 * Surface container — soft 20px radius, hairline border, light diffuse shadow.
 *
 * @startingPoint section="Core" subtitle="Surface card — default / elevated / mesh" viewport="700x260"
 */
export function Card(props: CardProps): JSX.Element;
