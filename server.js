import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';

import { config } from './config.js';
import {
  motor, takenTimes, takenInRange, createAppointment,
  findByCode, cancelByCode, upcoming, putPhoto, getPhoto,
} from './db.js';

const root = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(root, 'public');

/** Busca la imagen de portada: la que diga config.heroImage, o el primer
 *  archivo llamado "portada" que encuentre en public/img/. Así basta con
 *  guardar la foto ahí para que la página la use. */
async function buscarPortada() {
  if (config.heroImage) return config.heroImage;
  for (const nombre of ['portada.jpg', 'portada.jpeg', 'portada.png', 'portada.webp']) {
    try {
      await stat(join(PUBLIC, 'img', nombre));
      return 'img/' + nombre;
    } catch { /* seguimos buscando */ }
  }
  return 'img/hero.svg';   // el relleno mientras no haya foto
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
};
const json = (res, status, data) =>
  send(res, status, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8' });

// ── Utilidades de horario ──────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');

// Fecha y hora según el reloj del estudio, no el del servidor
const fmtFecha = new Intl.DateTimeFormat('en-CA', {
  timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
});
const fmtHora = new Intl.DateTimeFormat('en-GB', {
  timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hour12: false,
});
const todayISO = () => fmtFecha.format(new Date());   // YYYY-MM-DD
const nowHM = () => fmtHora.format(new Date());       // HH:MM

/** Todos los bloques de un día según la configuración. */
function slotsForDate(dateStr) {
  const { openHour, closeHour, slotMinutes, closedWeekdays } = config.schedule;
  const [y, m, d] = dateStr.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  if (closedWeekdays.includes(day.getDay())) return [];
  const out = [];
  for (let min = openHour * 60; min + slotMinutes <= closeHour * 60; min += slotMinutes) {
    out.push(`${pad(Math.floor(min / 60))}:${pad(min % 60)}`);
  }
  return out;
}

/** Un bloque que ya pasó (hoy, hora anterior) no se puede reservar.
 *  Se compara con la hora del estudio, no con la del servidor. */
function isPast(dateStr, time) {
  const hoy = todayISO();
  if (dateStr < hoy) return true;
  if (dateStr > hoy) return false;
  return time <= nowHM();
}

function dateIsBookable(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'Fecha inválida.';
  const today = todayISO();
  if (dateStr < today) return 'Esa fecha ya pasó.';
  const limit = new Date();
  limit.setDate(limit.getDate() + config.schedule.maxDaysAhead);
  if (dateStr > fmtFecha.format(limit))
    return `Solo se puede agendar con ${config.schedule.maxDaysAhead} días de anticipación.`;
  if (slotsForDate(dateStr).length === 0) return 'Ese día el estudio está cerrado.';
  return null;
}

async function availability(dateStr) {
  const all = slotsForDate(dateStr);
  const taken = new Set(await takenTimes(dateStr));
  return all.map((time) => ({
    time,
    taken: taken.has(time),
    past: isPast(dateStr, time),
    available: !taken.has(time) && !isPast(dateStr, time),
  }));
}

// ── Lectura del cuerpo de la petición ──────────────────────────
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('TOO_LARGE')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const clean = (v, max = 400) =>
  typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '';

/** Guarda la foto de referencia en la base de datos y devuelve su identificador.
 *  Va en la base (y no en el disco) para que no se pierda cuando el servidor
 *  de internet se reinicie. */
async function savePhoto(dataUrl) {
  const m = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > config.maxPhotoBytes) throw new Error('PHOTO_TOO_LARGE');
  const tipo = m[1] === 'jpg' ? 'jpeg' : m[1];
  const id = `${Date.now()}-${randomBytes(6).toString('hex')}`;
  await putPhoto(id, `image/${tipo}`, buf);
  return id;
}

const newCode = () => randomBytes(3).toString('hex').toUpperCase();

