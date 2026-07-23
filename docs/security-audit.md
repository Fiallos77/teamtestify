# 🚨 VULNERABILIDAD DETECTADA [NIVEL: ALTO]
- **Ubicación:** `convex/spaces.ts:168-173` (`getLogoUrl`)
- **Explotación:** Query pública sin ningún check de autenticación ni de pertenencia a organización. Los IDs de `_storage` en Convex viajan en texto plano dentro de cualquier URL de archivo ya servida por la app (video, foto de autor, logo) — no son secretos, son visibles en el HTML/network tab. Cualquier persona (autenticada o no) puede tomar un `storageId` observado en cualquier parte de la app (propio o ajeno) y pasarlo a esta query para obtener una URL servible de **cualquier archivo del deployment**, sin verificar que pertenezca al espacio/organización del llamante. Es el mismo patrón que ya fue corregido en `testimonials.ts::getVideoUrl` (`requireTestimonialInOrg`), pero se omitió aquí.
- **Código Vulnerable Actual:**
```typescript
export const getLogoUrl = query({
  args: { logoStorageId: v.id("_storage") },
  handler: async (ctx, { logoStorageId }) => {
    return await ctx.storage.getUrl(logoStorageId);
  },
});
```

### 🔒 Solución de Parche de Seguridad
```typescript
// Requiere sesión válida como mínimo — cierra el acceso anónimo total.
// Nota arquitectónica: durante la creación de un espacio nuevo el logo se
// sube ANTES de que exista spaceId, así que no se puede exigir
// requireSpaceInOrg aquí sin rediseñar el flujo de upload (ej. registrar
// ownership del storageId en el momento de generateLogoUploadUrl). Este
// parche cierra el vector de acceso anónimo/cross-org más grave; el
// aislamiento por espacio queda como seguimiento recomendado.
export const getLogoUrl = query({
  args: { logoStorageId: v.id("_storage") },
  handler: async (ctx, { logoStorageId }) => {
    await requireOrgContext(ctx); // antes: sin auth alguna
    return await ctx.storage.getUrl(logoStorageId);
  },
});
```

---

# 🚨 VULNERABILIDAD DETECTADA [NIVEL: MEDIO-ALTO]
- **Ubicación:** `convex/public.ts` — `submitTextTestimonial` (línea 94) y `submitVideoTestimonial` (línea 129)
- **Explotación:** El rate limiter (`uploadUrlPerVisitor`/`uploadUrlPerSpace`) solo protege `generateUploadUrl`. Las mutations que realmente **crean** el testimonio no tienen límite alguno:
  - `submitTextTestimonial`: sin límite — un bot puede inundar el Inbox de cualquier espacio público (el `spaceId` está expuesto en la página pública `/r/[slug]`, que el negocio comparte intencionalmente) con miles de testimonios "pending" en loop.
  - `submitVideoTestimonial`: el límite de subida (5/hora por visitante) solo restringe cuántas veces se genera una URL de subida — no impide reusar el **mismo** `storageId` ya subido en llamadas repetidas a `submitVideoTestimonial`, generando testimonios ilimitados sin volver a tocar el límite.
  - Esto no solo es spam: cada testimonio nuevo agranda el conjunto que escanean `getOrgStats`/`getSpaceStats`/`listBySpace` (ver auditoría previa), convirtiendo el spam en un vector de amplificación de costo/latencia.
- **Código Vulnerable Actual:**
```typescript
export const submitTextTestimonial = mutation({
  args: { ...submitterFields, textContent: v.string() },
  handler: async (ctx, args) => {
    if (args.website) throw new Error("Submission rejected");
    const space = await loadActiveSpace(ctx, args.spaceId);
    // ... sin rateLimiter.limit(...) en ningún punto
    const testimonialId = await ctx.db.insert("testimonials", { ... });
```

### 🔒 Solución de Parche de Seguridad
```typescript
// Reutiliza el mismo componente de rate limiting ya declarado arriba en
// este archivo, añadiendo un bucket por-visitante para la creación en sí
// (no solo para la URL de subida de video).
const rateLimiter = new RateLimiter(components.rateLimiter, {
  uploadUrlPerVisitor: { kind: "token bucket", rate: VISITOR_UPLOAD_LIMIT_PER_HOUR, period: HOUR },
  uploadUrlPerSpace: { kind: "token bucket", rate: SPACE_UPLOAD_LIMIT_PER_DAY, period: DAY },
  testimonialSubmitPerVisitor: { kind: "token bucket", rate: 5, period: HOUR },
});

export const submitTextTestimonial = mutation({
  args: { ...submitterFields, textContent: v.string(), visitorId: v.string() },
  handler: async (ctx, args) => {
    if (args.website) throw new Error("Submission rejected");
    const space = await loadActiveSpace(ctx, args.spaceId);
    if (!space.formConfig.allowText) throw new Error("Text testimonials are not enabled for this space");
    await rateLimiter.limit(ctx, "testimonialSubmitPerVisitor", { key: args.visitorId, throws: true });
    // ... insert sin cambios
  },
});
// Mismo rateLimiter.limit(...) al inicio de submitVideoTestimonial —
// así el storageId reusado también queda acotado a 5 inserts/hora.
```

---

