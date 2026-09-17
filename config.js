// ─────────────────────────────────────────────────────────────
//  CONFIGURACIÓN DEL ESTUDIO
//  Cambia estos valores y se aplican en toda la página:
//  encabezado, contacto, pie de página y mensajes de WhatsApp.
// ─────────────────────────────────────────────────────────────
export const config = {
  studioName: 'bedrlee_tattoos',

  // 🖼️ IMAGEN DE PORTADA
  // Deja esto vacío y simplemente guarda tu foto en public/img/ con el nombre
  // portada.jpg (o .png / .webp): el servidor la detecta solo.
  // Si prefieres otro nombre, escríbelo aquí, por ejemplo: 'img/mi-foto.jpg'.
  heroImage: '',
  tagline: 'Tatuajes personalizados · Fine line, blackwork y geométrico',
  intro: 'Agenda tu sesión, envía tu referencia y recibe una cotización sin compromiso',

  // WhatsApp en formato internacional, solo dígitos, sin el "+".
  // 503 = El Salvador.
  whatsappNumber: '50374844432',

  // Teléfono tal como quieres que se vea en pantalla
  phoneDisplay: '+503 7484 4432',

  // Dirección tal como se lee en la página
  address: 'Bedrlee Estudio · San Isidro',
  city: 'Izalco, Sonsonate',

  // Lo que abre el mapa: coordenadas exactas del estudio
  // (13°47'19.5"N 89°33'47.8"W convertidas a decimal)
  mapsQuery: '13.78875,-89.5632778',

  instagram: 'bedrlee_tattoos',          // solo el usuario, sin @

  // Facebook: el nombre que se muestra en la página
  facebook: 'Bedr Lee',
  // Dirección del perfil. Si se deja vacía, el botón abre la búsqueda por nombre.
  facebookUrl: 'https://www.facebook.com/bedr.lee.2025',

  // Texto del horario que se muestra en la sección de contacto
  hoursText: 'Lunes a sábado · 11:00 a 20:00 h',

  // Estilos que ofreces (salen en la franja y en el formulario de citas)
  styles: ['Fine line', 'Blackwork', 'Geométrico', 'Tradicional', 'Realismo'],

  // Horario real que usa el sistema de citas
  schedule: {
    openHour: 11,
    closeHour: 20,
    slotMinutes: 60,
    closedWeekdays: [0],   // 0=domingo, 1=lunes ... 6=sábado
    maxDaysAhead: 60,
  },

  port: process.env.PORT || 3000,
  maxPhotoBytes: 6 * 1024 * 1024,
};
