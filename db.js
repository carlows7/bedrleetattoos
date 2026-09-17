/* Elige dónde se guardan las citas:
   · con DATABASE_URL  → Postgres en la nube (la página publicada)
   · sin DATABASE_URL  → un archivo local (tu computadora)
   Las dos versiones ofrecen exactamente las mismas funciones. */
const enLaNube = Boolean(process.env.DATABASE_URL);

const impl = enLaNube
  ? await import('./db-postgres.js')
  : await import('./db-sqlite.js');

export const {
  motor, takenTimes, takenInRange, createAppointment,
  findByCode, cancelByCode, upcoming, putPhoto, getPhoto,
  leerAjuste, guardarAjuste, diasCerrados, cerrarDia, abrirDia,
} = impl;
