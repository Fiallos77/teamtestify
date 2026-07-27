# 🔒 REPORTE DE AUDITORÍA TEAMTESTIFY

Generado por la skill `teamtestify-production-auditor` (segunda ejecución). Investigación únicamente, verificado contra el código real — no asumido a partir del inventario.

**Estado General:** 🟡 APTO CON RESERVAS

## 🚨 Hallazgos Críticos (deben corregirse antes del despliegue)

**Ninguno.** Se escanearon las 21 mutations exportadas en `convex/*.ts`, las queries públicas (`convex/public.ts`, `convex/embedPublic.ts`), el webhook de Stripe, el almacenamiento de tokens en frontend y el embed público. No se encontró autorización faltante, exposición de datos sensibles, firma de webhook ausente, tokens en `localStorage`, ni `dangerouslySetInnerHTML`.

## ⚠️ Advertencias (mejoras recomendadas)

- **[ADVERTENCIA]** `convex/stripe.ts:64` (`createCheckoutSession`) — no se pasa `idempotencyKey` a `stripe.checkout.sessions.create()`. **Impacto en producción:** riesgo bajo — un reintento de red o doble clic no duplica el cargo real porque el usuario debe completar el checkout de Stripe por separado en cada intento, y el webhook ya es idempotente por `eventId`. El impacto real es solo la posible creación de Sesiones de Checkout huérfanas en el dashboard de Stripe (ruido operativo), no cargos duplicados.

- **[ADVERTENCIA]** `next.config.ts` — no define `poweredByHeader: false`; tampoco hay headers de seguridad globales (`X-Frame-Options`, `Strict-Transport-Security`) fuera del `Content-Security-Policy: frame-ancestors *` que ya existe, y que solo aplica a `/embed/:path*`. **Impacto en producción:** el header `X-Powered-By: Next.js` revela la tecnología del stack a cualquier scanner automatizado (reconocimiento pasivo, no explotación directa). La ausencia de `X-Frame-Options`/HSTS fuera de `/embed/*` deja el resto del sitio (dashboard, login) sin esa capa adicional de defensa contra clickjacking/downgrade a HTTP, aunque el resto de la app no está pensada para ser embebida en iframes de terceros de todos modos.

- **[ADVERTENCIA — operacional, no es un defecto de código]** La variable de entorno de Convex `SITE_URL` en el deployment actual (`dev:polite-weasel-867`) apunta a `http://localhost:3000`. El código la lee correctamente vía `process.env.SITE_URL` (no está hardcodeada). **Impacto en producción:** si esta variable no se actualiza en el deployment de producción de Convex antes del lanzamiento, los correos de reseteo de contraseña y los flujos de callback de Better-Auth construirán URLs apuntando a `localhost`, rompiendo esos flujos para usuarios reales.

- **[ADVERTENCIA — reportado en auditoría previa de esta sesión, aún sin corregir]** `src/proxy.ts` — las rutas `/privacy-policy` y `/terms-of-service` no están en `PUBLIC_ROUTE_PATTERNS`. **Impacto en producción:** un visitante anónimo (no logueado) que haga clic en el enlace "Privacy Policy"/"Terms of Service" desde `/sign-up` o desde el formulario público `/r/[slug]` es redirigido a `/sign-in` en vez de ver el documento legal — rompe el único acceso público a esas páginas, que por su naturaleza (cumplimiento legal) deberían ser accesibles sin sesión.

## ✅ Verificaciones Exitosas

- **Autorización en mutaciones (BOLA/BFLA):** las 21 mutations en `convex/*.ts` fueron revisadas. Todas las que operan sobre `organizations`, `spaces`, `testimonials` y `widgets` pasan por `convex/lib/authz.ts` (`requireOrgContext`/`requireSpaceInOrg`/`requireTestimonialInOrg`/`requireWidgetInOrg`), que valida identidad **y** que el recurso por ID pertenece a la organización activa del caller — no solo que haya sesión. `organizations.setActive` verifica membership explícita antes de permitir cambiar de organización activa. Las mutations de `convex/public.ts` (formulario público de testimonios) son intencionalmente anónimas, protegidas por validación de espacio activo + rate limiting por visitante/espacio en su lugar.

- **Exposición de datos en queries públicas:** `convex/public.ts:getSpaceBySlug` devuelve solo `_id, name, formConfig, branding, logoUrl, maxVideoSeconds`. `convex/lib/widgetPayload.ts:toPayloadTestimonial` (usada por ambas queries de `convex/embedPublic.ts`) excluye deliberadamente `authorEmail` del payload público, aunque el campo sí existe en el documento interno de `testimonials`.

- **Webhook de Stripe — firma:** `convex/stripeWebhook.ts` verifica la firma con `stripe.webhooks.constructEventAsync(...)` contra `process.env.STRIPE_WEBHOOK_SECRET` antes de procesar cualquier evento; responde 400 si la firma no valida.

- **Webhook de Stripe — idempotencia (a nivel de recepción):** `convex/subscriptions.ts:processStripeWebhookEvent` registra cada `eventId` procesado (`recordEventOnce`, índice único `by_event_id`) — reintentos/duplicados de entrega de Stripe no se re-procesan.

- **Almacenamiento de tokens (frontend):** cero uso de `localStorage`/`sessionStorage` para sesión/tokens en todo `src/`. El único uso de `localStorage` en el código auditado (`src/lib/visitor-id.ts`) es un ID anónimo de visitante para rate-limiting del formulario público — no un token de autenticación.

- **XSS en embed:** cero uso de `dangerouslySetInnerHTML` en `src/app/(embed)/`, `src/components/embed/` ni en el resto de `src/`. El `widgetId` se valida server-side antes de renderizar: `embedPublic.getWidgetPayload`/`getWidgetMeta` resuelven el documento por ID y verifican `widget.isPublished`; un widget de otro espacio no puede filtrarse por esta vía.

- **Corrección de premisa del inventario:** el inventario de la skill afirma que no existe middleware. Es correcto que no existe un archivo llamado `middleware.ts`, pero **sí existe `src/proxy.ts`**, que es la convención renombrada de Next.js 16 para el mismo mecanismo (confirmado en `AGENTS.md`). Sí protege rutas a nivel de red: redirige (307) a `/sign-in` cualquier ruta fuera de `PUBLIC_ROUTE_PATTERNS` sin cookie de sesión — con la excepción de `/privacy-policy`/`/terms-of-service` señalada arriba.

## 📌 Recomendación Final

Ninguna de las 4 advertencias bloquea el despliegue. Prioridad de atención antes del lanzamiento: (1) corregir el acceso público a `/privacy-policy` y `/terms-of-service` en `src/proxy.ts` — es el único ítem con impacto funcional inmediato para usuarios reales; (2) actualizar `SITE_URL` (y demás variables de entorno de Convex) en el deployment de producción antes de anunciar el lanzamiento; (3) headers de seguridad globales e `idempotencyKey` en Stripe son mejoras de defensa en profundidad, no urgentes.
