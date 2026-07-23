# Brief de pantallas — TeamTestify

Este documento describe, en lenguaje simple y sin tecnicismos, cada pantalla que
hoy existe en el producto. El objetivo es que el diseñador entienda **qué hace
cada pantalla, qué ve el usuario y qué elementos la componen**, para poder
rediseñarla o pulirla.

**Qué es el producto en una frase:** una herramienta para recolectar testimonios
(en texto o video) de tus clientes, revisarlos y publicarlos en tu propia web
como un "muro de testimonios" o widgets.

**Nota sobre idioma:** hoy la interfaz está mezclada (la mayoría de pantallas en
inglés y la de *Ajustes del espacio* en español). Sería ideal unificar todo a un
solo idioma en el rediseño.

El producto tiene dos grandes zonas:

- **Zona pública** — lo que ven las personas sin cuenta (la web de venta, el
  formulario donde el cliente deja su testimonio, y el widget final incrustado).
- **Panel privado** — donde el dueño del negocio gestiona todo (requiere iniciar
  sesión).

---

## ZONA PÚBLICA

### 1. Página de inicio / venta (Landing)

La página principal donde llega un visitante nuevo. Es una página larga de una
sola columna, con secciones apiladas de arriba a abajo. Su meta es explicar el
producto y conseguir que la persona se registre.

Secciones, en orden:

1. **Barra superior (Navbar).** Logo/nombre a la izquierda y accesos a las
   secciones + botón para registrarse/iniciar sesión.
2. **Encabezado principal (Hero).**
   - Un texto pequeño arriba tipo etiqueta: "Collect · Moderate · Embed"
     (Recolecta · Modera · Incrusta).
   - Un titular muy grande y llamativo: *"Testimonials in minutes, not sprints"*
     (con una palabra resaltada en color de acento).
   - Un párrafo de apoyo que explica para quién es (freelancers, creadores,
     equipos pequeños) y qué logra (recolectar video y texto y publicar un muro).
   - Dos botones: uno primario "Start for free" y uno secundario "See how it
     works".
   - Una línea de tranquilidad: "Sin tarjeta de crédito · Recolección ilimitada".
   - Debajo, una **vista previa visual del muro de testimonios** (una muestra de
     cómo se ven varios testimonios juntos).
3. **Problema / Beneficio.** Contrasta el dolor actual con la solución.
4. **Cómo funciona (3 pasos).** Tres columnas con ícono, título y descripción:
   - Paso 1 "Comparte tu enlace".
   - Paso 2 "Ellos graban o escriben" (sin necesidad de que el cliente cree cuenta).
   - Paso 3 "Revisa y publica" (incrustar con una sola línea).
5. **Características (Features).** Rejilla de funcionalidades destacadas.
6. **Diferenciador.** Por qué elegir esto frente a alternativas más caras.
7. **Prueba social.** Testimonios/logos que dan confianza.
8. **Precios.** Ver detalle en la sección siguiente (está dentro de esta página).
9. **Preguntas frecuentes (FAQ).** Lista de preguntas colapsables.
10. **Llamado final (Final CTA).** Un último empujón para registrarse.
11. **Pie de página (Footer).** Enlaces secundarios y legales.

### 2. Bloque de Precios (dentro de la landing)

- Título "Simple, transparent pricing" y una bajada que aclara que la recolección
  es ilimitada en todos los planes; se paga para publicar más.
- **Dos tarjetas de plan lado a lado:**
  - **Free — $0.** Texto "Ideal para publicar tus primeros testimonios" y botón
    "Start for free".
  - **Pro — $29/mes (o $290/año).** Tarjeta destacada con borde de color. Botones
    "Upgrade monthly" / "Upgrade yearly" (si la persona ya tiene sesión) o "Get
    started" (si no).
