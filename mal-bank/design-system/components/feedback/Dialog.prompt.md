**Dialog** — centered modal over a blurred ink scrim. Renders nothing when `open` is false.

```jsx
<Dialog open={open} onClose={() => setOpen(false)}
  title="Confirm transfer" description="Send AED 250 to Layla?"
  footer={<>
    <Button variant="ghost" onClick={close}>Cancel</Button>
    <Button variant="primary" onClick={confirm}>Send</Button>
  </>}>
</Dialog>
```

Props: `open`, `onClose`, `title`, `description`, `footer`, `size` (sm/md/lg). Clicking the scrim calls `onClose`.
