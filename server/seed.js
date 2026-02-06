/**
 * Seed de datos inicial con anuncios famosos reales
 * Ejecutar con: node server/seed.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../database.sqlite');

// Helper para obtener thumbnail de YouTube
const ytThumb = (videoId) => `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
const ytUrl = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;

// ============ DATOS DE SEED ============

// Anuncios icónicos de YouTube por marca
const YOUTUBE_ADS = [
  // NIKE
  {
    brand: 'Nike',
    title: 'Dream Crazy ft. Colin Kaepernick',
    videoId: 'WW2yKSt2C8A',
    year: 2018,
    description: 'Believe in something. Even if it means sacrificing everything. Narrado por Colin Kaepernick.',
    tags: ['deportes', 'inspirador', 'spot-tv', 'celebrity', 'actual', 'branding'],
  },
  {
    brand: 'Nike',
    title: 'You Can\'t Stop Us',
    videoId: 'WA4dDs0T7sM',
    year: 2020,
    description: 'Split-screen de atletas mostrando la unidad del deporte. Ganador de múltiples premios.',
    tags: ['deportes', 'emocional', 'spot-tv', 'live-action', 'actual', 'branding'],
  },
  {
    brand: 'Nike',
    title: 'Find Your Greatness',
    videoId: 'WYP9AGtLvRg',
    year: 2012,
    description: 'La grandeza no es solo para unos pocos elegidos. Londres 2012.',
    tags: ['deportes', 'inspirador', 'spot-tv', 'live-action', '2010s', 'branding'],
  },
  {
    brand: 'Nike',
    title: 'Write The Future',
    videoId: '7Yk3CGYPgQI',
    year: 2010,
    description: 'Épico spot del Mundial 2010 con Ronaldo, Rooney, Cannavaro y más.',
    tags: ['deportes', 'emocional', 'spot-tv', 'celebrity', '2010s', 'branding'],
  },
  {
    brand: 'Nike',
    title: 'Winner Stays',
    videoId: '3XviR7esUvo',
    year: 2014,
    description: 'Niños que se transforman en estrellas del fútbol. Ronaldo, Neymar, Rooney.',
    tags: ['deportes', 'humor', 'spot-tv', 'celebrity', '2010s', 'engagement'],
  },

  // APPLE
  {
    brand: 'Apple',
    title: '1984 - Macintosh',
    videoId: 'VtvjbmoDx-I',
    year: 1984,
    description: 'El anuncio más famoso de la historia. Dirigido por Ridley Scott. Super Bowl XVIII.',
    tags: ['tecnologia', 'provocador', 'spot-tv', 'live-action', 'vintage', 'lanzamiento'],
  },
  {
    brand: 'Apple',
    title: 'Think Different',
    videoId: 'cFEarBzelBs',
    year: 1997,
    description: 'Here\'s to the crazy ones. Narrado por Steve Jobs (versión original).',
    tags: ['tecnologia', 'inspirador', 'spot-tv', 'live-action', 'retro-90s', 'branding'],
  },
  {
    brand: 'Apple',
    title: 'Get a Mac - I\'m a Mac, I\'m a PC',
    videoId: 'qfv6Ah_MVJU',
    year: 2006,
    description: 'Campaña icónica comparando Mac vs PC con John Hodgman y Justin Long.',
    tags: ['tecnologia', 'humor', 'spot-tv', 'live-action', '2000s', 'performance'],
  },
  {
    brand: 'Apple',
    title: 'Shot on iPhone - Snowbrawl',
    videoId: 'H5pcoL1gU-A',
    year: 2024,
    description: 'Épica batalla de bolas de nieve filmada completamente con iPhone.',
    tags: ['tecnologia', 'emocional', 'spot-tv', 'live-action', 'actual', 'branding'],
  },
  {
    brand: 'Apple',
    title: 'The Underdogs - Apple at Work',
    videoId: 'G6qVBz6qz9Q',
    year: 2019,
    description: 'Serie cómica sobre un equipo usando productos Apple en el trabajo.',
    tags: ['tecnologia', 'humor', 'video-largo', 'live-action', 'actual', 'engagement'],
  },

  // COCA-COLA
  {
    brand: 'Coca-Cola',
    title: 'Hilltop - I\'d Like to Buy the World a Coke',
    videoId: '1VM2eLhvsSM',
    year: 1971,
    description: 'Uno de los anuncios más influyentes de la historia de la publicidad.',
    tags: ['alimentacion', 'emocional', 'spot-tv', 'live-action', 'vintage', 'branding'],
  },
  {
    brand: 'Coca-Cola',
    title: 'Holidays Are Coming (Camiones Navidad)',
    videoId: 'tDKFLDRPLuw',
    year: 1995,
    description: 'El icónico anuncio de los camiones de Coca-Cola en Navidad.',
    tags: ['alimentacion', 'emocional', 'spot-tv', 'live-action', 'retro-90s', 'awareness'],
  },
  {
    brand: 'Coca-Cola',
    title: 'Open Happiness',
    videoId: 'IBDo11a-d5c',
    year: 2009,
    description: 'Happiness Factory - El mundo mágico dentro de una máquina de Coca-Cola.',
    tags: ['alimentacion', 'emocional', 'spot-tv', 'animacion', '2000s', 'branding'],
  },
  {
    brand: 'Coca-Cola',
    title: 'Share a Coke',
    videoId: 'AaUGibbwgqE',
    year: 2014,
    description: 'La campaña que puso nombres en las botellas. Fenómeno global.',
    tags: ['alimentacion', 'emocional', 'spot-tv', 'live-action', '2010s', 'engagement'],
  },

  // McDONALD'S
  {
    brand: 'McDonald\'s',
    title: 'Raise Your Arches',
    videoId: '9_mHEEfHIIw',
    year: 2023,
    description: 'Sin palabras, sin logo, solo cejas. Grand Prix en Cannes 2023.',
    tags: ['alimentacion', 'humor', 'spot-tv', 'live-action', 'actual', 'branding'],
  },
  {
    brand: 'McDonald\'s',
    title: 'The Showdown - Larry Bird vs Michael Jordan',
    videoId: '1shK-j_u6LI',
    year: 1993,
    description: 'Nothing but net. Icónico duelo de tiros imposibles por un Big Mac.',
    tags: ['alimentacion', 'humor', 'spot-tv', 'celebrity', 'retro-90s', 'engagement'],
  },
  {
    brand: 'McDonald\'s',
    title: 'I\'m Lovin\' It - Justin Timberlake',
    videoId: 'dI-xHMM8wXE',
    year: 2003,
    description: 'Lanzamiento del jingle más reconocible del mundo.',
    tags: ['alimentacion', 'juvenil', 'spot-tv', 'celebrity', '2000s', 'branding'],
  },

  // SAMSUNG
  {
    brand: 'Samsung',
    title: 'The Next Big Thing',
    videoId: 'nf5-Prx19ZM',
    year: 2011,
    description: 'Campaña burlándose de las colas de Apple. Galaxy vs iPhone.',
    tags: ['tecnologia', 'humor', 'spot-tv', 'live-action', '2010s', 'performance'],
  },
  {
    brand: 'Samsung',
    title: 'Galaxy: A New satisfying satisfying video every day',
    videoId: 'pkPF0lQJHmA',
    year: 2021,
    description: 'Campaña ASMR con videos satisfactorios del Galaxy.',
    tags: ['tecnologia', 'minimalista', 'reel', 'mixed-media', 'actual', 'engagement'],
  },

  // GOOGLE
  {
    brand: 'Google',
    title: 'Parisian Love',
    videoId: 'nnsSUqgkDwU',
    year: 2010,
    description: 'Una historia de amor contada solo con búsquedas de Google. Super Bowl.',
    tags: ['tecnologia', 'emocional', 'spot-tv', 'mixed-media', '2010s', 'branding'],
  },
  {
    brand: 'Google',
    title: 'Year in Search 2023',
    videoId: 'XAyPVjl5qNw',
    year: 2023,
    description: 'Resumen emocional del año a través de las búsquedas de Google.',
    tags: ['tecnologia', 'emocional', 'spot-tv', 'mixed-media', 'actual', 'branding'],
  },
  {
    brand: 'Google',
    title: 'Loretta',
    videoId: 'gHGDN9-oFJE',
    year: 2020,
    description: 'Un hombre mayor usa Google Assistant para recordar a su esposa. Super Bowl.',
    tags: ['tecnologia', 'emocional', 'spot-tv', 'live-action', 'actual', 'branding'],
  },

  // AMAZON
  {
    brand: 'Amazon',
    title: 'Alexa Loses Her Voice',
    videoId: 'J6-8DQALGt4',
    year: 2018,
    description: 'Super Bowl ad con Gordon Ramsay, Cardi B y más reemplazando a Alexa.',
    tags: ['tecnologia', 'humor', 'spot-tv', 'celebrity', 'actual', 'branding'],
  },
  {
    brand: 'Amazon',
    title: 'The Show Must Go On',
    videoId: 'Ej1dPvZBq-0',
    year: 2020,
    description: 'Una bailarina sigue su sueño durante la pandemia. Muy emotivo.',
    tags: ['entretenimiento', 'emocional', 'spot-tv', 'live-action', 'actual', 'branding'],
  },

  // MERCEDES-BENZ
  {
    brand: 'Mercedes-Benz',
    title: 'Sorry',
    videoId: 'vQdKwkyARJQ',
    year: 2015,
    description: 'Un niño se disculpa por el futuro donde no habrá accidentes. Tecnología de seguridad.',
    tags: ['automocion', 'emocional', 'spot-tv', 'live-action', '2010s', 'branding'],
  },
  {
    brand: 'Mercedes-Benz',
    title: 'The Journey - Bertha Benz',
    videoId: 'qPLr6k3OIKQ',
    year: 2019,
    description: 'Historia real de Bertha Benz, la primera persona en hacer un viaje largo en coche.',
    tags: ['automocion', 'inspirador', 'spot-tv', 'live-action', 'actual', 'branding'],
  },

  // BMW
  {
    brand: 'BMW',
    title: 'The Hire - Ambush (Clive Owen)',
    videoId: 'vdYPQJ4K5kQ',
    year: 2001,
    description: 'Cortometraje de la serie "The Hire" con Clive Owen. Dirigido por John Frankenheimer.',
    tags: ['automocion', 'serio', 'video-largo', 'live-action', '2000s', 'branding'],
  },
  {
    brand: 'BMW',
    title: 'The Ultimate Reem',
    videoId: 'JyBoZEJ8FEY',
    year: 2023,
    description: 'BMW trolleando a Mercedes por usar Keke Palmer en su anuncio.',
    tags: ['automocion', 'humor', 'reel', 'live-action', 'actual', 'engagement'],
  },

  // ADIDAS
  {
    brand: 'Adidas',
    title: 'Impossible is Nothing - Muhammad Ali',
    videoId: 'oTG9OvVoiEE',
    year: 2004,
    description: 'Impossible is nothing. Campaña icónica con leyendas del deporte.',
    tags: ['deportes', 'inspirador', 'spot-tv', 'celebrity', '2000s', 'branding'],
  },
  {
    brand: 'Adidas',
    title: 'Original is Never Finished',
    videoId: 'ioL8siLw_8A',
    year: 2017,
    description: 'Remix cultural con Frank Sinatra y nuevos talentos. Muy premiado.',
    tags: ['moda', 'provocador', 'spot-tv', 'mixed-media', '2010s', 'branding'],
  },
  {
    brand: 'Adidas',
    title: 'Take It - Messi',
    videoId: 'yPoqDrLSKm4',
    year: 2023,
    description: 'Messi después de ganar el Mundial. Emotivo.',
    tags: ['deportes', 'emocional', 'spot-tv', 'celebrity', 'actual', 'branding'],
  },
];

// Referencias de Cannes Lions y Ads of the World
const CLASSIC_ADS = [
  {
    title: 'Dumb Ways to Die',
    brand: 'Metro Trains Melbourne',
    year: 2012,
    description: 'La campaña de seguridad más viral de la historia. Grand Prix en Cannes.',
    url: 'https://www.youtube.com/watch?v=IJNR2EpS0jw',
    thumbnail: ytThumb('IJNR2EpS0jw'),
    tags: ['educacion', 'humor', 'spot-tv', 'animacion', '2010s', 'awareness'],
    source: 'lovetheworkmore',
  },
  {
    title: 'The Epic Split - Volvo Trucks',
    brand: 'Volvo',
    year: 2013,
    description: 'Jean-Claude Van Damme haciendo un split entre dos camiones. Viral épico.',
    url: 'https://www.youtube.com/watch?v=M7FIvfx5J10',
    thumbnail: ytThumb('M7FIvfx5J10'),
    tags: ['automocion', 'inspirador', 'spot-tv', 'celebrity', '2010s', 'branding'],
    source: 'lovetheworkmore',
  },
  {
    title: 'Real Beauty Sketches',
    brand: 'Dove',
    year: 2013,
    description: 'Mujeres descritas por ellas vs por extraños. Campaña Real Beauty.',
    url: 'https://www.youtube.com/watch?v=XpaOjMXyJGk',
    thumbnail: ytThumb('XpaOjMXyJGk'),
    tags: ['belleza', 'emocional', 'spot-tv', 'live-action', '2010s', 'branding'],
    source: 'lovetheworkmore',
  },
  {
    title: 'Like a Girl',
    brand: 'Always',
    year: 2014,
    description: 'Redefiniendo lo que significa hacer algo "como una niña". Super Bowl.',
    url: 'https://www.youtube.com/watch?v=XjJQBjWYDTs',
    thumbnail: ytThumb('XjJQBjWYDTs'),
    tags: ['belleza', 'emocional', 'spot-tv', 'live-action', '2010s', 'branding'],
    source: 'lovetheworkmore',
  },
  {
    title: 'Fearless Girl',
    brand: 'State Street Global',
    year: 2017,
    description: 'Estatua de niña enfrentando al toro de Wall Street. Grand Prix en Cannes.',
    url: 'https://www.adsoftheworld.com/campaigns/fearless-girl',
    thumbnail: 'https://images.adsoftheworld.com/media/aod/93/46/93467f86_ff59_42dc_b1b6_d48e6e3aa2a0.jpg',
    tags: ['finanzas', 'provocador', 'outdoor', 'live-action', '2010s', 'awareness'],
    source: 'adsoftheworld',
  },
  {
    title: 'The Man Your Man Could Smell Like',
    brand: 'Old Spice',
    year: 2010,
    description: 'Isaiah Mustafa revolucionando la publicidad de productos masculinos.',
    url: 'https://www.youtube.com/watch?v=owGykVbfgUE',
    thumbnail: ytThumb('owGykVbfgUE'),
    tags: ['belleza', 'humor', 'spot-tv', 'live-action', '2010s', 'branding'],
    source: 'lovetheworkmore',
  },
  {
    title: 'Whopper Detour',
    brand: 'Burger King',
    year: 2018,
    description: 'Pide un Whopper por 1 centavo... si estás cerca de un McDonald\'s.',
    url: 'https://www.youtube.com/watch?v=X8nLsYPatFQ',
    thumbnail: ytThumb('X8nLsYPatFQ'),
    tags: ['alimentacion', 'provocador', 'spot-tv', 'mixed-media', 'actual', 'performance'],
    source: 'lovetheworkmore',
  },
  {
    title: 'Moldy Whopper',
    brand: 'Burger King',
    year: 2020,
    description: 'Un Whopper pudriéndose para mostrar que no tiene conservantes. Controversial y premiado.',
    url: 'https://www.youtube.com/watch?v=BqJYjGfHf_0',
    thumbnail: ytThumb('BqJYjGfHf_0'),
    tags: ['alimentacion', 'provocador', 'print', 'fotografia', 'actual', 'branding'],
    source: 'lovetheworkmore',
  },
  {
    title: 'The Uncensored Playlist',
    brand: 'Reporters Without Borders',
    year: 2018,
    description: 'Artículos censurados convertidos en canciones en Spotify. Grand Prix.',
    url: 'https://www.adsoftheworld.com/campaigns/the-uncensored-playlist',
    thumbnail: 'https://assets.adsoftheworld.com/media/aod/6e/2b/6e2bb1cc_d2b3_43d7_9f3f_d7f7e4c8e5d5.jpg',
    tags: ['educacion', 'provocador', 'banner', 'mixed-media', 'actual', 'awareness'],
    source: 'adsoftheworld',
  },
  {
    title: 'It\'s a Tide Ad',
    brand: 'Tide',
    year: 2018,
    description: 'David Harbour convierte cada anuncio del Super Bowl en un anuncio de Tide.',
    url: 'https://www.youtube.com/watch?v=IIW3l-ENHdA',
    thumbnail: ytThumb('IIW3l-ENHdA'),
    tags: ['hogar', 'humor', 'spot-tv', 'celebrity', 'actual', 'branding'],
    source: 'lovetheworkmore',
  },
  {
    title: 'Womb Stories',
    brand: 'Bodyform',
    year: 2020,
    description: 'Tabúes del cuerpo femenino. Abortos, endometriosis, menopausia. Muy premiado.',
    url: 'https://www.youtube.com/watch?v=JZoFqIxlbk0',
    thumbnail: ytThumb('JZoFqIxlbk0'),
    tags: ['salud', 'emocional', 'spot-tv', 'live-action', 'actual', 'branding'],
    source: 'lovetheworkmore',
  },
  {
    title: 'Coins',
    brand: 'IKEA',
    year: 2020,
    description: 'Precios de IKEA en monedas gigantes. Publicidad exterior creativa.',
    url: 'https://www.adsoftheworld.com/campaigns/coins-e3bc92cf-8847-4e98-a932-2c7a1e0e9fa9',
    thumbnail: 'https://assets.adsoftheworld.com/media/aod/d3/5e/d35e76a7_9ede_43f6_b3a2_7f3cf8e4b6c1.jpg',
    tags: ['hogar', 'minimalista', 'outdoor', 'fotografia', 'actual', 'performance'],
    source: 'adsoftheworld',
  },
  {
    title: 'The Last Photo',
    brand: 'Calm',
    year: 2019,
    description: 'Fotos sonrientes de personas que se quitaron la vida días después. Salud mental.',
    url: 'https://www.youtube.com/watch?v=IgS-lloxD2A',
    thumbnail: ytThumb('IgS-lloxD2A'),
    tags: ['salud', 'emocional', 'spot-tv', 'fotografia', 'actual', 'awareness'],
    source: 'lovetheworkmore',
  },
  {
    title: 'Evan',
    brand: 'Sandy Hook Promise',
    year: 2016,
    description: 'Historia de amor adolescente con un final impactante sobre tiroteos escolares.',
    url: 'https://www.youtube.com/watch?v=A8syQeFtBKc',
    thumbnail: ytThumb('A8syQeFtBKc'),
    tags: ['educacion', 'emocional', 'spot-tv', 'live-action', '2010s', 'awareness'],
    source: 'lovetheworkmore',
  },
  {
    title: 'Dream Crazier',
    brand: 'Nike',
    year: 2019,
    description: 'Serena Williams narrando sobre mujeres en el deporte. Oscar nominee.',
    url: 'https://www.youtube.com/watch?v=whpJ19RJ4JY',
    thumbnail: ytThumb('whpJ19RJ4JY'),
    tags: ['deportes', 'inspirador', 'spot-tv', 'celebrity', 'actual', 'branding'],
    source: 'lovetheworkmore',
  },
];

// ============ FUNCIONES DE SEED ============

async function seed() {
  console.log('Iniciando seed de datos...\n');

  const SQL = await initSqlJs();
  let db;

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    console.log('Base de datos no encontrada. Ejecuta primero el servidor.');
    process.exit(1);
  }

  const runExec = (sql, params = []) => {
    db.run(sql, params);
  };

  const runQuery = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  };

  // Verificar que existen las tablas necesarias
  try {
    runQuery('SELECT 1 FROM brands LIMIT 1');
  } catch (e) {
    console.log('Tablas no inicializadas. Ejecuta primero el servidor.');
    process.exit(1);
  }

  // 1. Crear marcas
  console.log('Creando marcas...');
  const brandNames = [...new Set(YOUTUBE_ADS.map(a => a.brand))];

  for (const name of brandNames) {
    const existing = runQuery('SELECT id FROM brands WHERE name = ?', [name]);
    if (existing.length === 0) {
      const brandId = uuidv4();
      runExec('INSERT INTO brands (id, name) VALUES (?, ?)', [brandId, name]);
      console.log(`  + ${name}`);
    }
  }

  // 2. Insertar anuncios de YouTube como referencias
  console.log('\nInsertando anuncios de YouTube...');
  let ytAdded = 0;

  for (const ad of YOUTUBE_ADS) {
    const url = ytUrl(ad.videoId);
    const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [url]);

    if (existing.length === 0) {
      const id = uuidv4();
      runExec(`
        INSERT INTO references_ads (id, title, description, type, url, thumbnail, brand, year, source)
        VALUES (?, ?, ?, 'video', ?, ?, ?, ?, 'youtube')
      `, [id, ad.title, ad.description, url, ytThumb(ad.videoId), ad.brand, ad.year]);

      // Añadir tags
      for (const tagName of ad.tags) {
        const tagResult = runQuery('SELECT id FROM tags WHERE name = ?', [tagName]);
        if (tagResult.length > 0) {
          runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [id, tagResult[0].id]);
        }
      }

      ytAdded++;
      console.log(`  + ${ad.brand}: ${ad.title}`);
    }
  }
  console.log(`  Total: ${ytAdded} anuncios de YouTube añadidos`);

  // 3. Insertar referencias clásicas
  console.log('\nInsertando referencias clásicas (Cannes, AotW)...');
  let classicAdded = 0;

  for (const ad of CLASSIC_ADS) {
    const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [ad.url]);

    if (existing.length === 0) {
      const id = uuidv4();
      runExec(`
        INSERT INTO references_ads (id, title, description, type, url, thumbnail, brand, year, source)
        VALUES (?, ?, ?, 'video', ?, ?, ?, ?, ?)
      `, [id, ad.title, ad.description, ad.url, ad.thumbnail, ad.brand, ad.year, ad.source]);

      // Añadir tags
      for (const tagName of ad.tags) {
        const tagResult = runQuery('SELECT id FROM tags WHERE name = ?', [tagName]);
        if (tagResult.length > 0) {
          runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [id, tagResult[0].id]);
        }
      }

      classicAdded++;
      console.log(`  + ${ad.brand}: ${ad.title}`);
    }
  }
  console.log(`  Total: ${classicAdded} referencias clásicas añadidas`);

  // Guardar base de datos
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  console.log('\n========================================');
  console.log('Seed completado!');
  console.log(`  - ${ytAdded} anuncios de YouTube`);
  console.log(`  - ${classicAdded} referencias clásicas`);
  console.log(`  - Total: ${ytAdded + classicAdded} referencias`);
  console.log('========================================\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
