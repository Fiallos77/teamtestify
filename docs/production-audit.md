# 🔒 REPORTE DE AUDITORÍA TEAMTESTIFY (BACKEND + FRONTEND)

Generado por la skill `teamtestify-production-auditor`. Investigación únicamente — verificado contra el código real, no asumido.

**Estado General:** 🟡 APTO CON RESERVAS

Nota metodológica: varias premisas de la skill no coinciden con la arquitectura real de este proyecto (verificado leyendo el código, no asumido). Las corrijo explícitamente abajo en vez de reportar hallazgos falsos basados en esas premisas.

## 🚨 Hallazgos Críticos (deben corregirse antes del despliegue)

**Ninguno.** No encontré ninguna mutación, query pública, webhook o página que exponga datos sensibles, omita autorización, o sea vulnerable a XSS/BOLA en el código auditado (`convex/`, `src/app/`, `src/components/dashboard/`, `src/lib/`).

## ⚠️ Advertencias (mejoras recomendadas)

- **[ADVERTENCIA]** `convex/stripe.ts:64` (`createCheckoutSession`) — `stripe.checkout.sessions.create({...})` no pasa `idempotencyKey`. Riesgo bajo en la práctica (un doble-click no duplica el cargo real, ya que el usuario debe completar el checkout de Stripe por separado cada vez, y el webhook sí es idempotente por `eventId` vía `recordEventOnce` en `convex/subscriptions.ts`), pero es una buena práctica de Stripe recomendada para creación de recursos.
  ```typescript
  const session = await stripe.checkout.sessions.create({
    // ...
  }, { idempotencyKey: `checkout-${organizationId}-${Date.now()}` });
  ```

- **[ADVERTENCIA]** `next.config.ts` — no define `poweredByHeader: false`, así que Next.js sigue enviando el header `X-Powered-By: Next.js` (info-disclosure menor). Tampoco hay headers de seguridad globales (`X-Frame-Options`, `Strict-Transport-Security`, CSP general) — el único CSP configurado es `frame-ancestors *` y solo aplica a `/embed/:path*` (intencional, para permitir el iframe en sitios de clientes).
  ```typescript
  const nextConfig: NextConfig = {
    poweredByHeader: false,
    async headers() {
      return [
        { source: "/embed/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }] },
        { source: "/((?!embed).*)", headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ]},
      ];
    },
  };
  ```

- **[ADVERTENCIA — operacional, no es un bug de código]** El deployment actual (`dev:polite-weasel-867`) tiene la variable de entorno de Convex `SITE_URL` apuntando a `http://localhost:3000`. `convex/auth.ts` la lee correctamente vía `process.env.SITE_URL` (no está hardcodeada en el código fuente), pero **hay que recordar** ejecutar `npx convex env set SITE_URL https://dominio-real.com` en el deployment de producción antes de lanzar — de lo contrario Better-Auth construirá URLs de callback/reset-password apuntando a localhost.

## ✅ Verificaciones Exitosas

- **Autorización en mutaciones (BOLA/BFLA):** Revisé las 20 mutations exportadas en `convex/*.ts`. Todas las que tocan recursos sensibles (`organizations`, `spaces`, `testimonials`, `widgets`) pasan por `convex/lib/authz.ts` (`requireOrgContext`/`requireSpaceInOrg`/`requireTestimonialInOrg`/`requireWidgetInOrg`), que valida `ctx.auth.getUserIdentity()` + pertenencia real del recurso a la organización activa del caller — no solo que el usuario esté logueado, sino que el recurso específico (por ID) le pertenezca. `organizations.setActive` verifica membership explícita antes de permitir el cambio. Las mutations de `convex/public.ts` son intencionalmente anónimas (formulario público de testimonios), protegidas en su lugar por `loadActiveSpace` + rate limiting por visitante/espacio, no por auth de usuario — diseño correcto para su caso de uso.

- **Exposición de datos en queries públicas:** `convex/public.ts:getSpaceBySlug` devuelve solo `_id, name, formConfig, branding, logoUrl, maxVideoSeconds` — sin `email`/`userId`. `convex/lib/widgetPayload.ts:toPayloadTestimonial` (usada por `embedPublic.getWidgetPayload` y `embedPublic.getWidgetMeta`) devuelve explícitamente `authorName/authorTitle/authorCompany/authorPhotoUrl/rating/textContent/videoUrl/submittedAt` — **excluye deliberadamente `authorEmail`**, que sí existe en el documento de `testimonials` pero nunca se envía al embed público.

