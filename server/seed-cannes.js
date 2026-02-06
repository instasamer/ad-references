/**
 * CANNES LIONS - Ganadores históricos por año
 * Grand Prix y Gold Lions de las últimas décadas
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../database.sqlite');

// Ganadores de Cannes Lions con videos en YouTube
const CANNES_WINNERS = [
  // === 2024 ===
  { yt: 'y_8MjqBzpuc', brand: 'Orange', title: 'WoMen\'s Football - Cannes 2024 Grand Prix', year: 2024, tags: ['deportes', 'emocional'] },
  { yt: 'Pg5GWq3X9cY', brand: 'CeraVe', title: 'Michael Cera-Ve - Cannes 2024', year: 2024, tags: ['belleza', 'humor', 'celebrity'] },
  { yt: 'JDH1UCEpqhk', brand: 'Apple', title: 'The Underdogs: OOO - Cannes 2024', year: 2024, tags: ['tecnologia', 'humor'] },
  { yt: 'f0hxwyg_DQc', brand: 'Kia', title: 'Perfect Parallel Parker - Cannes 2024', year: 2024, tags: ['automocion', 'humor'] },

  // === 2023 ===
  { yt: 'qqfOT3adIVs', brand: 'Apple', title: 'The Greatest - Cannes 2023 Grand Prix', year: 2023, tags: ['tecnologia', 'inspirador'] },
  { yt: 'Zfmv1FP9dKw', brand: 'Heinz', title: 'Draw Ketchup - Cannes 2023', year: 2023, tags: ['alimentacion', 'branding'] },
  { yt: 'K8Xp7B6VjL0', brand: 'Volkswagen', title: 'The No Show Room - Cannes 2023', year: 2023, tags: ['automocion', 'emocional'] },
  { yt: '3rK3l4V6paY', brand: 'Corona', title: 'Plastic Fishing Tournament - Cannes 2023', year: 2023, tags: ['alimentacion', 'educacion'] },

  // === 2022 ===
  { yt: 'Qz0HA1HFT8I', brand: 'Coinbase', title: 'QR Code - Cannes 2022 Grand Prix', year: 2022, tags: ['finanzas', 'minimalista'] },
  { yt: 'D6G1i0IFj1c', brand: 'Special Olympics', title: 'Hope Through Sport - Cannes 2022', year: 2022, tags: ['deportes', 'emocional'] },
  { yt: 'HYWUgtpnbK4', brand: 'Burberry', title: 'Festive - Cannes 2022', year: 2022, tags: ['moda', 'lujoso'] },
  { yt: 'wOpZoXvpXmM', brand: 'Uber', title: 'Mom\'s Not Ready - Cannes 2022', year: 2022, tags: ['tecnologia', 'humor'] },

  // === 2021 ===
  { yt: 'sdhVGw_5g4Q', brand: 'Burger King', title: 'Stevenage Challenge - Cannes 2021 Grand Prix', year: 2021, tags: ['alimentacion', 'humor'] },
  { yt: 'gd8GkQj8Iig', brand: 'Burger King', title: 'Moldy Whopper - Cannes 2021', year: 2021, tags: ['alimentacion', 'provocador'] },
  { yt: 'c0lpQgfEk78', brand: 'Nike', title: 'You Can\'t Stop Us - Cannes 2021', year: 2021, tags: ['deportes', 'inspirador'] },
  { yt: '4fXmvpeMDWQ', brand: 'Match', title: 'Match Made in Hell - Cannes 2021', year: 2021, tags: ['tecnologia', 'humor'] },

  // === 2020 ===
  { yt: 'MS0h3aG0IU4', brand: 'Dove', title: 'Courage is Beautiful - Cannes 2020', year: 2020, tags: ['belleza', 'emocional'] },
  { yt: 'Z13RIVfXxYQ', brand: 'Bodyform', title: '#WombStories - Cannes 2020', year: 2020, tags: ['belleza', 'provocador'] },
  { yt: 'GmqFf7aBBmM', brand: 'Carrefour', title: 'Act for Food - Cannes 2020', year: 2020, tags: ['alimentacion', 'educacion'] },

  // === 2019 ===
  { yt: 'XA2YjnZvMOs', brand: 'Dollar Shave Club', title: 'Get Ready - Cannes 2019', year: 2019, tags: ['belleza', 'humor'] },
  { yt: 'X5CaXjYNAyM', brand: 'Nike', title: 'Dream Crazy - Cannes 2019 Grand Prix', year: 2019, tags: ['deportes', 'inspirador'] },
  { yt: 'J0_UDjEGHzU', brand: 'New York Times', title: 'The Truth Is Worth It - Cannes 2019', year: 2019, tags: ['entretenimiento', 'serio'] },
  { yt: 'Sg6xGb5jqbM', brand: 'Apple', title: 'Welcome Home - Cannes 2019', year: 2019, tags: ['tecnologia', 'celebrity'] },

  // === 2018 ===
  { yt: 'XjJQBjWYDTs', brand: 'Always', title: 'Like a Girl - Cannes 2018', year: 2018, tags: ['belleza', 'inspirador'] },
  { yt: 'M7FIvfx5J10', brand: 'Volvo', title: 'The Epic Split - Cannes Grand Prix', year: 2018, tags: ['automocion', 'celebrity'] },
  { yt: 'V6-0kYhqoRo', brand: 'Tide', title: 'It\'s a Tide Ad - Cannes 2018', year: 2018, tags: ['hogar', 'humor'] },
  { yt: 'HqXgTz2ghyo', brand: 'KFC', title: 'FCK - Cannes 2018', year: 2018, tags: ['alimentacion', 'humor'] },

  // === 2017 ===
  { yt: 'LwCEr5h7d_U', brand: 'Fearless Girl', title: 'State Street - Cannes 2017 Grand Prix', year: 2017, tags: ['finanzas', 'provocador'] },
  { yt: 'XpaOjMXyJGk', brand: 'Dove', title: 'Real Beauty Sketches - Cannes 2017', year: 2017, tags: ['belleza', 'emocional'] },
  { yt: '8wYXw4K0A3g', brand: 'Heineken', title: 'Worlds Apart - Cannes 2017', year: 2017, tags: ['alimentacion', 'emocional'] },
  { yt: 'IizDj5_bULM', brand: 'Sandy Hook Promise', title: 'Evan - Cannes 2017', year: 2017, tags: ['educacion', 'emocional'] },

  // === 2016 ===
  { yt: 'tRIIe6qb4K8', brand: 'Guinness', title: 'Surfer - Cannes Classic', year: 2016, tags: ['alimentacion', 'emocional'] },
  { yt: 'VGRq1dCwvnk', brand: 'Coca-Cola', title: 'Holidays Are Coming - Cannes Hall of Fame', year: 2016, tags: ['alimentacion', 'nostalgico'] },
  { yt: 'kKTamH__xuQ', brand: 'Channel 4', title: 'Meet the Superhumans - Cannes 2016', year: 2016, tags: ['entretenimiento', 'inspirador'] },
  { yt: 'RDiZOnzajNU', brand: 'Under Armour', title: 'Rule Yourself - Phelps', year: 2016, tags: ['deportes', 'celebrity'] },

  // === 2015 ===
  { yt: 'VtvjbmoDx-I', brand: 'Apple', title: '1984 - Cannes Best of Century', year: 2015, tags: ['tecnologia', 'provocador'] },
  { yt: 'caMsxxDuSbg', brand: 'Melbourne Metro', title: 'Dumb Ways to Die - Cannes Grand Prix', year: 2015, tags: ['educacion', 'animacion'] },
  { yt: 'Xh_KNH8QqSw', brand: 'Sport England', title: 'This Girl Can - Cannes 2015', year: 2015, tags: ['deportes', 'inspirador'] },
  { yt: 'E8DCHBwE4xg', brand: 'Always', title: 'Like a Girl - Cannes 2015', year: 2015, tags: ['belleza', 'inspirador'] },

  // === 2014 ===
  { yt: 'owGykVbfgUE', brand: 'Old Spice', title: 'The Man Your Man - Cannes Grand Prix', year: 2014, tags: ['belleza', 'humor'] },
  { yt: 'R55e-uHQna0', brand: 'Volkswagen', title: 'The Force - Cannes 2014', year: 2014, tags: ['automocion', 'humor'] },
  { yt: '4m2YNQmVKzg', brand: 'Volvo', title: 'Live Test Series - Cannes 2014', year: 2014, tags: ['automocion', 'celebrity'] },
  { yt: 'nBobmwO2Y5k', brand: 'Thai Life', title: 'Silence of Love - Cannes 2014', year: 2014, tags: ['finanzas', 'emocional'] },

  // === 2013 ===
  { yt: 'iYhCn0jf46U', brand: 'Dove', title: 'Evolution - Cannes Titanium', year: 2013, tags: ['belleza', 'provocador'] },
  { yt: 'TVblWq3tDwY', brand: 'Cadbury', title: 'Gorilla - Cannes 2013', year: 2013, tags: ['alimentacion', 'provocador'] },
  { yt: 'D_wIO57s-pg', brand: 'Guinness', title: 'Wheelchair Basketball - Cannes 2013', year: 2013, tags: ['alimentacion', 'emocional'] },
  { yt: 'Y0oVSbpTrk0', brand: 'Apple', title: 'Misunderstood - Cannes 2013', year: 2013, tags: ['tecnologia', 'emocional'] },

  // === 2012 ===
  { yt: 'nnsSUqgkDwU', brand: 'Google', title: 'Parisian Love - Cannes 2012', year: 2012, tags: ['tecnologia', 'emocional'] },
  { yt: '6xSxXiHwMrg', brand: 'Google', title: 'Loretta - Cannes 2012', year: 2012, tags: ['tecnologia', 'emocional'] },
  { yt: 'lJzG0STBICI', brand: 'Coca-Cola', title: 'Happiness Machine - Cannes 2012', year: 2012, tags: ['alimentacion', 'humor'] },
  { yt: 'iMmADxhAz5I', brand: 'John Lewis', title: 'The Long Wait - Cannes 2012', year: 2012, tags: ['moda', 'emocional'] },

  // === 2011 ===
  { yt: 'nmwXdGm89Tk', brand: 'Apple', title: 'Get a Mac - Cannes 2011', year: 2011, tags: ['tecnologia', 'humor'] },
  { yt: '_ve4M4UsJQo', brand: 'Honda', title: 'Cog - Cannes Film Grand Prix', year: 2011, tags: ['automocion', 'minimalista'] },
  { yt: 'uaWA2GbcnJU', brand: 'Thai Life', title: 'Unsung Hero - Cannes 2011', year: 2011, tags: ['finanzas', 'emocional'] },
  { yt: 'dBqhIVyfsRg', brand: 'IKEA', title: 'Lamp - Cannes 2011', year: 2011, tags: ['hogar', 'humor'] },

  // === 2010 y anteriores - Clásicos ===
  { yt: '1VM2eLhvsSM', brand: 'Coca-Cola', title: 'Hilltop - I\'d Like to Buy (1971)', year: 2010, tags: ['alimentacion', 'emocional'] },
  { yt: 'fVY9TTxqXG4', brand: 'Coca-Cola', title: 'Mean Joe Greene (1979)', year: 2010, tags: ['alimentacion', 'emocional'] },
  { yt: 'EpsQq5f38xg', brand: 'Budweiser', title: 'Wassup (1999)', year: 2010, tags: ['alimentacion', 'humor'] },
  { yt: 'Nmgice3ieZ4', brand: 'Snickers', title: 'Betty White (2010)', year: 2010, tags: ['alimentacion', 'humor', 'celebrity'] },

  // === MÁS GANADORES GLOBALES ===
  { yt: '3hHDqrbLef0', brand: 'P&G', title: 'Thank You Mom - Olympics', year: 2012, tags: ['hogar', 'emocional'] },
  { yt: 'zSeRzsBGLPU', brand: 'Always', title: 'Like A Girl Super Bowl', year: 2015, tags: ['belleza', 'inspirador'] },
  { yt: 'TPKgC8KPBMo', brand: 'Budweiser', title: 'Puppy Love', year: 2014, tags: ['alimentacion', 'emocional'] },
  { yt: 'FHtvDA0W34I', brand: 'Red Bull', title: 'Stratos', year: 2013, tags: ['deportes', 'spot-tv'] },
  { yt: 'Au8Y98Rgxbk', brand: 'Guinness', title: 'noitulovE', year: 2006, tags: ['alimentacion', 'provocador'] },
  { yt: 'XqWig2WARb0', brand: 'John Lewis', title: 'Monty the Penguin', year: 2014, tags: ['moda', 'emocional'] },
  { yt: 'zIEIvi2MuEk', brand: 'WestJet', title: 'Christmas Miracle', year: 2013, tags: ['viajes', 'emocional'] },
  { yt: 'LerdMmWjU_E', brand: 'Coca-Cola', title: 'Polar Bears', year: 1993, tags: ['alimentacion', 'animacion'] },
  { yt: '0N8axp9nHNU', brand: 'John Lewis', title: 'Man on the Moon', year: 2015, tags: ['moda', 'emocional'] },
  { yt: 'mNrXMOSkBas', brand: 'John Lewis', title: 'Elton John', year: 2018, tags: ['moda', 'celebrity'] },

  // === ASIA WINNERS ===
  { yt: '7s22HX18wDY', brand: 'Thai Life', title: 'My Dad is a Liar', year: 2017, tags: ['finanzas', 'emocional'] },
  { yt: 'gkqvjzQHwH0', brand: 'MetLife Hong Kong', title: 'My Dad\'s Story', year: 2015, tags: ['finanzas', 'emocional'] },
  { yt: 'vnVuqfXohxc', brand: 'Android', title: 'Friends Furever', year: 2015, tags: ['tecnologia', 'emocional'] },
  { yt: 'X2EKNFSJY4Y', brand: 'Android', title: 'Rock Paper Scissors', year: 2016, tags: ['tecnologia', 'emocional'] },

  // === ESPAÑA Y LATAM ===
  { yt: 'EJIg9xQNEz0', brand: 'Campofrío', title: 'El CV de Todos', year: 2020, tags: ['alimentacion', 'emocional'] },
  { yt: 'GaREMQYp1lo', brand: 'Ruavieja', title: 'Tenemos Que Vernos Más', year: 2019, tags: ['alimentacion', 'emocional'] },
  { yt: '6aNV1_5dXGQ', brand: 'Estrella Damm', title: 'Mediterráneamente', year: 2018, tags: ['alimentacion', 'emocional'] },
  { yt: 'D_hy_a_m4qg', brand: 'Lotería', title: 'El Mayor Premio', year: 2014, tags: ['entretenimiento', 'emocional'] },

  // === VINTAGE CLASSICS 80s-90s ===
  { yt: '4TZHwVAfgVY', brand: 'Levi\'s', title: 'Launderette (1985)', year: 1985, tags: ['moda', 'retro-80s'] },
  { yt: 'Z15Z2RzNbis', brand: 'British Airways', title: 'Face (1989)', year: 1989, tags: ['viajes', 'emocional'] },
  { yt: '_Kmh4BbJPz8', brand: 'Pepsi', title: 'Michael Jackson (1984)', year: 1984, tags: ['alimentacion', 'celebrity'] },
  { yt: 'uwvAgDCOdU4', brand: 'Pepsi', title: 'Gladiators (2004)', year: 2004, tags: ['alimentacion', 'celebrity'] },

  // === TECH & STARTUPS ===
  { yt: 'XA2YjnZvMOs', brand: 'Dollar Shave Club', title: 'Our Blades Are Great', year: 2012, tags: ['belleza', 'humor'] },
  { yt: 'ZUG9qYTJMsI', brand: 'Poo-Pourri', title: 'Girls Don\'t Poop', year: 2013, tags: ['belleza', 'humor'] },
  { yt: 'eRsGyueVLvQ', brand: 'Squarespace', title: 'Make It Real', year: 2022, tags: ['tecnologia', 'celebrity'] },
  { yt: '8vQlhWBvAwY', brand: 'Amazon', title: 'Alexa Loses Voice', year: 2018, tags: ['tecnologia', 'humor'] },

  // === AUTOMOTIVE LEGENDS ===
  { yt: 'grtEt0Cudt8', brand: 'BMW', title: 'The Hire - Star', year: 2002, tags: ['automocion', 'celebrity'] },
  { yt: 'twC3k0s2mJQ', brand: 'Volvo', title: 'Moments', year: 2017, tags: ['automocion', 'emocional'] },
  { yt: 'PpVAv2wSmHc', brand: 'Mercedes', title: 'Chicken', year: 2013, tags: ['automocion', 'humor'] },
  { yt: 'G7P4iFg048k', brand: 'Audi', title: 'Daughter', year: 2017, tags: ['automocion', 'emocional'] },
  { yt: '5KiC03_wVjc', brand: 'Audi', title: 'Commander', year: 2016, tags: ['automocion', 'emocional'] },
  { yt: 'SqHcTGqn3u8', brand: 'Honda', title: 'Paper', year: 2015, tags: ['automocion', 'animacion'] },

  // === SPORTS & ENTERTAINMENT ===
  { yt: 'lZA-57h64kE', brand: 'Nike', title: 'Write the Future', year: 2010, tags: ['deportes', 'spot-tv'] },
  { yt: 'Fqv6TdECWLM', brand: 'Nike', title: 'Winner Stays', year: 2014, tags: ['deportes', 'celebrity'] },
  { yt: 'fB5HKLXq0Dc', brand: 'Nike', title: 'The Last Game', year: 2014, tags: ['deportes', 'animacion'] },
  { yt: 'pxBS_wZxUy0', brand: 'Nike', title: 'Failure - Jordan', year: 1997, tags: ['deportes', 'inspirador'] },
  { yt: 'IocLkk3aYlk', brand: 'Channel 4', title: 'We\'re the Superhumans', year: 2016, tags: ['entretenimiento', 'inspirador'] },

  // === SOCIAL IMPACT ===
  { yt: 'LlQRQy5t880', brand: 'P&G', title: 'The Talk', year: 2017, tags: ['hogar', 'emocional'] },
  { yt: 'mW_tCtfb4XI', brand: 'Lloyds Bank', title: 'For Your Journey', year: 2019, tags: ['finanzas', 'emocional'] },
  { yt: '1shK-j_u6LI', brand: 'Wrigley', title: 'Give Extra Get Extra', year: 2016, tags: ['alimentacion', 'emocional'] },
  { yt: 'XLpDiIVX0Wo', brand: 'Extra Gum', title: 'Story of Sarah & Juan', year: 2015, tags: ['alimentacion', 'emocional'] },

  // === SUPER BOWL LEGENDS ===
  { yt: 'I0Sxxibos-I', brand: 'Wendy\'s', title: 'Where\'s the Beef?', year: 1984, tags: ['alimentacion', 'humor'] },
  { yt: 'X5RFSHJbB1g', brand: 'Budweiser', title: 'Frogs', year: 1995, tags: ['alimentacion', 'humor'] },
  { yt: 'Bz2-49q6DOI', brand: 'Reebok', title: 'Terry Tate', year: 2003, tags: ['deportes', 'humor'] },
  { yt: 'VNM7Z7hir_I', brand: 'Doritos', title: 'Ultrasound', year: 2016, tags: ['alimentacion', 'humor'] },
  { yt: 'uQB7QRyF4p4', brand: 'Budweiser', title: 'Lost Dog', year: 2015, tags: ['alimentacion', 'emocional'] },

  // === RECENT BEST 2020s ===
  { yt: 'uvmWyaPoLyk', brand: 'Apple', title: 'Underdogs', year: 2019, tags: ['tecnologia', 'humor'] },
  { yt: 'ax5OGqIB6BA', brand: 'Apple', title: 'Privacy - Intention', year: 2021, tags: ['tecnologia', 'serio'] },
  { yt: 'TJQ34zqhxJ8', brand: 'Google', title: 'Home Alone Again', year: 2018, tags: ['tecnologia', 'humor'] },
  { yt: 'HOqxnKLPW5c', brand: 'Amazon', title: 'Not Everything Makes Cut', year: 2019, tags: ['tecnologia', 'humor'] },
  { yt: 'p1WI7FyPlOs', brand: 'Budweiser', title: 'Whassup Quarantine', year: 2020, tags: ['alimentacion', 'humor'] },
  { yt: 'DHHKU4znvo8', brand: 'Heineken', title: 'Cheers to All', year: 2020, tags: ['alimentacion', 'humor'] },
];

let db;
let added = 0;

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    console.log('Error: Base de datos no encontrada.');
    process.exit(1);
  }
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function runQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function runExec(sql, params = []) {
  db.run(sql, params);
}

async function main() {
  console.log('='.repeat(50));
  console.log('SEED - Cannes Lions Winners');
  console.log('='.repeat(50));

  await initDb();

  const before = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;
  console.log(`Referencias antes: ${before}`);
  console.log(`Ganadores Cannes a añadir: ${CANNES_WINNERS.length}\n`);

  for (const ad of CANNES_WINNERS) {
    const url = `https://www.youtube.com/watch?v=${ad.yt}`;
    const thumbnail = `https://img.youtube.com/vi/${ad.yt}/maxresdefault.jpg`;

    const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [url]);
    if (existing.length > 0) continue;

    const id = uuidv4();
    const description = `Cannes Lions ${ad.year}`;

    runExec(`
      INSERT INTO references_ads (id, title, description, type, url, thumbnail, brand, year, source)
      VALUES (?, ?, ?, 'video', ?, ?, ?, ?, 'cannes')
    `, [id, ad.title, description, url, thumbnail, ad.brand, ad.year]);

    for (const tagName of ad.tags) {
      const tagResult = runQuery('SELECT id FROM tags WHERE name = ?', [tagName]);
      if (tagResult.length > 0) {
        runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [id, tagResult[0].id]);
      }
    }

    added++;
    process.stdout.write(`\r  Añadidos: ${added}/${CANNES_WINNERS.length}`);
  }

  saveDb();

  const after = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;

  console.log('\n\n' + '='.repeat(50));
  console.log('COMPLETADO');
  console.log('='.repeat(50));
  console.log(`Nuevos añadidos: ${added}`);
  console.log(`Total en BD: ${after}`);
}

main().catch(err => {
  console.error('Error:', err);
  if (db) saveDb();
  process.exit(1);
});
