# Página del estudio de tatuajes

Portada + agenda de citas + cotización por WhatsApp.
No usa librerías externas: solo Node.js (versión 22.5 o superior).

---

## 1. Arrancar la página

```bash
npm start
```

Al arrancar, la terminal muestra dos direcciones:

```
  → En esta computadora:  http://localhost:3000
  → Desde el celular:     http://192.168.1.213:3000
```

No hace falta `npm install`: la base de datos (SQLite) ya viene incluida en Node.

### Verla en el celular

Con el teléfono **conectado al mismo wifi** que la computadora, escribe en el
navegador la dirección que dice "Desde el celular" (los números cambian según
la red; si cambias de wifi, vuelve a mirar la terminal).

La página está pensada para el teléfono: menú desplegable, calendario y
formulario a una columna, los atajos de redes en una fila al alcance del pulgar
y las ventanas emergentes subiendo desde abajo. Esto sirve para enseñarla o
probarla; para que cualquiera la abra desde su casa hay que publicarla (punto 5).

Para ver las citas agendadas desde la terminal:

```bash
npm run citas
```

---

## 2. Lo que tienes que cambiar (todo en `config.js`)

| Qué | Dónde | Nota |
|---|---|---|
| Nombre del estudio | `studioName` | Ya puesto: `bedrlee_tattoos`. Sale en la portada, la barra y los mensajes |
| **Número de WhatsApp** | `whatsappNumber` | Ya puesto: `50374844432` (+503 7484 4432). Solo dígitos, con código de país y **sin +** |
| Teléfono visible | `phoneDisplay` | Como quieres que se lea en pantalla |
| Dirección | `address`, `city` | Ya puesta: Bedrlee Estudio · San Isidro, Izalco, Sonsonate |
| Punto del mapa | `mapsQuery` | Ya puesto: `13.78875,-89.5632778` (las coordenadas que diste) |
| Instagram | `instagram` | Ya puesto: `bedrlee_tattoos` (solo el usuario, sin `@`) |
| Facebook | `facebook`, `facebookUrl` | Ya puesto: se muestra `Bedr Lee` y abre `facebook.com/bedrlee.tattoos` |
| Horario de atención | `hoursText` | Texto que se muestra |
| Horario real de citas | `schedule` | Hora de apertura, cierre, duración del bloque y días cerrados |
| **Imagen de portada** | `heroImage` | Ver abajo |

Después de cambiar `config.js`, reinicia el servidor (Ctrl+C y `npm start`).

### Cambiar la imagen de portada

1. Copia tu foto a la carpeta `public/img/` (por ejemplo `portada.jpg`).
2. En `config.js` escribe: `heroImage: 'img/portada.jpg'`.

Recomendado: horizontal, mínimo 1600 px de ancho, y que la parte importante
esté hacia la derecha (el texto va del lado izquierdo). La que está ahora
(`img/hero.svg`) es un relleno temporal.

### Los estilos que ofreces

Están en la lista `styles` de `config.js` (Fine line, Blackwork, Geométrico…).
Salen en la franja en movimiento y en el formulario de citas.

El catálogo de diseños se quitó de la página; quedó guardado en
`extras/catalogo-desactivado/` por si algún día quieres reponerlo con fotos
reales de tus trabajos.

---

## 3. Cómo funciona la agenda

- El cliente elige un día en el calendario y ve los horarios libres **en tiempo real**.
- Un horario ya apartado aparece **tachado** y no se puede seleccionar.
- Al confirmar recibe un **folio** (ej. `4F9A2C`) y su cita queda guardada en su
  propio teléfono o computadora.

### Cancelar una cita

Hay un solo botón, **Cancelar cita**, al final de la sección Agenda:

1. Al tocarlo aparece directamente la cita que esa persona agendó, sin escribir nada.
2. Se le pregunta si está segura; si dice que sí, ve el mensaje
   **"¡Espero que vuelvas pronto! Muchas gracias"** y el horario queda libre al instante.
3. Si no tiene ninguna cita, le dice **"No tienes citas registradas"**.

La cita se recuerda en el navegador de esa persona, así que si agendó desde el
teléfono y luego entra desde una computadora, no la verá ahí: por eso esa misma
pantalla ofrece escribir el folio como respaldo.

**Dos personas no pueden apartar el mismo horario.** Esto no depende del
navegador: la base de datos tiene una regla (`uniq_slot` en `db.js`) que
rechaza cualquier segundo intento sobre el mismo día y hora, incluso si las dos
peticiones llegan en el mismo instante. Está probado con 5 reservas simultáneas:
solo una pasa, las otras cuatro reciben el aviso de "ese horario acaba de ser
apartado".

---

## 4. Cómo funciona el WhatsApp

Cada botón abre WhatsApp con el mensaje **ya escrito**: el cliente solo le da
enviar. Hay tres variantes:

- **Atajos flotantes y de la barra superior** → Instagram, Facebook y WhatsApp,
  siempre a la vista. El de WhatsApp lleva el mensaje general preguntando precio.
- **Después de agendar** → incluye folio, día, hora, estilo, zona, tamaño y la idea.

### Sobre la foto de referencia

WhatsApp **no permite adjuntar archivos desde un enlace**, así que se hacen las
dos cosas que pediste:

