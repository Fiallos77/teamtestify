# 🗺️ 1. DIAGNÓSTICO DE ARQUITECTURA GENERAL

**Stack:** Next.js 16 (App Router) + Convex (DB reactiva) + Better Auth. 37 archivos de test, 269 tests, cobertura sólida en lógica pura.

**Puntos fuertes verificados:**
- **Cero `any`** en todo el código fuente fuera de tests — tipado estricto real, no aspiracional.
- Capa de autorización (`convex/lib/authz.ts`) 100% basada en lookups indexados O(1), reutilizada consistentemente en cada query/mutation — no hay bypass de tenancy.
- Índices compuestos bien diseñados en el caso general (`by_space_and_status`, `by_org_and_user`, `by_org_and_month`).
- El endpoint HTTP legacy (`/embed/widget`) sí implementa CDN caching correcto (`s-maxage=60, stale-while-revalidate=300`).

**Problema estructural central:** la app tiene **dos caminos de lectura para los mismos datos de testimonials aprobados** (contador de entitlements, stats de dashboard, payload de embed, preview de widget) y **ninguno comparte una fuente de verdad agregada**. Cada uno re-escanea la tabla completa por su cuenta. Esto no es un bug puntual — es un patrón repetido en 5 módulos distintos, lo cual indica que falta una capa de "agregación" entre `testimonials` (fuente cruda) y los consumidores.

---

# 🟥 2. ALERTAS CRÍTICAS (RENDIMIENTO Y REDUNDANCIA)

### 🔴 CRÍTICO — `convex/embedPublic.ts` + `convex/lib/widgetPayload.ts::buildWidgetPayload`
- **Problema:** Es el endpoint de **mayor tráfico de todo el sistema** (se ejecuta en cada carga de cada widget embebido en cada sitio web de cada cliente). A diferencia de la ruta HTTP legacy (que sí cachea en CDN), esta se sirve vía `useQuery` reactivo desde el iframe cliente (`src/app/(embed)/embed/[widgetId]/page.tsx:19`) — **sin caché alguna**. Cada visitante abre un WebSocket que re-ejecuta `.collect()` + `.filter()` + `.sort()` completos cada vez que **cualquier** testimonio del espacio cambia (aprobar uno en el Inbox invalida la suscripción de todos los visitantes de todos los widgets de ese espacio, simultáneamente).
- **Complejidad Algorítmica Actual:** `O(n log n)` por render/re-render, donde `n` = total de testimonios aprobados del espacio (crece sin límite, sin paginación).

### 🔴 CRÍTICO — `convex/entitlements.ts::countApprovedTestimonials`
- **Problema:** Se invoca en **cada aprobación de testimonio** (`testimonials.setStatus` → `assertCanPublish`/`assertCanPublishVideo`) y hace `.collect()` sobre **todo** el historial de testimonios de la organización (índice `by_org`, sin filtrar por status a nivel de índice), filtrando en memoria después. Es la ruta de escritura más frecuente del producto (moderación = el core loop) pagando un full-table-scan en cada click.
- **Complejidad Algorítmica Actual:** `O(n)` por aprobación, `n` = total histórico de testimonios de la org (no solo los aprobados).
- **Redundancia:** cuando `setStatus` aprueba un video, llama `assertCanPublish` **y** `assertCanPublishVideo` — dos scans completos idénticos, uno detrás del otro, para una sola escritura.

### 🟧 ALTO — `convex/testimonials.ts::getOrgStats` / `getSpaceStats`
- **Problema:** `.collect()` + 3 pasadas de `.filter()` sobre el mismo array. Se re-ejecutan reactivamente en Dashboard/Overview cada vez que cambia cualquier testimonio — es decir, **duplican exactamente el mismo escaneo** que ya hace `countApprovedTestimonials` en el mismo instante (aprobar un testimonio dispara ambos scans en paralelo, sobre los mismos datos, sin compartir resultado).
- **Complejidad Algorítmica Actual:** `O(3n)` por render.

### 🟧 ALTO — `convex/testimonials.ts::listBySpace` (paginación del Inbox)
- **Problema:** Lee el rango **completo** `by_space_and_status` con `.collect()` y recién ahí hace `.slice()` en JS para paginar. Convex expone `.paginate()` con cursor nativo y no se usa — la ruta de revisión de moderación (el flujo más usado del producto) no escala con el volumen histórico.
- **Complejidad Algorítmica Actual:** `O(n)` por página solicitada, en vez de `O(page size)`.

### 🟨 MEDIO — `convex/widgets.ts::getPreviewPayload`
- **Problema:** Mismo patrón collect+filter+sort+slice que `buildWidgetPayload`, pero se dispara en **cada edición** del formulario de apariencia (Basic/Advanced) del wizard de creación de widgets — cada cambio de campo genera nuevos args → nueva suscripción reactiva. Sin debounce.
- **Complejidad Algorítmica Actual:** `O(n log n)` por keystroke de personalización.

