/* ═══════════════════════════════════════════════════════════
   Ink Studio · lógica de la página
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* Al refrescar, el navegador devuelve a la persona donde estaba leyendo.
   Aquí preferimos que la página empiece siempre por la portada, salvo que
   el enlace apunte a una sección concreta (por ejemplo .../#agenda). */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
addEventListener('load', () => {
  // Si quedó un #agenda en la dirección (de haber tocado un botón antes),
  // se quita para que al refrescar no vuelva a bajar hasta ahí.
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  scrollTo(0, 0);
});

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const api = (path, opts) =>
  fetch(path, opts).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || 'Error de conexión'), { status: r.status, data });
    return data;
  });

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
  'agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const bonita = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${DIAS[new Date(y, m - 1, d).getDay()]} ${d} de ${MESES[m - 1]}`;
};

let CFG = null;
let state = { date: null, time: null, photo: null, monthCursor: null };

/* ── WhatsApp ─────────────────────────────────────────────── */
function waLink(mensaje) {
  return `https://wa.me/${CFG.whatsappNumber}?text=${encodeURIComponent(mensaje)}`;
}
const PIDE_FOTO = '\n\n📎 Adjunto aquí mi foto de referencia.';

function mensajeGeneral() {
  return `¡Hola ${CFG.studioName}! 👋\n\nMe interesa hacerme un tatuaje y quisiera saber el precio.\n\n` +
    `• Idea: \n• Tamaño aproximado: \n• Zona del cuerpo: ${PIDE_FOTO}`;
}
function mensajeCita(a, photoUrl) {
  let m = `¡Hola ${CFG.studioName}! 👋\n\nAcabo de agendar una cita desde la página:\n\n` +
    `• Folio: *${a.code}*\n• Nombre: ${a.name}\n• Día: ${bonita(a.date)} a las ${a.time} h\n`;
  if (a.style)    m += `• Estilo: ${a.style}\n`;
  if (a.bodyPart) m += `• Zona: ${a.bodyPart}\n`;
  if (a.sizeCm)   m += `• Tamaño: ${a.sizeCm}\n`;
  if (a.notes)    m += `• Idea: ${a.notes}\n`;
  m += `\n¿Me pueden decir a qué precio me dejan el tatuaje?`;
  if (photoUrl) m += `\n\n🖼️ Mi referencia: ${location.origin}${photoUrl}`;
  m += PIDE_FOTO;
  return m;
}

/* ── Navegación ───────────────────────────────────────────── */
const nav = $('#nav');
const navLinks = $('.nav-links');
addEventListener('scroll', () => {
  nav.classList.toggle('stuck', scrollY > 24);
  document.body.classList.toggle('scrolled', scrollY > 24);
}, { passive: true });
$('#navToggle').addEventListener('click', (e) => {
  const open = navLinks.classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', String(open));
});
navLinks.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    navLinks.classList.remove('open');
    $('#navToggle').setAttribute('aria-expanded', 'false');
  }
});

/* ── Aparición al hacer scroll ────────────────────────────── */
const observer = new IntersectionObserver(
  (entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); observer.unobserve(en.target); }
  }),
  { threshold: 0.12, rootMargin: '0px 0px -40px' }
);
const watch = (el) => observer.observe(el);
$$('.reveal').forEach(watch);

/* ── Carga inicial ────────────────────────────────────────── */
init();