- **Tabla comparativa** de capacidades Free vs Pro, con estas filas:
  - Espacios: 1 (Free) / 5 (Pro)
  - Testimonios recolectados: Ilimitados / Ilimitados
  - Testimonios publicados: 15 en total / Ilimitados
  - Testimonios de video publicados: 2 / Ilimitados
  - Duración máx. de video: 2 min / 3 min
  - Insignia "Powered by TeamTestify": Sí / Se puede quitar
  - Dominio propio para la página de recolección: No / Sí
  - Fragmentos enriquecidos (para buscadores): No / Sí
  - Reutilización con IA: No / 100 generaciones al mes
  - Miembros del equipo: 1 / 3

### 3. Iniciar sesión (Sign in)

Pantalla centrada con una sola tarjeta angosta sobre fondo neutro.

- Título "Sign in".
- Botón grande "Continue with Google".
- Separador con la palabra "or".
- Formulario simple: campo Email, campo Password, y botón "Sign in" (muestra
  "Signing in…" mientras procesa).
- Si hay error, aparece un mensaje en rojo sobre el botón.
- Abajo: "No account? Sign up" (enlace a registro).

### 4. Registro (Sign up)

Prácticamente idéntica a la de iniciar sesión (misma tarjeta centrada), pero
orientada a crear la cuenta, con enlace inverso para ir a iniciar sesión.

### 5. Página pública de recolección de testimonios

Esta es la pantalla que el dueño comparte con sus clientes (por un enlace tipo
`/r/su-negocio`). Aquí el cliente deja su testimonio. **No requiere cuenta.**

Es una columna angosta y centrada. El **color y el fondo se personalizan** según
la marca del negocio (ver pantalla de Branding). Elementos de arriba abajo:

