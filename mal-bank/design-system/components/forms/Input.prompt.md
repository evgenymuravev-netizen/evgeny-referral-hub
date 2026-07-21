**Input** — text field with label, optional icons, focus ring, and helper/error text.

```jsx
<Input label="Email" placeholder="you@mal.ai" iconLeft={<Icon name="user" size={18} />} />
<Input label="Amount" error="Insufficient balance" />
```

Props: `label`, `hint`, `error`, `iconLeft`, `iconRight`, `size` (sm/md/lg), plus native input attrs. Focus shows an iris focus ring; `error` turns the border danger.