async function init() {
  try {
    CFG = await api('/api/config');
  } catch {
    $('#slots').innerHTML =
      '<p class="empty">No pudimos conectar con el servidor. Revisa que esté encendido (npm start).</p>';
    return;
  }

  CFG.instagramTag = '@' + CFG.instagram;

  // Textos que vienen de config.js
  $$('[data-cfg]').forEach((el) => { const v = CFG[el.dataset.cfg]; if (v) el.textContent = v; });
  document.title = `${CFG.studioName} · Estudio de tatuajes`;

  // Enlaces de contacto
  $('#mapLink').href   = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CFG.mapsQuery);
  $('#phoneLink').href = 'tel:' + CFG.phoneDisplay.replace(/[^\d+]/g, '');
  $('#igLink').href    = 'https://instagram.com/' + CFG.instagram;
  $('#igHandle').textContent = '@' + CFG.instagram;
  // Si no hay dirección de perfil, el botón abre la búsqueda por nombre
  const fbUrl = CFG.facebookUrl ||
    'https://www.facebook.com/search/top?q=' + encodeURIComponent(CFG.facebook);
  $('#fbLink').href = fbUrl;
  $('#fbHandle').textContent = CFG.facebook;
  $('#topFb').href = fbUrl;
  $('#dockFb').href = fbUrl;
  $('#topIg').href = 'https://instagram.com/' + CFG.instagram;
  $('#dockIg').href = 'https://instagram.com/' + CFG.instagram;
  $$('[data-wa="general"]').forEach((el) => { el.href = waLink(mensajeGeneral()); el.target = '_blank'; el.rel = 'noopener'; });

  // Si el nombre es largo y no cabe en una línea, que corte después del
  // guión bajo (bedrlee_ / tattoos) y no a media palabra.
  $('.hero-title .t1').innerHTML = escapar(CFG.studioName).replace(/_/g, '_<wbr>');

  // Imagen de portada (se cambia en config.js)
  $('#heroMedia').style.backgroundImage = `url('${CFG.heroImage}')`;
  $('#topPhone').href = 'tel:' + CFG.phoneDisplay.replace(/[^\d+]/g, '');
  $('#igHandleHero').textContent = '@' + CFG.instagram;

  // Mapa de la dirección (Google Maps, no necesita clave)
  const q = encodeURIComponent(CFG.mapsQuery);
  $('#mapFrame').src = `https://www.google.com/maps?q=${q}&hl=es&z=16&output=embed`;
  $('#routeBtn').href = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  // Tanto el botón del mapa como la tarjeta del estudio abren el selector
  $('#routeBtn').addEventListener('click', menuComoLlegar);
  $('#mapLink').addEventListener('click', menuComoLlegar);

  renderMarquee();
  CFG.styles.forEach((s) => $('#styleSelect').add(new Option(s, s)));

  const [y, m] = CFG.today.split('-').map(Number);
  state.monthCursor = { y, m };
  renderMonth();
}

/* ── Franja de texto en movimiento ────────────────────────── */
function renderMarquee() {
  const frases = [...CFG.styles, 'Diseños originales', 'Material estéril',
    'Cita previa', CFG.hoursText, 'Cotiza por WhatsApp'];
  const bloque = `<span>${frases.map((f) => `${f}<i></i>`).join('')}</span>`;
  // se duplica para que el desplazamiento sea continuo
  $('#marqueeTrack').innerHTML = bloque + bloque;
}

/* ── Calendario ───────────────────────────────────────────── */
async function renderMonth() {
  const { y, m } = state.monthCursor;
  $('#monthLabel').textContent = `${MESES[m - 1]} ${y}`;

  const [ty, tm] = CFG.today.split('-').map(Number);
  const limit = new Date(ty, tm - 1, 1);
  limit.setMonth(limit.getMonth() + Math.ceil(CFG.maxDaysAhead / 30));
  $('#prevMonth').disabled = y < ty || (y === ty && m <= tm);
  $('#nextMonth').disabled = new Date(y, m - 1, 1) >= limit;

  let data;
  try { data = await api(`/api/month?month=${y}-${pad(m)}`); }
  catch { $('#calGrid').innerHTML = '<p class="empty">No se pudo cargar el calendario.</p>'; return; }

  const first = new Date(y, m - 1, 1).getDay();      // 0=domingo
  const offset = (first + 6) % 7;                    // la semana empieza en lunes
  const last = new Date(y, m, 0).getDate();
  let html = '<span class="day empty"></span>'.repeat(offset);

  for (let d = 1; d <= last; d++) {
    const date = iso(y, m, d);
    const info = data.days[date] || { closed: true, free: 0 };
    const disabled = info.closed || info.free === 0 || date < CFG.today;
    const cls = info.free === 0 ? 'dot-none' : info.free <= 2 ? 'dot-few' : 'dot-free';
    const label = info.closed ? 'cerrado' : `${info.free} horarios libres`;
    html += `<button class="day${state.date === date ? ' sel' : ''}" data-date="${date}"
      ${disabled ? 'disabled' : ''} title="${bonita(date)} · ${label}">
      ${d}${disabled ? '' : `<i class="dot ${cls}"></i>`}</button>`;
  }
  $('#calGrid').innerHTML = html;
}

