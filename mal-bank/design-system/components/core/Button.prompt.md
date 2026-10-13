**Button** — Mal's primary pill-shaped action. Ink fill for the main CTA; hairline secondary and transparent ghost for lower emphasis; iris-blue accent when a splash of brand color is wanted.

```jsx
<Button variant="primary" iconRight={<Icon name="arrow-right" size={18} />}>Join Waitlist</Button>
<Button variant="secondary">Learn more</Button>
<Button variant="ghost" size="sm">Cancel</Button>
```

Variants: `primary` | `secondary` | `ghost` | `accent`. Sizes: `sm` (36) | `md` (44) | `lg` (54). Props: `iconLeft`, `iconRight`, `fullWidth`, `disabled`. Always pill radius; presses gently scale to 0.97.
