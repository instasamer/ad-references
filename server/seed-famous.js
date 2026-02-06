/**
 * Base de datos de anuncios FAMOSOS de la historia
 * Campañas icónicas organizadas por década y marca
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../database.sqlite');

// Base de datos de anuncios famosos con YouTube IDs
const FAMOUS_ADS = [
  // === NIKE ===
  { yt: 'WYP9AGtLvRg', brand: 'Nike', title: 'Just Do It - Original 1988', tags: ['deportes', 'inspirador'] },
  { yt: 'K-ks0eHzX1I', brand: 'Nike', title: 'Michael Jordan - Be Like Mike', tags: ['deportes', 'celebrity'] },
  { yt: '45mMioJ5szc', brand: 'Nike', title: 'Tiger Woods - Hello World', tags: ['deportes', 'celebrity'] },
  { yt: 'lZA-57h64kE', brand: 'Nike', title: 'Write The Future - World Cup', tags: ['deportes', 'spot-tv'] },
  { yt: 'Fqv6TdECWLM', brand: 'Nike', title: 'Winner Stays - Risk Everything', tags: ['deportes', 'celebrity'] },
  { yt: 'fB5HKLXq0Dc', brand: 'Nike', title: 'The Last Game - Animation', tags: ['deportes', 'animacion'] },
  { yt: 'X5CaXjYNAyM', brand: 'Nike', title: 'Dream Crazy - Colin Kaepernick', tags: ['deportes', 'inspirador'] },
  { yt: 'gHMPnYxN7lQ', brand: 'Nike', title: 'Jogger - Find Your Greatness', tags: ['deportes', 'emocional'] },
  { yt: 'pxBS_wZxUy0', brand: 'Nike', title: 'Failure - Michael Jordan', tags: ['deportes', 'inspirador'] },
  { yt: 'oPBe8gCsOGo', brand: 'Nike', title: 'Tag - World Cup 98', tags: ['deportes', 'spot-tv'] },

  // === APPLE ===
  { yt: 'VtvjbmoDx-I', brand: 'Apple', title: '1984 - Super Bowl', tags: ['tecnologia', 'provocador'] },
  { yt: 'tjgtLSHhTPg', brand: 'Apple', title: 'Think Different', tags: ['tecnologia', 'inspirador'] },
  { yt: 'nmwXdGm89Tk', brand: 'Apple', title: 'Get a Mac Campaign', tags: ['tecnologia', 'humor'] },
  { yt: 'Duu4f0cF_jg', brand: 'Apple', title: 'iPod Silhouettes', tags: ['tecnologia', 'minimalista'] },
  { yt: 'EcQjGLEcu9I', brand: 'Apple', title: 'Here\'s to the Crazy Ones', tags: ['tecnologia', 'inspirador'] },
  { yt: 'JSnB06um5r4', brand: 'Apple', title: 'Shot on iPhone', tags: ['tecnologia', 'fotografía'] },
  { yt: 'ax5OGqIB6BA', brand: 'Apple', title: 'Intention - Privacy', tags: ['tecnologia', 'serio'] },
  { yt: 'uvmWyaPoLyk', brand: 'Apple', title: 'The Underdogs', tags: ['tecnologia', 'humor'] },
  { yt: 'Y0oVSbpTrk0', brand: 'Apple', title: 'Misunderstood - Christmas', tags: ['tecnologia', 'emocional'] },
  { yt: 'Sg6xGb5jqbM', brand: 'Apple', title: 'Welcome Home - Spike Jonze', tags: ['tecnologia', 'celebrity'] },

  // === COCA-COLA ===
  { yt: '1VM2eLhvsSM', brand: 'Coca-Cola', title: 'Hilltop - I\'d Like to Teach', tags: ['alimentacion', 'emocional'] },
  { yt: 'fVY9TTxqXG4', brand: 'Coca-Cola', title: 'Mean Joe Greene', tags: ['alimentacion', 'emocional'] },
  { yt: 'VGRq1dCwvnk', brand: 'Coca-Cola', title: 'Holidays Are Coming', tags: ['alimentacion', 'nostalgico'] },
  { yt: 'LerdMmWjU_E', brand: 'Coca-Cola', title: 'Polar Bears', tags: ['alimentacion', 'animacion'] },
  { yt: '8vBPP-JKZhs', brand: 'Coca-Cola', title: 'Share a Coke', tags: ['alimentacion', 'engagement'] },
  { yt: 'lJzG0STBICI', brand: 'Coca-Cola', title: 'Happiness Machine', tags: ['alimentacion', 'humor'] },
  { yt: '9NWNYvfvBT4', brand: 'Coca-Cola', title: 'America the Beautiful', tags: ['alimentacion', 'emocional'] },
  { yt: 'CNrK15QIV5g', brand: 'Coca-Cola', title: 'Open Happiness', tags: ['alimentacion', 'inspirador'] },

  // === VOLKSWAGEN ===
  { yt: 'EJOeMvTCgLw', brand: 'Volkswagen', title: 'Think Small - Print Iconic', tags: ['automocion', 'minimalista'] },
  { yt: 'R55e-uHQna0', brand: 'Volkswagen', title: 'The Force - Darth Vader Kid', tags: ['automocion', 'humor'] },
  { yt: 'xoOmiyLBnHU', brand: 'Volkswagen', title: 'Lemon - Print Classic', tags: ['automocion', 'minimalista'] },
  { yt: 'Bg_tJvCA8zw', brand: 'Volkswagen', title: 'Funeral', tags: ['automocion', 'humor'] },
  { yt: 'iUbPtqiLD3s', brand: 'Volkswagen', title: 'The Bark Side', tags: ['automocion', 'humor'] },

  // === BUDWEISER ===
  { yt: 'EpsQq5f38xg', brand: 'Budweiser', title: 'Wassup? - Original', tags: ['alimentacion', 'humor'] },
  { yt: 'Z0Ns4b8LlxA', brand: 'Budweiser', title: 'Clydesdales - 9/11', tags: ['alimentacion', 'emocional'] },
  { yt: 'TPKgC8KPBMo', brand: 'Budweiser', title: 'Puppy Love', tags: ['alimentacion', 'emocional'] },
  { yt: 'uQB7QRyF4p4', brand: 'Budweiser', title: 'Lost Dog', tags: ['alimentacion', 'emocional'] },
  { yt: 'X5RFSHJbB1g', brand: 'Budweiser', title: 'Frogs', tags: ['alimentacion', 'humor'] },
  { yt: 'p1WI7FyPlOs', brand: 'Budweiser', title: 'Whassup Quarantine 2020', tags: ['alimentacion', 'humor'] },

  // === JOHN LEWIS ===
  { yt: 'iMmADxhAz5I', brand: 'John Lewis', title: 'The Long Wait - Christmas', tags: ['moda', 'emocional'] },
  { yt: 'XqWig2WARb0', brand: 'John Lewis', title: 'Monty the Penguin', tags: ['moda', 'emocional'] },
  { yt: '0N8axp9nHNU', brand: 'John Lewis', title: 'Man on the Moon', tags: ['moda', 'emocional'] },
  { yt: 'Jw1Y-zhQURU', brand: 'John Lewis', title: 'Buster the Boxer', tags: ['moda', 'emocional'] },
  { yt: 'mNrXMOSkBas', brand: 'John Lewis', title: 'Elton John - Your Song', tags: ['moda', 'celebrity'] },
  { yt: 'r9D-uvKih_k', brand: 'John Lewis', title: 'The Bear and Hare', tags: ['moda', 'animacion'] },

  // === OLD SPICE ===
  { yt: 'owGykVbfgUE', brand: 'Old Spice', title: 'The Man Your Man Could Smell Like', tags: ['belleza', 'humor'] },
  { yt: 'Af1OxkFOK18', brand: 'Old Spice', title: 'Questions', tags: ['belleza', 'humor'] },
  { yt: 'uLTIowBF0kE', brand: 'Old Spice', title: 'Mom Song', tags: ['belleza', 'humor'] },
  { yt: '6Lzc8YsP_mo', brand: 'Old Spice', title: 'Terry Crews Explosion', tags: ['belleza', 'humor'] },

  // === DOVE ===
  { yt: 'XpaOjMXyJGk', brand: 'Dove', title: 'Real Beauty Sketches', tags: ['belleza', 'emocional'] },
  { yt: 'iYhCn0jf46U', brand: 'Dove', title: 'Evolution', tags: ['belleza', 'provocador'] },
  { yt: 'Ei6JvK0W60I', brand: 'Dove', title: 'Choose Beautiful', tags: ['belleza', 'inspirador'] },
  { yt: 'g8KgaJvcko0', brand: 'Dove', title: 'Camera Shy', tags: ['belleza', 'emocional'] },

  // === GUINNESS ===
  { yt: 'tRIIe6qb4K8', brand: 'Guinness', title: 'Surfer - Good Things', tags: ['alimentacion', 'emocional'] },
  { yt: 'Au8Y98Rgxbk', brand: 'Guinness', title: 'noitulovE - Backwards', tags: ['alimentacion', 'provocador'] },
  { yt: 'D_wIO57s-pg', brand: 'Guinness', title: 'Wheelchair Basketball', tags: ['alimentacion', 'emocional'] },
  { yt: 'EHGpbQttCPU', brand: 'Guinness', title: 'Made of More', tags: ['alimentacion', 'inspirador'] },

  // === ALWAYS ===
  { yt: 'XjJQBjWYDTs', brand: 'Always', title: 'Like A Girl', tags: ['belleza', 'inspirador'] },
  { yt: 'zSeRzsBGLPU', brand: 'Always', title: 'Like A Girl - Super Bowl', tags: ['belleza', 'inspirador'] },

  // === SAMSUNG ===
  { yt: 'oDAw7vW7H0c', brand: 'Samsung', title: 'Growing Up', tags: ['tecnologia', 'humor'] },
  { yt: '8lsB-P8nGSM', brand: 'Samsung', title: 'Do What You Can\'t', tags: ['tecnologia', 'inspirador'] },
  { yt: 'z78dqUDSl-U', brand: 'Samsung', title: 'The Future - Unpacked', tags: ['tecnologia', 'lujoso'] },

  // === GOOGLE ===
  { yt: 'nnsSUqgkDwU', brand: 'Google', title: 'Parisian Love - Search Story', tags: ['tecnologia', 'emocional'] },
  { yt: 'jG4Vrdi7quI', brand: 'Google', title: 'Dear Sophie', tags: ['tecnologia', 'emocional'] },
  { yt: '6xSxXiHwMrg', brand: 'Google', title: 'Loretta', tags: ['tecnologia', 'emocional'] },
  { yt: 'TJQ34zqhxJ8', brand: 'Google', title: 'Home Alone Again', tags: ['tecnologia', 'humor'] },
  { yt: 'P-a_R6ewrmM', brand: 'Google', title: 'Year in Search', tags: ['tecnologia', 'emocional'] },

  // === AMAZON ===
  { yt: '8vQlhWBvAwY', brand: 'Amazon', title: 'Alexa Loses Her Voice', tags: ['tecnologia', 'humor'] },
  { yt: 'HOqxnKLPW5c', brand: 'Amazon', title: 'Not Everything Makes the Cut', tags: ['tecnologia', 'humor'] },
  { yt: 'IzCfVFzrrsM', brand: 'Amazon', title: 'A Dog\'s Life', tags: ['tecnologia', 'emocional'] },

  // === VOLVO ===
  { yt: 'M7FIvfx5J10', brand: 'Volvo', title: 'The Epic Split - Van Damme', tags: ['automocion', 'celebrity'] },
  { yt: 'twC3k0s2mJQ', brand: 'Volvo', title: 'Moments', tags: ['automocion', 'emocional'] },
  { yt: 'jyiAkSllqjU', brand: 'Volvo', title: 'Human Made Stories', tags: ['automocion', 'emocional'] },

  // === MERCEDES ===
  { yt: 'xm5n3xfQ4FQ', brand: 'Mercedes-Benz', title: 'The Journey', tags: ['automocion', 'emocional'] },
  { yt: 'PpVAv2wSmHc', brand: 'Mercedes-Benz', title: 'Chicken - Magic Body', tags: ['automocion', 'humor'] },
  { yt: 'T8W_oMtiNKg', brand: 'Mercedes-Benz', title: 'Snow Date', tags: ['automocion', 'emocional'] },

  // === BMW ===
  { yt: 'grtEt0Cudt8', brand: 'BMW', title: 'The Hire - Star', tags: ['automocion', 'celebrity'] },
  { yt: 'P-z3x9Ht_iE', brand: 'BMW', title: 'Hostage', tags: ['automocion', 'spot-tv'] },

  // === AUDI ===
  { yt: 'G7P4iFg048k', brand: 'Audi', title: 'Daughter - Equal Pay', tags: ['automocion', 'emocional'] },
  { yt: '5KiC03_wVjc', brand: 'Audi', title: 'Commander', tags: ['automocion', 'emocional'] },

  // === HEINEKEN ===
  { yt: '8wYXw4K0A3g', brand: 'Heineken', title: 'Worlds Apart', tags: ['alimentacion', 'emocional'] },
  { yt: '7Vuh5sU6Jf0', brand: 'Heineken', title: 'The Entrance', tags: ['alimentacion', 'humor'] },
  { yt: 'DHHKU4znvo8', brand: 'Heineken', title: 'Cheers to All', tags: ['alimentacion', 'humor'] },

  // === IKEA ===
  { yt: 'dBqhIVyfsRg', brand: 'IKEA', title: 'Lamp - Spike Jonze', tags: ['hogar', 'humor'] },
  { yt: 'Z1WvvnwGpGc', brand: 'IKEA', title: 'Silence the Critics', tags: ['hogar', 'humor'] },

  // === P&G ===
  { yt: '3hHDqrbLef0', brand: 'P&G', title: 'Thank You Mom - Olympics', tags: ['hogar', 'emocional'] },
  { yt: '3hHDqrbLef0', brand: 'P&G', title: 'Best Job - Mother\'s Day', tags: ['hogar', 'emocional'] },
  { yt: 'LlQRQy5t880', brand: 'P&G', title: 'The Talk', tags: ['hogar', 'emocional'] },

  // === SNICKERS ===
  { yt: 'Nmgice3ieZ4', brand: 'Snickers', title: 'You\'re Not You When Hungry - Betty White', tags: ['alimentacion', 'humor'] },
  { yt: 'KdftbYqA_VQ', brand: 'Snickers', title: 'Mr. Bean - Kung Fu', tags: ['alimentacion', 'humor'] },

  // === DORITOS ===
  { yt: 'VBJ4ecxNqkw', brand: 'Doritos', title: 'Crash the Super Bowl Winners', tags: ['alimentacion', 'humor'] },
  { yt: 'VNM7Z7hir_I', brand: 'Doritos', title: 'Ultrasound', tags: ['alimentacion', 'humor'] },

  // === McDONALD'S ===
  { yt: 'SsLQlF_2OAM', brand: 'McDonald\'s', title: 'Our Food. Your Questions.', tags: ['alimentacion', 'serio'] },
  { yt: '4DcjJXFq8M8', brand: 'McDonald\'s', title: 'Carry On', tags: ['alimentacion', 'emocional'] },

  // === ADIDAS ===
  { yt: 'yIJNy3RjLz8', brand: 'Adidas', title: 'Impossible is Nothing', tags: ['deportes', 'inspirador'] },
  { yt: 'c3fMvUYgEB8', brand: 'Adidas', title: 'Create Your Own Game', tags: ['deportes', 'celebrity'] },
  { yt: 'zDUcVrjNBdw', brand: 'Adidas', title: 'Take It - World Cup', tags: ['deportes', 'spot-tv'] },
  { yt: 'pxWkSk7p5Qk', brand: 'Adidas', title: 'Original is Never Finished', tags: ['moda', 'provocador'] },

  // === THAI LIFE INSURANCE ===
  { yt: 'uaWA2GbcnJU', brand: 'Thai Life Insurance', title: 'Unsung Hero', tags: ['finanzas', 'emocional'] },
  { yt: 'nBobmwO2Y5k', brand: 'Thai Life Insurance', title: 'Silence of Love', tags: ['finanzas', 'emocional'] },
  { yt: '7s22HX18wDY', brand: 'Thai Life Insurance', title: 'My Dad is a Liar', tags: ['finanzas', 'emocional'] },

  // === EXTRA GUM ===
  { yt: 'XLpDiIVX0Wo', brand: 'Extra Gum', title: 'The Story of Sarah & Juan', tags: ['alimentacion', 'emocional'] },

  // === WestJet ===
  { yt: 'zIEIvi2MuEk', brand: 'WestJet', title: 'Christmas Miracle', tags: ['viajes', 'emocional'] },

  // === ANDROID ===
  { yt: 'vnVuqfXohxc', brand: 'Android', title: 'Friends Furever', tags: ['tecnologia', 'emocional'] },
  { yt: 'X2EKNFSJY4Y', brand: 'Android', title: 'Rock Paper Scissors', tags: ['tecnologia', 'emocional'] },

  // === CADBURY ===
  { yt: 'TVblWq3tDwY', brand: 'Cadbury', title: 'Gorilla - Phil Collins', tags: ['alimentacion', 'provocador'] },
  { yt: 'wCF3ywukQYA', brand: 'Cadbury', title: 'Airport Trucks', tags: ['alimentacion', 'humor'] },

  // === HONDA ===
  { yt: '_ve4M4UsJQo', brand: 'Honda', title: 'Cog', tags: ['automocion', 'minimalista'] },
  { yt: 'Dxy4n0UT82o', brand: 'Honda', title: 'The Impossible Dream', tags: ['automocion', 'inspirador'] },
  { yt: 'SqHcTGqn3u8', brand: 'Honda', title: 'Paper', tags: ['automocion', 'animacion'] },

  // === CHANNEL 4 ===
  { yt: 'kKTamH__xuQ', brand: 'Channel 4', title: 'Meet the Superhumans', tags: ['entretenimiento', 'inspirador'] },
  { yt: 'IocLkk3aYlk', brand: 'Channel 4', title: 'We\'re the Superhumans', tags: ['entretenimiento', 'inspirador'] },

  // === RED BULL ===
  { yt: 'FHtvDA0W34I', brand: 'Red Bull', title: 'Stratos - Felix Baumgartner', tags: ['deportes', 'spot-tv'] },
  { yt: 'Pu5CVvezfFs', brand: 'Red Bull', title: 'Art of Flight', tags: ['deportes', 'spot-tv'] },

  // === CLASSIC VINTAGE ===
  { yt: 'mUVv5X7K1ak', brand: 'Absolut', title: 'Absolut Vodka Campaign', tags: ['alimentacion', 'minimalista'] },
  { yt: '4TZHwVAfgVY', brand: 'Levi\'s', title: 'Launderette', tags: ['moda', 'retro-80s'] },
  { yt: 'Z15Z2RzNbis', brand: 'British Airways', title: 'Face', tags: ['viajes', 'emocional'] },
  { yt: '_Kmh4BbJPz8', brand: 'Pepsi', title: 'Michael Jackson - Billie Jean', tags: ['alimentacion', 'celebrity'] },
  { yt: 'uwvAgDCOdU4', brand: 'Pepsi', title: 'Gladiators - Britney & Beyonce', tags: ['alimentacion', 'celebrity'] },

  // === MODERN VIRAL ===
  { yt: 'eRsGyueVLvQ', brand: 'Squarespace', title: 'Make It Real', tags: ['tecnologia', 'celebrity'] },
  { yt: 'XA2YjnZvMOs', brand: 'Dollar Shave Club', title: 'Our Blades Are F***ing Great', tags: ['belleza', 'humor'] },
  { yt: 'ZUG9qYTJMsI', brand: 'Poo-Pourri', title: 'Girls Don\'t Poop', tags: ['belleza', 'humor'] },
  { yt: 'dQw4w9WgXcQ', brand: 'RickRoll', title: 'Never Gonna Give You Up - Meme', tags: ['entretenimiento', 'humor'] },

  // === SUPER BOWL CLASSICS ===
  { yt: 'I0Sxxibos-I', brand: 'Wendy\'s', title: 'Where\'s the Beef?', tags: ['alimentacion', 'humor'] },
  { yt: 'Bz2-49q6DOI', brand: 'Reebok', title: 'Terry Tate Office Linebacker', tags: ['deportes', 'humor'] },
  { yt: 'GY6uJlI-t14', brand: 'CareerBuilder', title: 'Chimps', tags: ['tecnologia', 'humor'] },

  // === CANNES WINNERS ===
  { yt: '0MhVkKHYUAY', brand: 'Harvey Nichols', title: 'Sorry I Spent It On Myself', tags: ['moda', 'humor'] },
  { yt: 'caMsxxDuSbg', brand: 'Melbourne Metro', title: 'Dumb Ways to Die', tags: ['educacion', 'animacion'] },
  { yt: 'Xh_KNH8QqSw', brand: 'Sport England', title: 'This Girl Can', tags: ['deportes', 'inspirador'] },

  // === EMOTIONAL TEARJERKERS ===
  { yt: '1shK-j_u6LI', brand: 'Wrigley', title: 'Give Extra Get Extra', tags: ['alimentacion', 'emocional'] },
  { yt: 'gkqvjzQHwH0', brand: 'MetLife Hong Kong', title: 'My Dad\'s Story', tags: ['finanzas', 'emocional'] },
  { yt: 'mW_tCtfb4XI', brand: 'Lloyds Bank', title: 'For Your Journey', tags: ['finanzas', 'emocional'] },

  // === SPANISH MARKET ===
  { yt: 'EJIg9xQNEz0', brand: 'Campofrío', title: 'El CV de Todos', tags: ['alimentacion', 'emocional'] },
  { yt: 'GaREMQYp1lo', brand: 'Ruavieja', title: 'Tenemos Que Vernos Más', tags: ['alimentacion', 'emocional'] },
  { yt: 'D_hy_a_m4qg', brand: 'Lotería Navidad', title: 'El Mayor Premio', tags: ['entretenimiento', 'emocional'] },
  { yt: '6aNV1_5dXGQ', brand: 'Estrella Damm', title: 'Mediterráneamente', tags: ['alimentacion', 'emocional'] },
  { yt: 'z_HWtzUHm6s', brand: 'ONCE', title: 'El Mayor Premio', tags: ['entretenimiento', 'emocional'] },
  { yt: 'dTAAsCNK7RA', brand: 'Balay', title: 'Por un futuro mejor', tags: ['hogar', 'emocional'] },
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
  console.log('SEED - Anuncios Famosos de la Historia');
  console.log('='.repeat(50));

  await initDb();

  const before = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;
  console.log(`Referencias antes: ${before}`);
  console.log(`Anuncios a añadir: ${FAMOUS_ADS.length}\n`);

  for (const ad of FAMOUS_ADS) {
    const url = `https://www.youtube.com/watch?v=${ad.yt}`;
    const thumbnail = `https://img.youtube.com/vi/${ad.yt}/maxresdefault.jpg`;

    // Verificar si ya existe
    const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [url]);
    if (existing.length > 0) continue;

    const id = uuidv4();

    runExec(`
      INSERT INTO references_ads (id, title, type, url, thumbnail, brand, source)
      VALUES (?, ?, 'video', ?, ?, ?, 'famous')
    `, [id, ad.title, url, thumbnail, ad.brand]);

    // Añadir tags
    for (const tagName of ad.tags) {
      const tagResult = runQuery('SELECT id FROM tags WHERE name = ?', [tagName]);
      if (tagResult.length > 0) {
        runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [id, tagResult[0].id]);
      }
    }

    added++;
    process.stdout.write(`\r  Añadidos: ${added}/${FAMOUS_ADS.length}`);
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
