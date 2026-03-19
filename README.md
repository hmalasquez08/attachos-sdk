# AttachOs SDK — Core Engine

Core engine for AttachOs CEU v1. Handles GA4, Facebook, and ecommerce event dispatching with data normalization, SHA-256 hashing, deduplication, and dataLayer integration for Google Tag Manager.

---

## What is this?

`attach-utils.js` is the universal motor of the AttachOs ecosystem. It is loaded **once** in GTM across all pages and cached by the browser for months, making your tracking infrastructure fast and lightweight.

It powers:
- **GA4 events** — standard and ecommerce
- **Facebook/Meta events** — with automatic PascalCase formatting
- **Data normalization** — removes accents, enforces snake_case, trims noise
- **SHA-256 hashing** — auto-hashes sensitive fields like `email`, `phone`, `telefono`
- **Deduplication** — ignores duplicate events fired within a 2-second window
- **Payload size protection** — aborts events exceeding 50,000 bytes

---

## How it works

This repository is **separate** from your project orchestrators (CEU event ZIPs). The split architecture means:

1. The browser downloads this engine **once** and caches it for months.
2. When you update events in your projects, users only download a small orchestrator file — not the entire engine again.

---

## CDN Usage (jsDelivr)

Load this file in GTM as a **Custom HTML tag** on All Pages:

```html
<script src="https://cdn.jsdelivr.net/gh/hmalasquez08/attachos-sdk@v1.0.0/attach-utils.js"></script>
```

To always use the latest patch of v1:
```html
<script src="https://cdn.jsdelivr.net/gh/hmalasquez08/attachos-sdk@v1/attach-utils.js"></script>
```

---

## API Reference

Once loaded, the SDK is available globally as `window.attach`.

### `attach.ga4Event(name, payload)`
Pushes a GA4 custom event to the dataLayer.

```js
attach.ga4Event('button_click', {
  button_text: 'Buy Now',
  section: 'Hero'
});
```

### `attach.ga4Ecommerce(name, payload)`
Pushes a GA4 ecommerce event to the dataLayer.

```js
attach.ga4Ecommerce('purchase', {
  transaction_id: '12345',
  value: 99.90,
  currency: 'USD',
  items: [{ item_id: 'SKU-01', item_name: 'Product A', price: 99.90 }]
});
```

### `attach.fbEcommerce(name, payload)`
Pushes a Facebook/Meta event to the dataLayer with PascalCase formatting.

```js
attach.fbEcommerce('Purchase', {
  value: 99.90,
  currency: 'USD',
  content_ids: ['SKU-01']
});
```

---

## Sensitive Data Handling

Fields named `email`, `phone`, `telefono`, `celular`, `mobile`, or `tel` are **automatically SHA-256 hashed** before being pushed to the dataLayer. No configuration needed.

---

## Versioning

| Version | Notes |
|---------|-------|
| v1.0.0  | Initial release |

---

## License

MIT © AttachOs
