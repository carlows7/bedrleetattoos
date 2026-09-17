/* ═══════════════════════════════════════════════════════════
   Panel del estudio · bedrlee_tattoos
   ═══════════════════════════════════════════════════════════ */
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const LLAVE_PASE = 'bedrlee_pase';
const pase = () => { try { return localStorage.getItem(LLAVE_PASE) || ''; } catch { return ''; } };

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const bonita = (f) => {
  const [y, m, d] = f.split('-').map(Number);
  return `${DIAS[new Date(y, m - 1, d).getDay()].toLowerCase()} ${d} de ${MESES[m - 1]}`;
};

function escapar(s) {
  return String(s ?? '').replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

/** Llama a la API del panel llevando el pase; si caducó, pide entrar de nuevo. */
async function api(ruta, opciones = {}) {
  const r = await fetch(ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + pase(), ...opciones.headers },
  });
  const datos = await r.json().catch(() => ({}));
  if (r.status === 401) { salir(); throw new Error(datos.error || 'Entra de nuevo.'); }
  if (!r.ok) throw Object.assign(new Error(datos.error || 'Algo salió mal.'), { status: r.status });
  return datos;
}

const aviso = (el, texto, tipo = '') => {
  const p = $(el);
  p.textContent = texto;
  p.className = 'form-msg ' + tipo;
};

/* ── Entrar y salir ───────────────────────────────────────── */
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const clave = new FormData(form).get('password');
  aviso('#loginMsg', 'Comprobando…');
  try {
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: clave }),
    });
    const datos = await r.json();
    if (!r.ok) { aviso('#loginMsg', datos.error, 'err'); return; }
    try { localStorage.setItem(LLAVE_PASE, datos.pase); } catch { /* sin guardar */ }
    form.reset();
    aviso('#loginMsg', '');
    abrirPanel();
  } catch {
    aviso('#loginMsg', 'No pudimos conectar con el servidor.', 'err');
  }
});

function salir() {
  try { localStorage.removeItem(LLAVE_PASE); } catch { /* nada */ }
  $('#panel').hidden = true;
  $('#login').hidden = false;
}
$('#salir').addEventListener('click', salir);

/* ── Panel ────────────────────────────────────────────────── */
async function abrirPanel() {
  $('#login').hidden = true;
  $('#panel').hidden = false;
  await Promise.all([cargarCitas(), cargarAjustes()]);
}

async function cargarCitas() {
  try {
    const { appointments } = await api('/api/admin/appointments');
    $('#resumen').textContent = appointments.length
      ? `${appointments.length} cita(s) próximas`
      : 'Sin citas próximas';

    if (!appointments.length) {
      $('#citas').innerHTML = '<p class="muted">Todavía no hay citas agendadas.</p>';
      return;
    }

    $('#citas').innerHTML = `<div class="citas-lista">${appointments.map((c) => `
      <article class="cita">
        <div class="cita-cab">
          <b>${bonita(c.date)}</b>
          <span class="cita-hora">${escapar(c.time)} h</span>
        </div>
        <p class="cita-nombre">${escapar(c.name)}</p>
        <a class="cita-tel" href="https://wa.me/${escapar(c.phone).replace(/\D/g, '')}"
           target="_blank" rel="noopener">${escapar(c.phone)}</a>
        <div class="cita-datos">
          ${c.style ? `<span>${escapar(c.style)}</span>` : ''}
          ${c.body_part ? `<span>${escapar(c.body_part)}</span>` : ''}
          ${c.size_cm ? `<span>${escapar(c.size_cm)}</span>` : ''}
          <span class="folio">${escapar(c.code)}</span>
        </div>
        ${c.notes ? `<p class="cita-nota">${escapar(c.notes)}</p>` : ''}
        ${c.photoUrl ? `<a class="cita-foto" href="${c.photoUrl}" target="_blank" rel="noopener">
             <img src="${c.photoUrl}" alt="Referencia de ${escapar(c.name)}" loading="lazy"></a>` : ''}
      </article>`).join('')}</div>`;
  } catch (err) {
    $('#citas').innerHTML = `<p class="muted">${escapar(err.message)}</p>`;
  }
}

