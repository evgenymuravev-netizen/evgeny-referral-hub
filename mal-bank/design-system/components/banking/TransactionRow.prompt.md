**TransactionRow** — one ledger line: icon tile, merchant + meta, signed amount. Debits show ink "−"; credits show green "+".

```jsx
<TransactionRow icon={<Icon name="credit-card" />} title="Careem" subtitle="Transport · Today"
  amount="42.00" direction="out" badge={<Badge tone="iris" size="sm">Halal</Badge>} />
<TransactionRow icon={<Icon name="arrow-down-left" />} title="Salary" subtitle="ADCB · 1 Jul"
  amount="12,000.00" direction="in" />
```

Props: `icon`, `title`, `subtitle`, `amount` (formatted string), `currency`, `direction` (out/in), `badge`, `onClick`.