- **Logo** del negocio (circular), si lo cargó.
- **Titular** (ej. "Comparte tu experiencia con [Negocio]").
- **Subtítulo** opcional.
- **Formulario:**
  - Si el negocio permite texto **y** video, primero aparecen dos botones grandes
    para elegir: "Write" (escribir) o "Record video" (grabar video). Si solo
    permite uno, se salta este paso.
  - Campo "Your name" (obligatorio).
  - Campo Email (solo si el negocio lo pidió; opcional).
  - Campos "Title" (cargo) y "Company" (empresa) lado a lado + carga de foto
    (solo si el negocio lo activó).
  - **Calificación con estrellas** (1 a 5), si el negocio la pide.
  - **Caja de "preguntas guía":** un recuadro suave con una lista de sugerencias
    de qué mencionar. Son solo pistas, no campos para llenar. El texto cambia
    según el modo ("Mientras grabas, intenta mencionar:" / "Mientras compartes tu
    testimonio, considera mencionar:").
  - Según el modo elegido:
    - **Texto:** un área de texto grande ("Comparte tu experiencia…").
    - **Video:** un grabador de video en el navegador + la opción "o" subir un
      archivo de video.
  - Botón "Submit testimonial" a todo el ancho (muestra "Submitting…" al enviar).
- **Estados especiales:**
  - Cargando: mensaje "Loading…".
  - Enlace no disponible / pausado: mensaje "This collection page isn't
    available." (sin formulario).
  - Éxito: se reemplaza todo por un mensaje de agradecimiento (el que configuró
    el dueño, ej. "¡Gracias por compartir!").

### 6. Widget incrustado / página alojada del widget

Es el resultado final: el bloque de testimonios que aparece en la web del cliente
(o como una página con su propio enlace). Se adapta al ancho del sitio donde se
coloca y **nunca deforma la página**. Puede verse de varias formas según cómo lo
configure el dueño:

- **Grid (rejilla):** tarjetas del mismo tamaño en columnas parejas.
- **Masonry (mosaico):** tarjetas de distinta altura estilo Pinterest.
- **Masonry animado:** el mosaico se desplaza solo suavemente (se pausa cuando el
  visitante pasa el cursor); opcionalmente con una animación de corazón.
- **Carrusel:** un testimonio a la vez que avanza (con autoplay opcional).
- **Testimonio único:** muestra un solo testimonio destacado.

Cada tarjeta puede mostrar: foto de la persona, nombre, cargo y empresa,
estrellas de calificación, fecha, y el texto o el video (con botón de play). Los
textos largos tienen "Read more" que abre el testimonio completo en una ventanita
superpuesta, sin empujar la página. Respeta modo claro/oscuro. Si aún no hay
testimonios, muestra "No testimonials to show yet."

---

## PANEL PRIVADO (requiere sesión)

Todo el panel comparte una **barra lateral izquierda fija** y el contenido a la
derecha.

### 7. Barra lateral (navegación del panel)

Columna fija a la izquierda. Tiene dos "modos" según dónde estés:

- **Arriba (siempre):** nombre del producto ("Testimonial Studio") y un selector
  de organización (para cambiar entre cuentas/negocios).
- **Modo lista general** (cuando estás en el inicio del panel):
  - Botón "New space" (crear espacio).
  - Lista de tus espacios; el activo queda resaltado. Al pasar el cursor sobre uno
    aparece un menú rápido de acciones.
- **Modo dentro de un espacio** (cuando entraste a uno):
  - Enlace "Back" para volver + el nombre del espacio.
  - Menú de secciones de ese espacio: **Inbox, Widgets, Settings, Branding,
    Share.** El Inbox muestra un **punto rojo** cuando hay testimonios nuevos por
    revisar.
- **Abajo (siempre):** ícono de ajustes de la organización y el menú del usuario
  (cuenta / cerrar sesión).

### 8. Inicio del panel (Dashboard / lista de espacios)

La primera pantalla al entrar. Contenido centrado.

- **Fila de 4 indicadores (tarjetas de estadística)** arriba, cada una con un
  ícono de color, un número grande y una etiqueta:
  - "Spaces" (espacios, con un límite tipo "3 / 5").
  - "Pending review" (pendientes por revisar) — tono ámbar.
  - "Approved" (aprobados) — tono verde.
  - "Video testimonials" (con límite). *Nota: hoy algunos límites que se muestran
    son valores de ejemplo, no reales.*
- Título "Spaces".
- **Rejilla de tarjetas de espacios.** Cada tarjeta muestra el nombre del espacio,
  una insignia "Paused" si está inactivo, su enlace público (`/r/…`) y su
  descripción. Al hacer clic entras al espacio. En la esquina, un menú de acciones
  rápidas.
- **Estados vacíos:** "Loading…" mientras carga; si no hay espacios, "No spaces
  yet. Create one to get your first collection link."

### 9. Bandeja del espacio (Inbox) — pantalla principal de un espacio

Aquí el dueño revisa y modera los testimonios que llegan. Es la sección por
defecto al entrar a un espacio.

- **Pestañas** para filtrar por estado: **Pending / Approved / Rejected**.
- Un **selector de orden** a la derecha: "Newest first" / "Oldest first".
- **Lista de testimonios**, uno debajo de otro. Cada testimonio es una tarjeta con:
  - Nombre de la persona, cargo · empresa, y estrellas.
  - Insignias a la derecha: tipo ("text" o "video") y "Featured" si está destacado.
  - El contenido: el texto, o un reproductor de video.
  - **Botones de acción según el estado:**
    - Pendiente: "Approve" (verde) y "Reject".
    - Aprobado: "Feature/Unfeature" (destacar) y "Create image" (generar una
      imagen para redes — abre una ventana, ver más abajo).
    - Siempre: "Delete" (en rojo, discreto).
  - Al aprobar/rechazar/eliminar, la tarjeta **se desliza y desaparece** con una
    breve animación.
  - Si aprobar falla por límite del plan, aparece un mensaje con enlace para
    mejorar de plan.
- **Paginación** abajo: texto "1-10 of 24" y botones "Prev" / "Next".
- **Estados vacíos:** "Loading…" o "Nothing here yet."

#### 9a. Ventana "Generar imagen para redes" (desde un testimonio aprobado)

Se abre como ventana emergente (modal) al pulsar "Create image".

- Título "Social image generator".
- Botón "Generate proposals" y una línea que dice cuántas generaciones quedan
  este mes.
- Tras generar: una **rejilla de 3 propuestas de diseño** para elegir (cada una
  con su nombre de estilo, el titular y el tipo de fondo).
- Al elegir una, se muestra una **vista previa** de la imagen.
- Aviso, en plan gratis, de que la imagen lleva una marca de agua "Hecho con
  TeamTestify".
- Botones para **descargar** en distintos tamaños (para cada red social).
- **Si se acabó la cuota de IA del mes:** aparece un aviso claro (ver pantalla 14)
  con botón "Upgrade to Pro", en lugar de simplemente desactivar el botón.

### 10. Widgets del espacio (lista)

Donde el dueño crea y gestiona los bloques de testimonios que va a incrustar.

- Encabezado "Widgets" + botón "New widget".
- **Crear widget (ventana emergente):** pide un nombre, elegir el **tipo** ("Wall
  of Love" = muro, o "Single testimonial" = un solo testimonio) y, si es único,
  elegir cuál testimonio aprobado usar. Si no hay testimonios aprobados, avisa que
  primero hay que aprobar uno.
- **Rejilla de widgets existentes.** Cada tarjeta muestra el nombre, una insignia
  "Published" o "Draft", y una línea con el tipo/estilo (ej. "Wall · grid"). Al
  hacer clic se abre el editor.
- Estado vacío: "No widgets yet."

### 11. Editor de widget

Pantalla de configuración de un widget concreto. Columna única con varias
tarjetas.

- **Tarjeta "Widget settings":**
  - Interruptor "Published" (publicado o borrador).
  - Nombre.
  - Tipo (muro o testimonio único); si es único, selector del testimonio.
  - **Apariencia:** Tema (Auto / Light / Dark), **color de acento** y **color de
    fondo** (cada uno con selector de color + campo de texto + botón "Reset").
  - **Solo para muro** — opciones de disposición:
    - Layout: Grid / Masonry / Masonry animado / Carrusel.
    - Columnas (2, 3 o 4), según el layout.
    - Carrusel: segundos de autoplay.
    - Masonry animado: dirección de scroll (vertical/horizontal), filas (si es
      horizontal), velocidad (lenta/normal/rápida), interruptores "Reverse
      direction" y "Show heart animation", y altura máxima. Con nota: se pausa al
      pasar el cursor y nunca crece más allá de esa altura.
    - Otros layouts: interruptor "Limit height" (mantener compacto con scroll
      interno) + altura máxima en píxeles.
  - Interruptores generales: "Show rating", "Show avatar", "Show date".
  - **Solo para muro** — filtros: interruptor "Only featured testimonials" y campo
    "Max items" (máximo de testimonios a mostrar).
- Botón "Save changes" (muestra "Saved").
- **Tarjeta "Embed snippet":** un bloque de código listo para copiar (con botón
  "Copy snippet") que el usuario pega en su web.
- **Tarjeta "Hosted page link":** un enlace directo al widget para compartir sin
  incrustar nada, con botones "Copy" y "Open".

### 12. Ajustes del espacio (Settings)

Configuración del espacio y de su formulario público. Diseño en **dos columnas**:
a la izquierda los controles, a la derecha una **vista previa en vivo** de cómo
queda la página pública de recolección (se actualiza al instante).

La columna izquierda tiene dos pestañas:

**Pestaña "Básico":**

- **Identificación:**
  - Nombre del espacio.
  - Descripción interna opcional (solo la ve el equipo).
  - Enlace público (solo lectura) con botón "Copiar".
  - Interruptor **"Aceptando respuestas"**: activar/pausar la recolección. Si se
    pausa, los visitantes ven un mensaje de "no disponible" y no se borra nada.
- **Textos del formulario:** Título, Descripción y Mensaje de gracias.
- **Recopilar datos** (interruptores): permitir texto, permitir video, recopilar
  calificación, recopilar nombre/empresa/cargo, y recopilar email del autor.

**Pestaña "AI Assistant":** un asistente que ayuda a pedir testimonios.

- Sección "Your Business": una caja para describir el negocio en una frase y un
  botón "AI Assistant" para generar. Debajo dice cuántas generaciones quedan este
  mes.
- Sección "Generated" (aparece tras generar): pestañas con los textos generados —
  **Email**, **WhatsApp**, **Follow-up** (recordatorio) y **Guide Questions**
  (preguntas guía) — cada una con botón para copiar. Las preguntas guía se pueden
  "usar" para añadirlas a la lista de preguntas del formulario.
- Sección "Guide Questions": un editor para crear/ordenar/editar las preguntas
  guía que verá el cliente en el formulario público.
- **Si se acabó la cuota de IA del mes:** aviso claro con botón para pasar a Pro
  (ver pantalla 14).

Abajo, botón "Guardar cambios" y una pequeña confirmación flotante ("Questions
saved") que aparece y desaparece.

### 13. Branding del espacio

Personaliza la apariencia de la página pública de recolección. Igual que Ajustes,
usa **dos columnas**: controles a la izquierda y **vista previa en vivo** a la
derecha.

- Tarjeta "Branding" con el editor: color principal de la marca, logo, y estilo de
  fondo (ej. sólido o degradado).
- Botón "Save changes" (muestra "Saved").
- La vista previa muestra en tiempo real cómo se verá el formulario del cliente
  con esos colores y logo.

### 14. Compartir el espacio (Share)

Donde el dueño obtiene el enlace para difundir y donde puede eliminar el espacio.

- **Panel para compartir:** el enlace público del espacio con formas de copiarlo/
  difundirlo (incluye opciones según si acepta texto y/o video).
- **"Danger zone" (zona de peligro):** una tarjeta con borde rojo.
  - Explica que eliminar borra el espacio, su página, todos sus testimonios (con
    videos) y widgets, y que **no se puede deshacer**.
  - Botón "Delete space" que abre una ventana de confirmación donde hay que
    **escribir el nombre exacto del espacio** para habilitar el botón final
    "Delete permanently".

### 15. Ajustes de la organización (cuenta / facturación)

Se llega desde el ícono de ajustes en la barra lateral. Columna única centrada.

- **Tarjeta "Billing" (facturación):**
  - Muestra el **plan actual** ("Free" o "Pro"); si es Pro, la fecha de
    renovación.
  - Si es Free: botones "Upgrade — $29/mo" y "Upgrade — $290/yr".
  - Si es Pro: botón "Manage billing" (gestionar suscripción).
  - Al volver de un pago muestra un aviso de "Checkout completo" o "Checkout
    cancelado".
- **Tarjeta "Notifications":** un campo de email al que se avisará cada vez que
  llegue un testimonio nuevo.
- Botón "Save changes" (muestra "Saved").

### 16. Aviso de límite de IA alcanzado (componente reutilizable)

No es una pantalla completa, sino un **aviso destacado** que aparece dentro del
Asistente de IA y del generador de imágenes cuando el usuario del plan gratis
gasta su cuota mensual de IA (1 generación de textos + 3 de imágenes al mes).

- Ícono + título "Límite de IA alcanzado".
- Mensaje: *"Has alcanzado tu límite de IA este mes. Cámbiate a Pro para seguir
  usando el Asistente de IA y generar imágenes ilimitadas."*
- Botón "Upgrade to Pro" que lleva a la pantalla de facturación.
- La idea es **no esconder la función**, sino dejar claro por qué está deshabilitada
  y qué hacer.

---

## Resumen del recorrido del usuario

1. Llega a la **landing**, entiende el producto y **se registra**.
2. Entra al **panel** y **crea un espacio**.
3. Ajusta los **textos, datos y branding** del formulario (con vista previa en
   vivo), opcionalmente con ayuda del **Asistente de IA**.
4. **Comparte el enlace público** con sus clientes.
5. Los clientes dejan su testimonio (texto o video) en la **página de recolección**.
6. El dueño los **revisa y aprueba** en la **bandeja (Inbox)**.
7. Crea un **widget** con los aprobados y lo **incrusta en su web**.
8. Cuando quiere publicar más de lo que permite el plan gratis, **pasa a Pro**.
