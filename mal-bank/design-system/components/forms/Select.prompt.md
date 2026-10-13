**Select** — native select styled to match Mal's fields, with a chevron and focus ring.

```jsx
<Select label="Currency" options={["AED", "USD", "SAR"]} placeholder="Choose…" />
<Select label="Category" options={[{value:"travel",label:"Travel"}]} />
```

Props: `label`, `hint`, `error`, `options` (strings or {value,label}), `placeholder`, `size`.