$('#prevMonth').addEventListener('click', () => shiftMonth(-1));
$('#nextMonth').addEventListener('click', () => shiftMonth(1));
function shiftMonth(delta) {
  const d = new Date(state.monthCursor.y, state.monthCursor.m - 1 + delta, 1);
  state.monthCursor = { y: d.getFullYear(), m: d.getMonth() + 1 };
  renderMonth();
}

$('#calGrid').addEventListener('click', (e) => {
  const day = e.target.closest('.day[data-date]');
  if (!day || day.disabled) return;
  state.date = day.dataset.date;
  state.time = null;
  $$('.day').forEach((d) => d.classList.toggle('sel', d === day));
  loadSlots(state.date);
  updateChosen();
});

/* ── Horarios ─────────────────────────────────────────────── */
async function loadSlots(date) {
  $('#slotsDate').textContent = '· ' + bonita(date);
  $('#slots').innerHTML = '<p class="empty">Cargando horarios…</p>';
  try {
    const data = await api(`/api/availability?date=${date}`);
    paintSlots(data.closed ? [] : data.slots, data.reason);
  } catch {
    $('#slots').innerHTML = '<p class="empty">No se pudieron cargar los horarios.</p>';
  }
}

function paintSlots(slots, reason) {
  if (!slots.length) {
    $('#slots').innerHTML = `<p class="empty">${reason || 'Ese día no hay horarios disponibles.'}</p>`;
    return;
  }
  $('#slots').innerHTML = slots.map((s) => {
    const motivo = s.taken ? 'Apartado' : s.past ? 'Ya pasó' : '';
    return `<button type="button" class="slot${state.time === s.time ? ' sel' : ''}"
      data-time="${s.time}" ${s.available ? '' : 'disabled'}
      title="${s.taken ? 'Este horario ya fue apartado por otra persona' : ''}">
      ${s.time}${motivo ? `<small>${motivo}</small>` : ''}</button>`;
  }).join('');
}

$('#slots').addEventListener('click', (e) => {
  const slot = e.target.closest('.slot[data-time]');
  if (!slot || slot.disabled) return;
  state.time = slot.dataset.time;
  $$('.slot').forEach((s) => s.classList.toggle('sel', s === slot));
  updateChosen();
});

function updateChosen() {
  const box = $('#chosen');
  if (state.date && state.time) {
    $('#chosenText').textContent = `${bonita(state.date)} · ${state.time} h`;
    box.hidden = false;
  } else {
    box.hidden = true;
  }
}

/* ── País del teléfono ────────────────────────────────────────
   Cada país tiene su cantidad de números: en El Salvador son 8,
   en México 10, en España 9… Se valida justo esa cantidad, y la
   opción "Otro país" acepta cualquier número internacional. */
const PAISES = [
  { nombre: 'El Salvador', cod: '503', digitos: 8, ej: '7484 4432' },
  { nombre: 'Guatemala',   cod: '502', digitos: 8, ej: '5512 3456' },
  { nombre: 'Honduras',    cod: '504', digitos: 8, ej: '9912 3456' },
  { nombre: 'Nicaragua',   cod: '505', digitos: 8, ej: '8812 3456' },
  { nombre: 'Costa Rica',  cod: '506', digitos: 8, ej: '8312 3456' },
  { nombre: 'Panamá',      cod: '507', digitos: 8, ej: '6612 3456' },
  { nombre: 'México',      cod: '52',  digitos: 10, ej: '55 1234 5678' },
  { nombre: 'Estados Unidos', cod: '1', digitos: 10, ej: '305 123 4567' },
  { nombre: 'España',      cod: '34',  digitos: 9,  ej: '600 11 22 33' },
  { nombre: 'Otro país',   cod: '',    digitos: 0,  ej: '+57 300 123 4567' },
];

