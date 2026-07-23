# Pre-launch checklist (bloqueantes antes de produccion)

- [ ] Rotar BETTER_AUTH_SECRET (openssl rand -base64 32) y
      actualizar .env.local / env de produccion
- [ ] Resend: verificar dominio propio y cambiar el from
      (hoy usa onboarding@resend.dev, sandbox) + setear
      RESEND_API_KEY en Convex
- [ ] Stripe: pasar de modo test a live (claves live, price IDs
      live, webhook secret live)
- [ ] Activar Stripe Tax cuando exista registro GST/ABN y poner
      la constante automatic_tax en true
- [ ] Landing page publicada y badge "Powered by TeamTestify"
      apuntando a ella
- [ ] Limpiar lint preexistente restante
- [ ] Correr suite completa de vitest en verde antes del deploy
- [ ] Replace landing placeholder social proof once real testimonials exist
- [ ] Confirm canonical domain, remove hardcoded localhost refs before deploy
- [ ] Migrate video storage to R2 when Convex file storage usage
      approaches 300-350 MB (currently 16.52 MB as of 2026-07-11), or
      before any paid marketing push, whichever comes first

## Deuda técnica identificada en auditoría

- [ ] Fix #2 del audit: cachear embed público (Server Component +
      revalidate 60s en src/app/(embed)/embed/[widgetId]/page.tsx),
      hacerlo antes de campaña de marketing o tráfico real a widgets
- [ ] Fix #3 del audit: paginación cursor nativa (.paginate()) en
      convex/testimonials.ts::listBySpace, hacerlo cuando alguna
      organización se acerque a 300-500 testimonios. Nota: cambia el
      contrato de la query (page/limit → cursor), requiere ajustar
      Inbox y los widget pickers que hoy usan limit: 999.