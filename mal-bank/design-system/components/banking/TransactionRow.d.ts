import * as React from "react";

export interface TransactionRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Leading glyph (usually an <Icon/>). */
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Formatted amount string, e.g. "42.00". */
  amount: string;
  currency?: string;
  /** out (debit, ink) | in (credit, green +). */
  direction?: "out" | "in";
  /** Optional trailing <Badge/>. */
  badge?: React.ReactNode;
}

/** A single ledger line: icon tile, merchant, meta, signed amount. */
export function TransactionRow(props: TransactionRowProps): JSX.Element;