1. La foto se sube al servidor (se guarda en `data/uploads/`) y el mensaje
   incluye el **enlace a la imagen**.
2. El mensaje también invita al cliente a **adjuntarla él mismo** en el chat.

⚠️ Mientras la página corra en tu computadora, el enlace de la foto solo abre
dentro de tu wifi. Ya publicada (punto 5), el enlace funciona desde cualquier
teléfono. La foto se comprime en el navegador antes de subirse, así que ocupa
poco (unos 300 KB), y se guarda junto con la cita.

---

## 5. Publicar la página en internet

La página guarda las citas en dos lugares distintos según dónde corra:

| Dónde corre | Dónde guarda las citas |
|---|---|
| Tu computadora | un archivo en `data/citas.db` (no necesita internet) |
| Publicada | una base de datos en la nube (variable `DATABASE_URL`) |

Esto es necesario porque los hostings gratuitos **borran el disco** cada vez que
se reinician: sin base de datos aparte, perderías las citas.

### Paso 1 · Crear la base de datos (gratis, 5 minutos)

1. Entra a **neon.com** y crea una cuenta gratuita.
2. Crea un proyecto (ponle `bedrlee-tattoos`).
3. Copia la **connection string**. Se ve así:
   `postgresql://usuario:clave@ep-algo.neon.tech/neondb?sslmode=require`
4. Guárdala; la vas a pegar en el paso 3.

⚠️ Esa dirección es como la llave de tu negocio: no la publiques ni la subas a
ningún repositorio.

### Paso 2 · Subir el código a GitHub

1. Crea una cuenta en **github.com** si no tienes.
2. Crea un repositorio nuevo, vacío, llamado `bedrlee-tattoos`.
3. En la terminal, dentro de esta carpeta:

```bash
git add . && git commit -m "Página del estudio" && git branch -M main
```

4. Conecta y sube (cambia `TU-USUARIO`):

```bash
git remote add origin https://github.com/TU-USUARIO/bedrlee-tattoos.git && git push -u origin main
```

GitHub te pedirá usuario y una contraseña que en realidad es un *token*: se saca
en github.com → Settings → Developer settings → Personal access tokens.

La carpeta `data/` no se sube nunca: ahí están las citas y las fotos de prueba.

### Paso 3 · Publicar en Render

1. Entra a **render.com**, crea cuenta y conecta tu GitHub.
2. **New → Web Service** y elige el repositorio `bedrlee-tattoos`.
3. Render lee el archivo `render.yaml` que ya está en el proyecto, así que la
   configuración sale sola (plan *Free*, arranque `node server.js`).
4. Antes de crear el servicio, abre **Environment** y añade la variable:

   | Nombre | Valor |
   |---|---|
   | `DATABASE_URL` | la dirección que copiaste de Neon en el paso 1 |

5. Dale a **Create Web Service** y espera un par de minutos.

Al terminar tendrás un enlace fijo tipo **https://bedrlee-tattoos.onrender.com**,
que funciona igual en la computadora, en el celular y para cualquier cliente,
esté donde esté. Ese es el enlace que puedes poner en tu Instagram.

### Dos cosas que debes saber del plan gratis

- Si nadie entra durante un rato, el servicio se duerme. La **primera visita
  después tarda unos 30-50 segundos** en abrir; las siguientes son normales.
  Se quita pasando al plan de pago (unos $7 al mes).
- Las citas y las fotos viven en Neon, así que **no se pierden** aunque Render
  se reinicie.

### Cuando cambies algo del código

```bash
git add . && git commit -m "lo que cambiaste" && git push
```

Render vuelve a publicar solo, en un par de minutos.

## 6. Archivos del proyecto

```
config.js      ← lo que vas a cambiar (nombre, WhatsApp, dirección, redes, horarios)
render.yaml    ← configuración para publicar en Render
server.js      ← servidor y API de citas
db.js          ← elige dónde guardar las citas (local o en la nube)
db-sqlite.js   ← guardado local, en tu computadora
db-postgres.js ← guardado en la nube, cuando está publicada
admin.js       ← "npm run citas": ver la agenda en la terminal
public/
  index.html   ← estructura de la página
  styles.css   ← diseño (azules y blancos)
  app.js       ← calendario, formulario y mensajes de WhatsApp
  img/         ← imagen de portada y patrón del fondo
data/
  citas.db     ← las citas cuando corre en tu computadora (se crea solo)
extras/        ← el catálogo que se quitó, guardado por si vuelve
```

---

## 7. Pendientes que dependen de ti

- [x] Nombre del estudio: **bedrlee_tattoos**
- [x] WhatsApp: **+503 7484 4432** (queda como `50374844432`)
- [x] Dirección: **Bedrlee Estudio · San Isidro, Izalco, Sonsonate**, con el mapa
      apuntando a las coordenadas 13°47'19.5"N 89°33'47.8"W.
- [x] Correo: eliminado de la página.
- [ ] **Imagen de portada** → cópiala a `public/img/` y ponla en `heroImage`.
- [x] Facebook: **facebook.com/bedrlee.tattoos** (se muestra como "Bedr Lee")
- [ ] (Opcional) Fotos reales de tus trabajos, si algún día quieres volver a
      tener un catálogo en la página.