# 🚨 VULNERABILIDAD DETECTADA [NIVEL: MEDIO]
- **Ubicación:** `convex/stripe.ts:26-60` (`createCheckoutSession`, `createPortalSession`) — parámetro `returnUrl`
- **Explotación:** `returnUrl` es una `v.string()` sin ninguna validación de origen y se usa directamente como `success_url`/`cancel_url`/`return_url` de Stripe. Stripe no restringe el dominio de estos parámetros — redirige al navegador a lo que se le indique tras un checkout/portal legítimo. Un caller que invoque la action con `returnUrl: "https://sitio-malicioso.com"` provoca que, tras un pago real, el usuario sea redirigido a un dominio de phishing (open redirect encadenado a una acción de confianza — Stripe).
- **Código Vulnerable Actual:**
```typescript
export const createCheckoutSession = action({
  args: { interval: v.union(...), returnUrl: v.string() },
  handler: async (ctx, { interval, returnUrl }) => {
    // ... sin validar returnUrl
    success_url: `${returnUrl}?checkout=success`,
    cancel_url: `${returnUrl}?checkout=cancel`,
```

### 🔒 Solución de Parche de Seguridad
```typescript
const ALLOWED_RETURN_ORIGIN = requiredEnv("APP_URL"); // mismo origin canónico ya usado en ai.ts

function assertSameOrigin(returnUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(returnUrl);
  } catch {
    throw new Error("Invalid return URL");
  }
  if (parsed.origin !== new URL(ALLOWED_RETURN_ORIGIN).origin) {
    throw new Error("returnUrl must match the app's own origin");
  }
}

// Al inicio de ambos handlers, antes de llamar a Stripe:
assertSameOrigin(returnUrl);
```

---

# 🚨 VULNERABILIDAD DETECTADA [NIVEL: BAJO / INFORMATIVO]
- **Ubicación:** `convex/lib/imageToken.ts` (`RenderContext` / `signRenderContext` / `verifyRenderToken`)
- **Explotación:** El token HMAC que autoriza el render de la imagen social no incluye timestamp de emisión ni expiración. Es válido indefinidamente mientras `IMAGE_RENDER_SECRET` no rote. Si el token se filtra (logs, historial de red, un tercero con acceso al DOM en el momento de la generación), puede reproducirse para re-renderizar esa imagen (con su `watermark`/`primaryColor`/foto originales) en cualquier momento futuro. Impacto limitado — no expone datos privados nuevos, solo permite reconstruir un asset ya generado — pero es una desviación de buena práctica en tokens firmados de un solo uso.

### 🔒 Solución de Parche de Seguridad
```typescript
export interface RenderContext {
  testimonialId: string;
  watermark: boolean;
  primaryColor: string;
  content: RenderContent;
  exp: number; // epoch ms — añadido
}

export async function signRenderContext(ctx: Omit<RenderContext, "exp">): Promise<string> {
  const withExpiry: RenderContext = { ...ctx, exp: Date.now() + 5 * 60 * 1000 }; // 5 min
  const payload = toB64Url(enc.encode(JSON.stringify(withExpiry)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(payload));
  return `${payload}.${toB64Url(new Uint8Array(sig))}`;
}

export async function verifyRenderToken(token: string): Promise<RenderContext | null> {
  // ... verificación HMAC sin cambios ...
  const ctx = JSON.parse(new TextDecoder().decode(fromB64Url(payload))) as RenderContext;
  if (Date.now() > ctx.exp) return null; // rechaza tokens vencidos
  return ctx;
}
```

---

## ✅ Controles verificados como correctos (sin hallazgo)
- **Aislamiento multi-tenant:** `convex/lib/authz.ts` y su uso consistente (`requireOrgContext`/`requireSpaceInOrg`/`requireTestimonialInOrg`/`requireWidgetInOrg`) en `testimonials.ts`, `widgets.ts`, `spaces.ts` (salvo `getLogoUrl`), `entitlements.ts`.
- **IDOR previamente reportado y confirmado corregido:** `testimonials.ts::getVideoUrl` ya exige `requireTestimonialInOrg`.
- **Billing:** `organizationId` en Stripe checkout se deriva server-side de `requireOwnerContext` (nunca del cliente) — sin escalación de privilegios de facturación.
- **Webhook de Stripe:** verificación de firma HMAC correcta (`constructEventAsync` + secret), rechaza payloads no firmados/alterados, idempotente por `eventId`.
- **Secretos:** `STRIPE_SECRET_KEY`, `IMAGE_RENDER_SECRET`, `RESEND_API_KEY`, etc. confinados a `convex/*.ts` server-side; cero uso en componentes cliente; `.env*` en `.gitignore`. Ninguna variable `NEXT_PUBLIC_*` expone algo sensible (solo URLs de deployment).
- **XSS:** cero uso de `dangerouslySetInnerHTML` en todo `src/`.
- **postMessage cross-origin:** `public/embed.js` valida `event.origin === origin` antes de procesar el mensaje de resize — vector previamente señalado como abierto, hoy corregido.
- **SSRF:** `route.ts` de generación de imagen social valida el host de la foto de fondo vía `isAllowedPhotoHost` antes de hacer fetch.
- **Protección de rutas:** `src/proxy.ts` (middleware) redirige a `/sign-in` sin cookie de sesión en toda ruta no pública; `DashboardLayout` repite el check server-side (`isAuthenticated()`), y cada función Convex vuelve a validar identidad independientemente — defensa en profundidad real, no solo perimetral.