function prepararTelefono() {
  const sel = $('#paisTel');
  const campo = $('[name=phone]');
  const ayuda = $('#telAyuda');

  sel.innerHTML = PAISES.map((p, i) =>
    `<option value="${i}">${p.cod ? `${p.nombre} +${p.cod}` : p.nombre}</option>`).join('');

  const aplicar = () => {
    const p = PAISES[sel.value];
    campo.placeholder = p.ej;
    if (p.digitos) {
      campo.maxLength = p.digitos + 6;   // deja escribir espacios
      ayuda.textContent = `${p.digitos} números, sin el código de país`;
    } else {
      campo.maxLength = 22;
      ayuda.textContent = 'Escribe el número completo con el código del país';
    }
    campo.value = '';
    msg('');
  };
  sel.addEventListener('change', aplicar);
  aplicar();
}

/** Revisa que el número tenga la cantidad de dígitos de su país.
 *  Devuelve el número listo para guardar, o un aviso si está mal. */
function revisarTelefono() {
  const p = PAISES[$('#paisTel').value];
  const digitos = $('[name=phone]').value.replace(/\D/g, '');
  if (!digitos) return { error: 'Escribe tu número de teléfono.' };

  if (p.digitos) {
    if (digitos.length !== p.digitos) {
      return { error: `En ${p.nombre} el número es de ${p.digitos} números; ` +
        `escribiste ${digitos.length}.` };
    }
    return { telefono: `+${p.cod} ${digitos}` };
  }
  // Otro país: se acepta cualquier número internacional razonable
  if (digitos.length < 7 || digitos.length > 15) {
    return { error: 'Ese número no parece válido: escribe entre 7 y 15 números, con el código del país.' };
  }
  return { telefono: `+${digitos}` };
}

/* ── El teléfono solo admite números ──────────────────────────
   Se limpian las letras mientras se escribe, y se deja pasar
   "+", espacios, guiones y paréntesis, que sí se usan al escribir
   un número (+503 7484 4432). */
const soloNumeros = (input) => {
  input.setAttribute('inputmode', 'tel');
  input.addEventListener('input', () => {
    let limpio = input.value.replace(/[^\d+()\s-]/g, '');

    // Si el país tiene una cantidad fija de números, no deja escribir de más
    const p = PAISES[$('#paisTel')?.value ?? 0];
    if (p && p.digitos) {
      let vistos = 0;
      limpio = [...limpio].filter((c) => {
        if (!/\d/.test(c)) return true;
        vistos += 1;
        return vistos <= p.digitos;
      }).join('');
    }

    if (limpio !== input.value) {
      const pos = Math.max(0, input.selectionStart - (input.value.length - limpio.length));
      input.value = limpio;
      input.setSelectionRange(pos, pos);
    }
  });
};
soloNumeros($('[name=phone]'));
prepararTelefono();

/* ── Foto de referencia (se comprime antes de subirla) ────── */
$('#photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { msg('Ese archivo no es una imagen.', 'err'); return; }
  try {
    state.photo = await comprimir(file);
    $('#previewImg').src = state.photo;
    $('#preview').hidden = false;
    $('#fileBox').style.display = 'none';
    msg('');
  } catch {
    msg('No pudimos leer esa imagen. Intenta con otra.', 'err');
  }
});

$('#removePhoto').addEventListener('click', () => {
  state.photo = null;
  $('#photo').value = '';
  $('#preview').hidden = true;
  $('#fileBox').style.display = '';
});

