**AccountCard** — balance / payment-card surface on Mal's signature iridescent mesh. The hero element of the app home.

```jsx
<AccountCard label="Available balance" currency="AED" amount="12,480.50" cardLast4="4417" />
<AccountCard variant="ink" amount="3,200.00" hidden />
```

Variants: `mesh` (iridescent, default) | `ink` | `light`. Props: `label`, `amount` (pre-formatted string), `currency`, `cardLast4`, `cardName`, `hidden` (masks amount), `footer`. Amounts use tabular numerals.