- **Webhooks de Stripe — firma:** `convex/stripeWebhook.ts:89-95` verifica la firma con `stripe.webhooks.constructEventAsync(payload, signature, webhookSecret, ...)` contra `process.env.STRIPE_WEBHOOK_SECRET` antes de procesar nada; rechaza con 400 si falla.

- **Webhooks de Stripe — idempotencia:** `convex/subscriptions.ts:processStripeWebhookEvent` llama `recordEventOnce(ctx, eventId, eventType)` como primera línea, respaldado por el índice único `by_event_id` en la tabla `stripeWebhookEvents` — reintentos/duplicados de Stripe no se re-procesan.

- **Almacenamiento de tokens (frontend):** Cero uso de `localStorage`/`sessionStorage` para tokens de sesión en todo `src/`. El único uso de `localStorage` en el código auditado es `src/lib/visitor-id.ts` — un ID anónimo de visitante para rate-limiting del formulario público, no un token de autenticación. `src/lib/auth-client.ts` y `convex-client-provider.tsx` delegan el manejo de sesión enteramente a Better-Auth (cookies, manejadas por la librería).

- **Server Actions / CSRF:** Cero archivos con `"use server"` en todo `src/` — el proyecto no usa Server Actions de Next.js en absoluto; toda mutación de datos pasa por el SDK de Convex (WebSocket + token explícito por request, no cookie ambiental), lo cual no es vulnerable al patrón clásico de CSRF que depende de cookies enviadas automáticamente en cross-origin.

- **XSS en embed:** Cero uso de `dangerouslySetInnerHTML` en `src/app/(embed)/`, `src/components/embed/`, ni en ningún otro lugar de `src/`. `widgetId` se valida server-side: `embedPublic.getWidgetPayload`/`getWidgetMeta` hacen `ctx.db.get(widgetId)` y verifican `widget.isPublished` antes de devolver cualquier dato — un widget de otro espacio no puede filtrarse porque el `widgetId` en sí ya resuelve al documento correcto o a `null`.

## 🔧 Correcciones a premisas de la skill (verificado contra el código real)

- **"middleware.ts no existe → CRÍTICO":** Falso. Este proyecto usa **Next.js 16**, cuya convención renombró `middleware.ts` a **`src/proxy.ts`** (documentado explícitamente en `AGENTS.md`: "This is NOT the Next.js you know"). `src/proxy.ts` sí existe y sí protege rutas: define `PUBLIC_ROUTE_PATTERNS` y redirige a `/sign-in` (307) cualquier ruta no listada sin cookie de sesión válida (`getSessionCookie`). Cubierto en detalle en una auditoría de rutas previa de esta misma sesión — con un hallazgo real ahí: `/privacy-policy` y `/terms-of-service` faltan en esa lista y quedan protegidas cuando deberían ser públicas (ya reportado antes, no corregido aún).

- **"Webhook en `src/app/api/stripe-webhook/route.ts` sin `bodyParser: false` → CRÍTICO":** Ese archivo no existe. El webhook de Stripe es una **Convex HTTP Action** (`convex/http.ts` → `/stripe/webhook` → `convex/stripeWebhook.ts`), no una ruta de Next.js. La config `bodyParser` de Next.js (Pages Router, además) no aplica aquí — Convex expone el body crudo vía `await request.text()` sobre la Web Fetch API estándar, que es exactamente lo que la verificación de firma HMAC necesita.

- **"`ctx.auth.getUserId()` → si no existe, CRÍTICO":** Ese método no es parte de la API real de Convex. El patrón correcto y efectivamente usado en todo el proyecto es `ctx.auth.getUserIdentity()`, encapsulado en `convex/lib/authz.ts` (ver arriba).

## 📌 Recomendación Final

**Desplegar**, atendiendo las advertencias antes o justo después del lanzamiento (ninguna bloquea el despliegue): agregar `idempotencyKey` al checkout, configurar headers de seguridad globales, y — el paso operacional más importante — actualizar `SITE_URL` (y el resto de env vars de Convex) en el deployment de producción antes de anunciar el lanzamiento.
