/* Base de datos en la nube (Postgres).
   Se usa cuando existe la variable DATABASE_URL, o sea en internet.
   Las citas y las fotos quedan guardadas aunque el servidor se reinicie. */
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },   // los servicios en la nube lo piden
  max: 5,
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS appointments (
    id          SERIAL PRIMARY KEY,
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
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

// Misma regla que en local: la propia base impide dos citas al mismo día y hora
await pool.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_slot
    ON appointments(date, time) WHERE status <> 'cancelada'`);
await pool.query(`CREATE INDEX IF NOT EXISTS idx_date ON appointments(date)`);
await pool.query(`
  CREATE TABLE IF NOT EXISTS photos (
    id     TEXT PRIMARY KEY,
    mime   TEXT NOT NULL,
    bytes  BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

export const motor = 'postgres (en la nube)';

export const takenTimes = async (date) => {
  const { rows } = await pool.query(
    `SELECT time FROM appointments WHERE date = $1 AND status <> 'cancelada'`, [date]);
  return rows.map((r) => r.time);
};

export const takenInRange = async (from, to) => {
  const { rows } = await pool.query(
    `SELECT date, time FROM appointments
      WHERE date BETWEEN $1 AND $2 AND status <> 'cancelada'`, [from, to]);
  const mapa = {};
  for (const r of rows) (mapa[r.date] ||= []).push(r.time);
  return mapa;
};

export const createAppointment = async (a) => {
  try {
    await pool.query(
      `INSERT INTO appointments
         (name, phone, email, date, time, style, body_part, size_cm, notes, photo, code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [a.name, a.phone, a.email, a.date, a.time,
       a.style, a.bodyPart, a.sizeCm, a.notes, a.photo, a.code]);
  } catch (err) {
    // 23505 = otra persona acaba de apartar ese horario
    if (err?.code === '23505') {
      throw Object.assign(new Error('slot ocupado'), { slotTaken: true });
    }
    throw err;
  }
};

export const findByCode = async (code) => {
  const { rows } = await pool.query(`SELECT * FROM appointments WHERE code = $1`, [code]);
  return rows[0];
};

export const cancelByCode = async (code) => {
  const { rowCount } = await pool.query(
    `UPDATE appointments SET status = 'cancelada' WHERE code = $1 AND status <> 'cancelada'`, [code]);
  return rowCount > 0;
};

export const upcoming = async (fromDate) => {
  const { rows } = await pool.query(
    `SELECT * FROM appointments WHERE status <> 'cancelada' AND date >= $1
      ORDER BY date, time`, [fromDate]);
  return rows;
};

export const putPhoto = async (id, mime, bytes) => {
  await pool.query(`INSERT INTO photos (id, mime, bytes) VALUES ($1,$2,$3)`, [id, mime, bytes]);
};

export const getPhoto = async (id) => {
  const { rows } = await pool.query(`SELECT mime, bytes FROM photos WHERE id = $1`, [id]);
  return rows[0] ? { mime: rows[0].mime, bytes: rows[0].bytes } : null;
};
