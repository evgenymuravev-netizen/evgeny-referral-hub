import * as React from "react";

export interface AccountCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  /** Formatted amount string, e.g. "12,480.50". */
  amount?: string;
  currency?: string;
  cardName?: string;
  cardLast4?: string;
  /** mesh (iridescent) | ink (near-black) | light (white). */
  variant?: "mesh" | "ink" | "light";
  /** Mask the amount. */
  hidden?: boolean;
  footer?: React.ReactNode;
}

/**
 * Balance / payment-card surface on Mal's signature mesh.
 *
 * @dsCard group="Banking"
 * @startingPoint section="Banking" subtitle="Balance card on the signature mesh" viewport="420x220"
 */
export function AccountCard(props: AccountCardProps): JSX.Element;
