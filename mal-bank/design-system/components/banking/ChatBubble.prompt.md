**ChatBubble** — message bubble for Mal's AI assistant ("Ask. Act. Done."). Assistant is white on the left; user is ink on the right.

```jsx
<ChatBubble from="user">Find me a halal-friendly hotel in Istanbul under AED 600.</ChatBubble>
<ChatBubble from="assistant" timestamp="Just now"
  actions={<Button size="sm" variant="secondary">Book now</Button>}>
  I found 3 options. The top pick is 540/night, fully refundable.
</ChatBubble>
```

Props: `from` (assistant/user), `actions` (chips/buttons under the bubble), `timestamp`.
