// Ver las citas agendadas desde la terminal:  npm run citas
import { upcoming, motor } from './db.js';

const hoy = new Date().toLocaleDateString('en-CA');
const citas = await upcoming(hoy);

console.log(`  (datos en: ${motor})`);

if (!citas.length) {
  console.log('\n  No hay citas próximas.\n');
} else {
  console.log(`\n  ${citas.length} cita(s) a partir de hoy:\n`);
  for (const c of citas) {
    console.log(`  ${c.date}  ${c.time}  [${c.code}]  ${c.name}  ·  ${c.phone}`);
    const extra = [c.style, c.bodyPart, c.size_cm].filter(Boolean).join(' · ');
    if (extra) console.log(`        ${extra}`);
    if (c.notes) console.log(`        "${c.notes}"`);
    if (c.photo) console.log(`        foto: /uploads/${c.photo}`);
  }
  console.log('');
}

process.exit(0);
