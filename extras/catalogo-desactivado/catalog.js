// Catálogo de diseños. Para añadir uno nuevo: copia un bloque,
// pon tu imagen en public/img/ y actualiza la ruta de "image".
export const catalog = [
  { id: 'mandala',   title: 'Mandala Solar',      style: 'Geométrico', size: 'Mediano (12–18 cm)', zone: 'Antebrazo · Muslo', hours: '3–4 h', from: 2800, image: 'img/mandala.svg',
    description: 'Simetría radial construida a compás, con relleno de puntillismo en los pétalos interiores.' },
  { id: 'serpiente', title: 'Serpiente Lunar',    style: 'Blackwork',  size: 'Grande (25–35 cm)',  zone: 'Brazo completo · Espalda', hours: '5–7 h', from: 5200, image: 'img/serpiente.svg',
    description: 'Cuerpo ondulante con escamas trabajadas a línea fina y sombreado suave en la cabeza.' },
  { id: 'luna',      title: 'Fases de Luna',      style: 'Fine line',  size: 'Mediano (10–15 cm)', zone: 'Columna · Costillas', hours: '2–3 h', from: 2200, image: 'img/luna.svg',
    description: 'Creciente principal acompañada de constelación en trazo mínimo. Ideal para primer tatuaje.' },
  { id: 'ojo',       title: 'Ojo Místico',        style: 'Blackwork',  size: 'Mediano (14–20 cm)', zone: 'Pecho · Antebrazo', hours: '4–5 h', from: 3600, image: 'img/ojo.svg',
    description: 'Iris con rayos radiales y marco triangular. Fuerte contraste de negros sólidos.' },
  { id: 'paisaje',   title: 'Horizonte',          style: 'Fine line',  size: 'Mediano (12–16 cm)', zone: 'Antebrazo · Gemelo', hours: '3–4 h', from: 3000, image: 'img/paisaje.svg',
    description: 'Montañas, mar y luna encerrados en círculo. Composición limpia con mucho aire.' },
  { id: 'rosa',      title: 'Rosa Geométrica',    style: 'Geométrico', size: 'Mediano (12–18 cm)', zone: 'Hombro · Muslo', hours: '3–5 h', from: 3200, image: 'img/rosa.svg',
    description: 'Pétalos construidos por capas concéntricas; el tallo se adapta a la anatomía.' },
  { id: 'mariposa',  title: 'Mariposa Simétrica', style: 'Fine line',  size: 'Pequeño (8–12 cm)',  zone: 'Nuca · Tobillo', hours: '2–3 h', from: 1900, image: 'img/mariposa.svg',
    description: 'Alas con detalle ornamental y cuerpo sólido. Delicada, de líneas muy finas.' },
  { id: 'daga',      title: 'Daga Ornamental',    style: 'Tradicional',size: 'Mediano (15–22 cm)', zone: 'Antebrazo · Pantorrilla', hours: '4–5 h', from: 3400, image: 'img/daga.svg',
    description: 'Hoja recta con empuñadura labrada y volutas laterales. Clásico reinterpretado.' },
];

export const styles = [...new Set(catalog.map((t) => t.style))];
