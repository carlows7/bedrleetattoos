/* Base de datos local (un archivo en data/citas.db).
   Se usa cuando NO hay DATABASE_URL, o sea al trabajar en la computadora. */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(root, 'data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(join(DATA_DIR, 'citas.db'));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS appointments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL,
    email       TEXT,
    date        TEXT NOT NULL,
    time        TEXT NOT NULL,
    style       TEXT,
    body_part   TEXT,
    size_cm     TEXT,
    notes       TEXT,
    photo       TEXT,
    status      TEXT NOT NULL DEFAULT 'reservada',
    code        TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Impide que dos personas aparten el mismo día y hora
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_slot
    ON appointments(date, time) WHERE status <> 'cancelada';

  CREATE INDEX IF NOT EXISTS idx_date ON appointments(date);

  CREATE TABLE IF NOT EXISTS photos (
    id     TEXT PRIMARY KEY,
    mime   TEXT NOT NULL,
    bytes  BLOB NOT NULL
  );
`);

const st = {
  taken: db.prepare(`SELECT time FROM appointments WHERE date = ? AND status <> 'cancelada'`),
  range: db.prepare(`SELECT date, time FROM appointments WHERE date BETWEEN ? AND ? AND status <> 'cancelada'`),
  insert: db.prepare(`INSERT INTO appointments
    (name, phone, email, date, time, style, body_part, size_cm, notes, photo, code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  byCode: db.prepare(`SELECT * FROM appointments WHERE code = ?`),
  cancel: db.prepare(`UPDATE appointments SET status = 'cancelada' WHERE code = ? AND status <> 'cancelada'`),
  next: db.prepare(`SELECT * FROM appointments WHERE status <> 'cancelada' AND date >= ? ORDER BY date, time`),
  putPhoto: db.prepare(`INSERT INTO photos (id, mime, bytes) VALUES (?, ?, ?)`),
  getPhoto: db.prepare(`SELECT mime, bytes FROM photos WHERE id = ?`),
};

export const motor = 'sqlite (archivo local)';
export const takenTimes = async (date) => st.taken.all(date).map((r) => r.time);

export const takenInRange = async (from, to) => {
  const mapa = {};
  for (const r of st.range.all(from, to)) (mapa[r.date] ||= []).push(r.time);
  return mapa;
};

export const createAppointment = async (a) => {
  try {
    st.insert.run(a.name, a.phone, a.email || '', a.date, a.time,
      a.style, a.bodyPart, a.sizeCm, a.notes, a.photo, a.code);
  } catch (err) {
    if (String(err?.message || '').includes('UNIQUE constraint failed')) {
      throw Object.assign(new Error('slot ocupado'), { slotTaken: true });
    }
    throw err;
  }
};

export const findByCode = async (code) => st.byCode.get(code);
export const cancelByCode = async (code) => st.cancel.run(code).changes > 0;
export const upcoming = async (fromDate) => st.next.all(fromDate);
export const putPhoto = async (id, mime, bytes) => { st.putPhoto.run(id, mime, bytes); };
export const getPhoto = async (id) => {
  const row = st.getPhoto.get(id);
  return row ? { mime: row.mime, bytes: Buffer.from(row.bytes) } : null;
};