// ── Rutas ──────────────────────────────────────────────────────
async function api(req, res, url) {
  const path = url.pathname;

  if (req.method === 'GET' && path === '/api/config') {
    const heroImage = await buscarPortada();
    const { schedule, studioName, tagline, intro, whatsappNumber, phoneDisplay,
      address, city, mapsQuery, instagram, facebook, facebookUrl, hoursText, styles } = config;
    return json(res, 200, {
      studioName, tagline, intro, heroImage, whatsappNumber, phoneDisplay, address, city,
      mapsQuery, instagram, facebook, facebookUrl, hoursText,
      maxDaysAhead: schedule.maxDaysAhead,
      closedWeekdays: schedule.closedWeekdays,
      today: todayISO(),
      styles,
    });
  }

  // Disponibilidad de un día concreto
  if (req.method === 'GET' && path === '/api/availability') {
    const date = url.searchParams.get('date') || '';
    const problem = dateIsBookable(date);
    if (problem) return json(res, 200, { date, closed: true, reason: problem, slots: [] });
    return json(res, 200, { date, closed: false, slots: await availability(date) });
  }

  // Resumen de un mes: cuántos bloques quedan libres por día (para el calendario)
  if (req.method === 'GET' && path === '/api/month') {
    const month = url.searchParams.get('month') || ''; // YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) return json(res, 400, { error: 'Mes inválido.' });
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    const taken = await takenInRange(`${month}-01`, `${month}-${pad(last)}`);
    const days = {};
    for (let d = 1; d <= last; d++) {
      const date = `${month}-${pad(d)}`;
      const all = slotsForDate(date);
      if (!all.length) { days[date] = { closed: true, free: 0 }; continue; }
      const busy = new Set(taken[date] || []);
      const free = all.filter((t) => !busy.has(t) && !isPast(date, t)).length;
      days[date] = { closed: false, free, total: all.length };
    }
    return json(res, 200, { month, days });
  }

  // Crear cita
  if (req.method === 'POST' && path === '/api/appointments') {
    let body;
    try {
      body = JSON.parse((await readBody(req, config.maxPhotoBytes * 1.5)).toString('utf8'));
    } catch (e) {
      return json(res, e.message === 'TOO_LARGE' ? 413 : 400, {
        error: e.message === 'TOO_LARGE'
          ? 'La foto es demasiado grande.'
          : 'No pudimos leer los datos del formulario.',
      });
    }

    const a = {
      name: clean(body.name, 80),
      phone: clean(body.phone, 30),
      date: clean(body.date, 10),
      time: clean(body.time, 5),
      style: clean(body.style, 40),
      bodyPart: clean(body.bodyPart, 60),
      sizeCm: clean(body.sizeCm, 30),
      notes: clean(body.notes, 800),
    };

    if (a.name.length < 2) return json(res, 400, { error: 'Escribe tu nombre.' });
    if (/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(a.phone))
      return json(res, 400, { error: 'El teléfono solo puede llevar números.' });
    const digitos = a.phone.replace(/\D/g, '').length;
    if (digitos < 7 || digitos > 15)
      return json(res, 400, { error: 'Ese teléfono no parece válido: debe tener entre 7 y 15 números.' });

    const problem = dateIsBookable(a.date);
    if (problem) return json(res, 400, { error: problem });
    if (!slotsForDate(a.date).includes(a.time))
      return json(res, 400, { error: 'Ese horario no existe en la agenda.' });
    if (isPast(a.date, a.time))
      return json(res, 400, { error: 'Ese horario ya pasó. Elige otro.' });

    // Aviso temprano y amable; la garantía real es el índice UNIQUE de abajo.
    if ((await takenTimes(a.date)).includes(a.time))
      return json(res, 409, {
        error: 'Ese horario acaba de ser apartado por otra persona. Elige otro, por favor.',
        slots: await availability(a.date),
      });

    try {
      a.photo = await savePhoto(body.photo);
    } catch {
      return json(res, 413, { error: 'La foto pesa demasiado. Intenta con una más ligera.' });
    }

    a.code = newCode();
    try {
      await createAppointment(a);
    } catch (err) {
      // Dos personas enviaron el formulario en el mismo instante:
      // la base de datos rechaza la segunda y aquí se lo explicamos.
      if (err.slotTaken) {
        return json(res, 409, {
          error: 'Ese horario acaba de ser apartado por otra persona. Elige otro, por favor.',
          slots: await availability(a.date),
        });
      }
      console.error('Error al guardar la cita:', err);
      return json(res, 500, { error: 'No pudimos guardar la cita. Intenta de nuevo.' });
    }

    return json(res, 201, {
      ok: true,
      code: a.code,
      appointment: { ...a, photoUrl: a.photo ? `/uploads/${a.photo}` : null },
    });
  }

  // Consultar una cita por folio
  if (req.method === 'GET' && path === '/api/appointments') {
    const code = clean(url.searchParams.get('code'), 12).toUpperCase();
    const row = code && await findByCode(code);
    if (!row) return json(res, 404, { error: 'No encontramos ninguna cita con ese folio.' });
    return json(res, 200, { ...row, photoUrl: row.photo ? `/uploads/${row.photo}` : null });
  }

  // Cancelar (libera el horario para otras personas)
  if (req.method === 'POST' && path === '/api/appointments/cancel') {
    let code = '';
    try { code = clean(JSON.parse((await readBody(req, 4096)).toString()).code, 12).toUpperCase(); }
    catch { return json(res, 400, { error: 'Folio inválido.' }); }
    if (!(await cancelByCode(code)))
      return json(res, 404, { error: 'No encontramos una cita activa con ese folio.' });
    return json(res, 200, { ok: true });
  }

  // Agenda del tatuador
  if (req.method === 'GET' && path === '/api/admin/appointments') {
    return json(res, 200, { appointments: await upcoming(todayISO()) });
  }

  return json(res, 404, { error: 'Ruta no encontrada.' });
}