function comprimir(file, maxLado = 1400, calidad = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', calidad));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ── Envío del formulario ─────────────────────────────────── */
function msg(text, kind = '') {
  const el = $('#formMsg');
  el.textContent = text;
  el.className = 'form-msg ' + kind;
}

$('#bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formulario = e.currentTarget;      // guardado: tras un await se pierde
  const f = new FormData(formulario);

  if (!state.date || !state.time) {
    msg('Primero elige un día y un horario en el calendario.', 'err');
    $('#agenda').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if ((f.get('name') || '').trim().length < 2) { msg('Escribe tu nombre completo.', 'err'); return; }

  const tel = revisarTelefono();
  if (tel.error) { msg(tel.error, 'err'); $('[name=phone]').focus(); return; }

  const payload = {
    name: f.get('name'), phone: tel.telefono,
    date: state.date, time: state.time,
    style: f.get('style'), bodyPart: f.get('bodyPart'),
    sizeCm: f.get('sizeCm'), notes: f.get('notes'),
    photo: state.photo,
  };

  const btn = $('#submitBtn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Apartando tu horario…';
  msg('');

  try {
    const res = await api('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    exito(res);
    limpiarFormulario();
    loadSlots(state.date);
    renderMonth();
  } catch (err) {
    msg(err.message, 'err');
    // 409 = alguien más apartó ese horario mientras llenabas el formulario
    if (err.status === 409) {
      state.time = null;
      updateChosen();
      if (err.data?.slots) paintSlots(err.data.slots);
      else loadSlots(state.date);
      renderMonth();
      $('#slots').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Confirmar cita';
  }
});

/* ── Cómo llegar: Google Maps, Waze o Mapas de iPhone ────────
   Se ofrecen las tres porque cada quien usa la suya, y las apps
   se abren solas si están instaladas en el teléfono. */
function menuComoLlegar(e) {
  if (e) e.preventDefault();
  const destino = encodeURIComponent(CFG.mapsQuery);
  const apps = [
    { nombre: 'Google Maps', icono: 'G',
      url: `https://www.google.com/maps/dir/?api=1&destination=${destino}` },
    { nombre: 'Waze', icono: 'W',
      url: `https://waze.com/ul?ll=${destino}&navigate=yes` },
    { nombre: 'Mapas de iPhone', icono: 'M',
      url: `https://maps.apple.com/?daddr=${destino}&dirflg=d` },
  ];
  abrirModal(`
    <div class="ok-badge ok-badge-soft">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>
    <h3>Cómo llegar</h3>
    <p class="muted">${escapar(CFG.address)} · ${escapar(CFG.city)}</p>
    <p class="mini" style="text-align:left;margin:14px 0 4px">Elige con qué app quieres la ruta:</p>
    <div class="modal-actions">
      ${apps.map((a) => `
        <a class="btn btn-outline btn-block ruta-app" href="${a.url}" target="_blank" rel="noopener" data-close>
          <b class="ruta-icono">${a.icono}</b><span>${a.nombre}</span>
        </a>`).join('')}
      <button class="btn btn-primary btn-block" type="button" data-close><span>Cerrar</span></button>
    </div>`);
}

/* ── Citas guardadas en este navegador ───────────────────────
   Se guarda el folio al agendar para que después baste un botón
   para ver la cita, sin tener que escribir nada.
   ─────────────────────────────────────────────────────────── */
const LLAVE = 'bedrlee_citas';

function leerFolios() {
  try { return JSON.parse(localStorage.getItem(LLAVE)) || []; }
  catch { return []; }
}
function guardarFolio(code) {
  try {
    const folios = leerFolios().filter((c) => c !== code);
    folios.unshift(code);
    localStorage.setItem(LLAVE, JSON.stringify(folios.slice(0, 10)));
  } catch { /* si el navegador no deja guardar, queda el folio del modal */ }
}
function olvidarFolio(code) {
  try { localStorage.setItem(LLAVE, JSON.stringify(leerFolios().filter((c) => c !== code))); }
  catch { /* nada que hacer */ }
}

/** Deja el formulario en blanco: datos, foto, horario elegido y avisos.
 *  Se usa al confirmar una cita, para que no queden datos de la anterior. */
function limpiarFormulario() {
  $('#bookingForm').reset();
  $('#paisTel').dispatchEvent(new Event('change'));
  state.time = null;
  state.photo = null;
  $('#photo').value = '';
  $('#preview').hidden = true;
  $('#previewImg').removeAttribute('src');
  $('#fileBox').style.display = '';
  updateChosen();
  msg('');
}

/* ── Modal de confirmación ────────────────────────────────── */
function exito(res) {
  const a = res.appointment;
  guardarFolio(res.code);
  abrirModal(`
    <button class="ok-badge ok-badge-btn" type="button" data-close aria-label="Cerrar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </button>
    <h3>¡Tu horario quedó apartado!</h3>
    <p class="muted">Nadie más puede reservar ese bloque. Tu cita <b>ya quedó guardada</b>:
      puedes cerrar esta ventana tranquilo, no se cancela.</p>
    <div class="code-box">
      <b>${res.code}</b>
      <small>Guarda este folio para consultar o cancelar tu cita</small>
    </div>
    <div class="modal-list">
      <div class="row"><span class="muted">Fecha</span><b>${bonita(a.date)}</b></div>
      <div class="row"><span class="muted">Hora</span><b>${a.time} h</b></div>
      <div class="row"><span class="muted">A nombre de</span><b>${escapar(a.name)}</b></div>
      ${a.style ? `<div class="row"><span class="muted">Estilo</span><b>${escapar(a.style)}</b></div>` : ''}
    </div>
    <p class="mini" style="text-align:left">
      Último paso: mándanos un WhatsApp para cotizar tu tatuaje. El mensaje ya va escrito
      con tus datos${a.photoUrl ? ' y el enlace de tu foto' : ''} — solo dale enviar
      (y adjunta la imagen si quieres).
    </p>
    <div class="modal-actions">
      <a class="btn btn-primary btn-block" target="_blank" rel="noopener" href="${waLink(mensajeCita({ ...a, code: res.code }, a.photoUrl))}">
        <span>Preguntar precio por WhatsApp</span>
      </a>
      <button class="btn btn-outline btn-block" type="button" data-close><span>Cerrar</span></button>
    </div>`);
}

function escapar(s) {
  return String(s).replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

function abrirModal(html) {
  $('#modalBody').innerHTML = html;
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}
function cerrarModal() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
  msg('');   // limpia el aviso rojo del formulario, si quedó alguno
}
$('#modalClose').addEventListener('click', cerrarModal);
$('#modalClose').addEventListener('touchend', (e) => { e.preventDefault(); cerrarModal(); });
$('#modal').addEventListener('click', (e) => {
  if (e.target === $('#modal') || e.target.closest('[data-close]')) cerrarModal();
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) cerrarModal(); });

/* ── Cancelar cita ────────────────────────────────────────────
   Un solo botón: busca las citas de este navegador, las muestra,
   pregunta si está seguro y se despide.
   ─────────────────────────────────────────────────────────── */
$('#cancelOpen').addEventListener('click', abrirCancelacion);

async function abrirCancelacion() {
  abrirModal('<h3>Tus citas</h3><p class="muted">Buscando…</p>');

  const folios = leerFolios();
  const citas = [];
  let sinConexion = false;

  for (const code of folios) {
    try {
      const a = await api('/api/appointments?code=' + encodeURIComponent(code));
      // Solo se olvida una cita que ya está cancelada o cuyo día pasó
      if (a.status === 'cancelada' || a.date < CFG.today) olvidarFolio(code);
      else citas.push(a);
    } catch (err) {
      // 404 = esa cita ya no existe en el servidor, se puede olvidar.
      // Cualquier otro fallo (conexión, servidor despertando) NO borra nada:
      // la cita sigue guardada y se vuelve a intentar más tarde.
      if (err.status === 404) olvidarFolio(code);
      else sinConexion = true;
    }
  }

  if (citas.length) return pantallaConfirmar(citas);
  if (sinConexion) {
    return pantallaSinCitas('No pudimos comprobar tus citas en este momento. ' +
      'Revisa tu conexión y vuelve a intentar: tu cita sigue guardada.');
  }
  pantallaSinCitas();
}

function pantallaSinCitas(aviso) {
  abrirModal(`
    <div class="ok-badge ok-badge-soft">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/><path d="M9.5 16.5h5"/></svg>
    </div>
    <h3>No tienes citas registradas</h3>
    <p class="muted">${aviso || 'No encontramos ninguna cita activa a tu nombre en este dispositivo.'}</p>
    <div class="folio-manual">
      <p class="mini" style="text-align:left;margin:0 0 8px">
        ¿Agendaste desde otro teléfono o computadora? Escribe el folio que te dimos:
      </p>
      <form id="folioForm" class="lookup-form">
        <input name="code" placeholder="Folio (ej. 4F9A2C)" maxlength="8" aria-label="Folio de la cita"
               autocapitalize="characters" autocomplete="off" spellcheck="false">
        <button class="btn btn-outline" type="submit"><span>Buscar</span></button>
      </form>
      <p class="form-msg err" id="folioMsg" role="status" aria-live="polite"></p>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary btn-block" type="button" data-close><span>Entendido</span></button>
    </div>`);

  const campoFolio = $('#folioForm input');
  campoFolio.addEventListener('input', () => {
    // el folio son 6 letras y números, nada más
    const limpio = campoFolio.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (limpio !== campoFolio.value) campoFolio.value = limpio;
    $('#folioMsg').textContent = '';
  });

  $('#folioForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = new FormData(e.currentTarget).get('code').trim().toUpperCase();
    if (!code) {
      $('#folioMsg').textContent = 'Escribe tu folio para buscar la cita.';
      campoFolio.focus();
      return;
    }
    if (code.length < 4) {
      $('#folioMsg').textContent = 'Ese folio está incompleto: son 6 letras y números.';
      campoFolio.focus();
      return;
    }
    $('#folioMsg').textContent = 'Buscando…';
    try {
      const a = await api('/api/appointments?code=' + encodeURIComponent(code));
      if (a.status === 'cancelada') return pantallaSinCitas('Esa cita ya estaba cancelada.');
      guardarFolio(a.code);
      pantallaConfirmar([a]);
    } catch (err) {
      pantallaSinCitas(err.message);
    }
  });
}

function pantallaConfirmar(citas) {
  const lista = citas.map((a) => `
    <div class="cita-box" data-code="${escapar(a.code)}">
      <div class="cita-fecha">
        <b>${bonita(a.date)}</b>
        <span>${a.time} h</span>
      </div>
      <div class="modal-list">
        <div class="row"><span class="muted">A nombre de</span><b>${escapar(a.name)}</b></div>
        <div class="row"><span class="muted">Folio</span><b>${escapar(a.code)}</b></div>
        ${a.style ? `<div class="row"><span class="muted">Estilo</span><b>${escapar(a.style)}</b></div>` : ''}
      </div>
      <button class="btn btn-danger btn-block" type="button" data-cancelar="${escapar(a.code)}">
        <span>Sí, cancelar esta cita</span>
      </button>
    </div>`).join('');

  abrirModal(`
    <h3>${citas.length > 1 ? 'Tus citas' : 'Tu cita'}</h3>
    <p class="muted">¿Seguro que quieres cancelar${citas.length > 1 ? ' esta cita' : ' tu cita'}?
      El horario quedará libre para otra persona y no se puede deshacer.</p>
    ${lista}
    <div class="modal-actions">
      <button class="btn btn-outline btn-block" type="button" data-close><span>No, conservar mi cita</span></button>
    </div>`);

}

// Un único listener para los botones de cancelar que aparezcan en el modal
$('#modalBody').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-cancelar]');
  if (!btn) return;
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Cancelando…';
  try {
    await api('/api/appointments/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: btn.dataset.cancelar }),
    });
    olvidarFolio(btn.dataset.cancelar);
    pantallaDespedida();
    if (state.date) loadSlots(state.date);
    renderMonth();
  } catch (err) {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Sí, cancelar esta cita';
    msgModal(err.message);
  }
});

function msgModal(texto) {
  const p = document.createElement('p');
  p.className = 'form-msg err';
  p.textContent = texto;
  $('#modalBody').append(p);
}

function pantallaDespedida() {
  abrirModal(`
    <button class="ok-badge ok-badge-btn" type="button" data-close aria-label="Cerrar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z"/></svg>
    </button>
    <h3>¡Espero que vuelvas pronto!</h3>
    <p class="muted">Muchas gracias. Tu cita quedó cancelada y el horario ya está libre
      para alguien más. Cuando quieras, puedes agendar de nuevo.</p>
    <div class="modal-actions">
      <a class="btn btn-primary btn-block" href="#agenda" data-close><span>Agendar otra cita</span></a>
      <button class="btn btn-outline btn-block" type="button" data-close><span>Cerrar</span></button>
    </div>`);
}