async function cargarAjustes() {
  try {
    const { horario, cerrados, hoy } = await api('/api/admin/ajustes');
    pintarHorario(horario);
    pintarCerrados(cerrados);
    $('[name=date]', $('#cerrarForm')).min = hoy;
  } catch (err) {
    aviso('#horarioMsg', err.message, 'err');
  }
}

function pintarHorario(h) {
  const form = $('#horarioForm');
  const horas = (desde, hasta) => Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i)
    .map((n) => `<option value="${n}">${String(n).padStart(2, '0')}:00</option>`).join('');
  form.openHour.innerHTML = horas(6, 22);
  form.closeHour.innerHTML = horas(7, 24);
  form.openHour.value = h.openHour;
  form.closeHour.value = h.closeHour;
  form.slotMinutes.value = h.slotMinutes;
  form.maxDaysAhead.value = h.maxDaysAhead;

  $('#diasSemana').innerHTML = DIAS.map((nombre, i) => `
    <label class="dia-check">
      <input type="checkbox" value="${i}" ${h.closedWeekdays.includes(i) ? 'checked' : ''}>
      <span>${nombre}</span>
    </label>`).join('');
}

$('#horarioForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const cerradosSemana = $$('#diasSemana input:checked').map((c) => Number(c.value));
  aviso('#horarioMsg', 'Guardando…');
  try {
    await api('/api/admin/horario', {
      method: 'PUT',
      body: JSON.stringify({
        openHour: Number(form.openHour.value),
        closeHour: Number(form.closeHour.value),
        slotMinutes: Number(form.slotMinutes.value),
        maxDaysAhead: Number(form.maxDaysAhead.value),
        closedWeekdays: cerradosSemana,
      }),
    });
    aviso('#horarioMsg', 'Horario guardado. Ya se ve así en la página.', 'ok');
  } catch (err) {
    aviso('#horarioMsg', err.message, 'err');
  }
});

/* ── Días cerrados ────────────────────────────────────────── */
function pintarCerrados(dias) {
  if (!dias.length) {
    $('#listaCerrados').innerHTML = '<p class="muted">No hay ningún día cerrado por ahora.</p>';
    return;
  }
  $('#listaCerrados').innerHTML = `<ul class="cerrados">${dias.map((d) => `
    <li>
      <div>
        <b>${bonita(d.date)}</b>
        ${d.motivo ? `<small>${escapar(d.motivo)}</small>` : ''}
      </div>
      <button class="btn btn-outline btn-sm" type="button" data-abrir="${escapar(d.date)}">
        <span>Volver a abrir</span>
      </button>
    </li>`).join('')}</ul>`;
}

$('#cerrarForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const f = new FormData(form);
  aviso('#cerrarMsg', 'Guardando…');
  try {
    const r = await api('/api/admin/dias-cerrados', {
      method: 'POST',
      body: JSON.stringify({ date: f.get('date'), motivo: f.get('motivo') }),
    });
    form.reset();
    await cargarAjustes();
    aviso('#cerrarMsg', r.citasEseDia
      ? `Día cerrado. Ojo: ya tenías ${r.citasEseDia} cita(s) ese día; avísales tú.`
      : 'Día cerrado. Nadie podrá agendar ahí.', r.citasEseDia ? 'err' : 'ok');
  } catch (err) {
    aviso('#cerrarMsg', err.message, 'err');
  }
});

$('#listaCerrados').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-abrir]');
  if (!btn) return;
  btn.disabled = true;
  try {
    await api('/api/admin/dias-cerrados/' + encodeURIComponent(btn.dataset.abrir), { method: 'DELETE' });
    await cargarAjustes();
    aviso('#cerrarMsg', 'Ese día vuelve a estar disponible.', 'ok');
  } catch (err) {
    btn.disabled = false;
    aviso('#cerrarMsg', err.message, 'err');
  }
});

/* ── Al abrir la página ───────────────────────────────────── */
if (pase()) abrirPanel().catch(salir);