/** Sirve index.html marcando los estilos y el guion con su fecha de
 *  modificación (styles.css?v=…). Así el navegador nunca se queda con una
 *  versión vieja cuando se cambia algo del código. */
async function servePage(res) {
  const file = join(PUBLIC, 'index.html');
  let html = await readFile(file, 'utf8');
  for (const recurso of ['styles.css', 'app.js']) {
    const { mtimeMs } = await stat(join(PUBLIC, recurso));
    html = html.replaceAll(recurso, `${recurso}?v=${Math.round(mtimeMs)}`);
  }
  send(res, 200, html, { 'Content-Type': MIME['.html'] });
}

async function serveFile(res, base, relPath, fallback) {
  const safe = normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  const file = join(base, safe);
  if (!file.startsWith(base)) return send(res, 403, 'Prohibido');
  try {
    const data = await readFile(file);
    const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
    // La página, los estilos y el guion nunca se guardan en caché: así, al
    // cambiar algo en el código, se ve al recargar sin trucos raros.
    // Las imágenes sí se guardan, pero poco tiempo.
    const esImagen = /\.(svg|png|jpe?g|webp|ico)$/i.test(file);
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': esImagen ? 'public, max-age=300' : 'no-store',
    });
    res.end(data);
  } catch {
    if (fallback) return serveFile(res, base, fallback, null);
    send(res, 404, 'No encontrado');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname.startsWith('/uploads/')) {
      const foto = await getPhoto(decodeURIComponent(url.pathname.slice('/uploads/'.length)));
      if (!foto) return send(res, 404, 'Foto no encontrada');
      res.writeHead(200, { 'Content-Type': foto.mime, 'Cache-Control': 'public, max-age=86400' });
      return res.end(foto.bytes);
    }
    if (url.pathname === '/' || url.pathname === '/index.html') return await servePage(res);
    return await serveFile(res, PUBLIC, url.pathname.slice(1), null);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) json(res, 500, { error: 'Error interno del servidor.' });
  }
});

server.listen(config.port, () => {
  const redes = Object.values(networkInterfaces()).flat()
    .filter((r) => r && r.family === 'IPv4' && !r.internal);

  console.log(`\n  ${config.studioName} · servidor listo\n`);

  if (redes.length) {
    console.log('  Esta misma dirección funciona en la computadora Y en el celular');
    console.log('  (los dos conectados al mismo wifi):\n');
    for (const red of redes) console.log(`      http://${red.address}:${config.port}\n`);
  }
  console.log(`  (en esta computadora también sirve http://localhost:${config.port})\n`);
});
