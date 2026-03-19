# AttachOs SDK — Motor Principal

Motor principal del AttachOs CEU v1. Se encarga del despacho de eventos GA4, Facebook y ecommerce con normalización de datos, hasheo SHA-256, deduplicación e integración con el dataLayer para Google Tag Manager.

---

## ¿Qué es esto?

`attach-utils.js` es el motor universal del ecosistema AttachOs. Se carga **una sola vez** en GTM en todas las páginas y el navegador lo guarda en caché por meses, haciendo que tu infraestructura de tracking sea rápida y liviana.

Incluye:
- **Eventos GA4** — estándar y ecommerce
- **Eventos Facebook/Meta** — con formato PascalCase automático
- **Normalización de datos** — elimina acentos, convierte a snake_case, limpia ruido
- **Hasheo SHA-256** — hashea automáticamente campos sensibles como `email`, `phone`, `telefono`
- **Detección de valores ya hasheados** — si un campo ya contiene un SHA-256 válido, no lo vuelve a hashear
- **Deduplicación** — ignora eventos duplicados disparados dentro de una ventana de 2 segundos
- **Protección de tamaño de payload** — aborta eventos que superen los 50,000 bytes

---

## ¿Cómo funciona?

Este repositorio es **independiente** de los orquestadores de cada proyecto (ZIPs de eventos CEU). Esta arquitectura separada significa:

1. El navegador descarga este motor **una sola vez** y lo guarda en caché por meses.
2. Cuando agregas o editas eventos en tus proyectos, los usuarios solo descargan un micro-archivo orquestador — no el motor completo.

---

## Uso via CDN (jsDelivr)

Carga este archivo en GTM como una etiqueta de **HTML Personalizado** en All Pages:

```html
<script src="https://cdn.jsdelivr.net/gh/hmalasquez08/attachos-sdk@v1.0.1/attach-utils.min.js"></script>
```

Versión legible (sin minificar):
```html
<script src="https://cdn.jsdelivr.net/gh/hmalasquez08/attachos-sdk@v1.0.1/attach-utils.js"></script>
```

---

## Modo Debug

El modo debug se activa desde el **Custom Template de GTM** marcando la casilla *"Habilitar modo Debug"*. Esto escribe `window.__attachDebug = true` antes de cargar el script, activando los logs en consola.

También puedes activarlo manualmente desde la consola del navegador:

```js
window.__attachDebug = true;
```

---

## Referencia de API

Una vez cargado, el SDK está disponible globalmente como `window.attach`.

### `attach.ga4Event(name, payload)`
Envía un evento GA4 personalizado al dataLayer.

```js
attach.ga4Event('clic_boton', {
  texto_boton: 'Comprar ahora',
  seccion: 'Hero'
});
```

### `attach.ga4Ecommerce(name, payload)`
Envía un evento de ecommerce GA4 al dataLayer.

```js
attach.ga4Ecommerce('purchase', {
  transaction_id: '12345',
  value: 99.90,
  currency: 'USD',
  items: [{ item_id: 'SKU-01', item_name: 'Producto A', price: 99.90 }]
});
```

### `attach.fbEcommerce(name, payload)`
Envía un evento Facebook/Meta al dataLayer con formato PascalCase automático.

```js
attach.fbEcommerce('Purchase', {
  value: 99.90,
  currency: 'USD',
  content_ids: ['SKU-01']
});
```

---

## Manejo de datos sensibles

Los campos llamados `email`, `phone`, `telefono`, `celular`, `mobile` o `tel` son **hasheados automáticamente con SHA-256** antes de enviarse al dataLayer. No requiere ninguna configuración adicional.

Si el valor ya viene hasheado (cadena hexadecimal de 64 caracteres), el motor lo detecta y **no lo vuelve a hashear**.

---

## Versiones

| Versión | Notas |
|---------|-------|
| v1.0.1  | Release inicial |

---

## Licencia

MIT © AttachOs