### 🟨 MEDIO — Duplicación de lógica de selección de testimonios (DRY)
- **Módulo:** `convex/lib/widgetPayload.ts::buildWidgetPayload` vs `convex/widgets.ts::getPreviewPayload`.
- **Problema Detectado:** La secuencia `filter → sort → slice(maxItems) → Promise.all(toPayloadTestimonial)` está copiada casi textual en ambos archivos en vez de extraída a un helper compartido en `lib/widgetPayload.ts`.

---

# 🟩 3. PLAN DE REFACTORIZACIÓN PRIORIZADO

### Fix #1 — Eliminar el full-scan de entitlements (mayor impacto/esfuerzo)

Añadir índice compuesto y dejar de contar en memoria:

```ts
// convex/schema.ts — añadir al índice existente de testimonials
.index("by_org_and_status", ["organizationId", "status"])
```

```ts
// convex/entitlements.ts
async function countApprovedTestimonials(ctx: Ctx, organizationId: Id<"organizations">) {
  // Antes: .collect() de TODO el historial + .filter() en memoria — O(n).
  // Ahora: el índice ya acota el rango a solo "approved" — O(k), k = aprobados.
  return await ctx.db
    .query("testimonials")
    .withIndex("by_org_and_status", (q) =>
      q.eq("organizationId", organizationId).eq("status", "approved")
    )
    .collect();
}

export async function assertCanPublish(ctx: Ctx, organizationId: Id<"organizations">) {
  const entitlements = await getEntitlements(ctx, organizationId);
  if (entitlements.maxPublishedTestimonials === null) return;
  // .take(limit + 1) evita cargar TODO el set aprobado solo para compararlo
  // contra un límite fijo (15 en Free) — con miles de aprobados esto es
  // la diferencia entre O(limit) y O(k).
  const approved = await ctx.db
    .query("testimonials")
    .withIndex("by_org_and_status", (q) =>
      q.eq("organizationId", organizationId).eq("status", "approved")
    )
    .take(entitlements.maxPublishedTestimonials + 1);
  if (approved.length > entitlements.maxPublishedTestimonials) {
    throw new Error(`Your plan allows up to ${entitlements.maxPublishedTestimonials} published testimonials. Upgrade to Pro for unlimited.`);
  }
}
```
*Siguiente nivel (si el volumen lo justifica): reemplazar el conteo por un componente de agregación (`@convex-dev/aggregate`, mismo patrón que ya usan con `@convex-dev/rate-limiter`) para lecturas `O(log n)` reales sin tocar la tabla cruda.*

### Fix #2 — Cachear el embed público en vez de suscripción reactiva en vivo

El widget de testimonios **no necesita tiempo real** — un `stale-while-revalidate` de 60s (igual al que ya tiene la ruta legacy) es imperceptible para el visitante y elimina el WebSocket por visitante:

```tsx
// src/app/(embed)/embed/[widgetId]/page.tsx
// Antes: useQuery reactivo abre un socket persistente por visitante y
// re-ejecuta buildWidgetPayload en cada mutación del espacio.
// Después: fetch server-side a la ruta HTTP ya cacheada (/embed/widget),
// que Next.js puede servir desde el edge sin tocar Convex en absoluto
// dentro de la ventana de 60s.
const payload = await fetch(
  `${convexHttpUrl}/embed/widget?id=${widgetId}`,
  { next: { revalidate: 60 } }
).then((r) => r.json());
```
*Requiere convertir el componente a Server Component (o un wrapper que haga el fetch server-side) — cambio de mayor alcance, priorizarlo primero por ser la ruta de más tráfico.*

### Fix #3 — Paginación real en el Inbox

```ts
// convex/testimonials.ts
export const listBySpace = query({
  args: { spaceId: v.id("spaces"), status: v.optional(...), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { spaceId, status, paginationOpts }) => {
    // ...
    return await ctx.db
      .query("testimonials")
      .withIndex("by_space_and_status", (q) => q.eq("spaceId", spaceId).eq("status", status))
      .order("desc")
      .paginate(paginationOpts); // cursor nativo — O(page size), no O(n)
  },
});
```

### Fix #4 — Unificar selección de testimonios (DRY)

Extraer `filter → sort → slice → toPayloadTestimonial` de `buildWidgetPayload` y `getPreviewPayload` a un único `selectWidgetTestimonials(ctx, spaceId, filter, maxItems)` en `convex/lib/widgetPayload.ts`, consumido por ambos.

---

# 📊 4. BALANCE DE IMPACTO ESTIMADO

| Área | Ganancia estimada |
|---|---|
| Latencia de aprobación de testimonios (Inbox) | **↓ 60–90%** en orgs con historial grande (elimina scan O(n) por click) |
| Carga en Convex por tráfico de embeds públicos | **↓ 70–95%** en escenario de alto tráfico (elimina 1 socket reactivo por visitante) |
| Latencia del Inbox al paginar | **↓ 50–80%** en espacios con >500 testimonios |
| Deuda técnica (duplicación de lógica) | **-2 bloques** de lógica de selección/conteo duplicada eliminados |

**Prioridad de ejecución:** Fix #1 (entitlements) y Fix #2 (embed público) primero — son los que escalan peor con el crecimiento natural del producto (más testimonios, más tráfico embebido) y afectan respectivamente la ruta de escritura más frecuente y la ruta de lectura más frecuente del sistema.
