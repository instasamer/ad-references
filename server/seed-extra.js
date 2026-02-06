/**
 * MÁS ANUNCIOS - Expansión de la base de datos
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../database.sqlite');

const EXTRA_ADS = [
  // === NIKE RECIENTES ===
  { yt: 'WYP9AGtLvRg', brand: 'Nike', title: 'Just Do It - Original 1988', tags: ['deportes', 'inspirador', 'spot-tv'] },
  { yt: 'ewc3vbSlPcI', brand: 'Nike', title: 'Unlimited You', tags: ['deportes', 'inspirador', 'spot-tv'] },
  { yt: 'BrfAWHHVz50', brand: 'Nike', title: 'Dream Crazier', tags: ['deportes', 'inspirador', 'emocional'] },
  { yt: '1vp5P4_7e5A', brand: 'Nike', title: 'Equality', tags: ['deportes', 'emocional', 'provocador'] },
  { yt: 'QMv9Xe-hZts', brand: 'Nike', title: 'Never Too Far Down', tags: ['deportes', 'inspirador'] },
  { yt: 'Hs1Dba7VT9A', brand: 'Nike', title: 'Play New', tags: ['deportes', 'humor'] },
  { yt: 'WJ-ef_gdlrE', brand: 'Nike', title: 'Winning Isn\'t for Everyone', tags: ['deportes', 'provocador'] },

  // === APPLE RECIENTES ===
  { yt: 'rJ4X9hDyS7k', brand: 'Apple', title: 'Shot on iPhone - Night Mode', tags: ['tecnologia', 'fotografia', 'minimalista'] },
  { yt: 'GEZhD3J89ZE', brand: 'Apple', title: 'Behind the Mac', tags: ['tecnologia', 'inspirador'] },
  { yt: 'TJ1SDXbij8Y', brand: 'Apple', title: 'Privacy - Tracked', tags: ['tecnologia', 'humor'] },
  { yt: 'bvtwWhKdxhM', brand: 'Apple', title: 'Apple Watch - 911', tags: ['tecnologia', 'emocional'] },
  { yt: 'nppCPkwTMlQ', brand: 'Apple', title: 'Sway - AirPods', tags: ['tecnologia', 'spot-tv'] },
  { yt: 'h2R-MxDNn6k', brand: 'Apple', title: 'Fumble - iPhone', tags: ['tecnologia', 'humor'] },

  // === COCA-COLA RECIENTES ===
  { yt: 'CYNZQhf7yg8', brand: 'Coca-Cola', title: 'Real Magic - Gamers', tags: ['alimentacion', 'juvenil'] },
  { yt: 'xdPFJpgZSs8', brand: 'Coca-Cola', title: 'Open Like Never Before', tags: ['alimentacion', 'emocional'] },
  { yt: 'iFsN4-S1Gkw', brand: 'Coca-Cola', title: 'The Letter', tags: ['alimentacion', 'emocional'] },
  { yt: 'NfOIAZXZhZ8', brand: 'Coca-Cola', title: 'Masterpiece', tags: ['alimentacion', 'animacion'] },

  // === SAMSUNG RECIENTES ===
  { yt: 'fJhXLLBbSgw', brand: 'Samsung', title: 'Unfold Your World', tags: ['tecnologia', 'spot-tv'] },
  { yt: 'HQKHAYz9EBE', brand: 'Samsung', title: 'The New Normal', tags: ['tecnologia', 'emocional'] },
  { yt: 'JdBFjvegJJU', brand: 'Samsung', title: 'On a New Level', tags: ['tecnologia', 'celebrity'] },

  // === GOOGLE RECIENTES ===
  { yt: 'hlCrcMeVZHs', brand: 'Google', title: 'Get Back To What You Love', tags: ['tecnologia', 'emocional'] },
  { yt: 'GILvyiWB7xY', brand: 'Google', title: 'Fixed on Pixel', tags: ['tecnologia', 'humor'] },
  { yt: 'nPnWYzOuXdo', brand: 'Google', title: 'Most Searched', tags: ['tecnologia', 'emocional'] },

  // === AMAZON RECIENTES ===
  { yt: 'OFpYj0E-yb4', brand: 'Amazon', title: 'Saving Sawyer', tags: ['tecnologia', 'emocional'] },
  { yt: 'txPnFIDjJi0', brand: 'Amazon', title: 'Mind Reader', tags: ['tecnologia', 'humor'] },
  { yt: 'q1JqQl9EKDU', brand: 'Amazon', title: 'Welcome Back Old Friend', tags: ['tecnologia', 'emocional'] },

  // === MERCEDES RECIENTES ===
  { yt: 'y4FRr_LVMdY', brand: 'Mercedes-Benz', title: 'The Journey That Changed Everything', tags: ['automocion', 'emocional'] },
  { yt: 'xgdXQbDbIpE', brand: 'Mercedes-Benz', title: 'Last Day', tags: ['automocion', 'emocional'] },
  { yt: 'WcIEyPJ7rlE', brand: 'Mercedes-Benz', title: 'Bertha Benz', tags: ['automocion', 'inspirador'] },

  // === BMW RECIENTES ===
  { yt: 'TnSch7kEfSA', brand: 'BMW', title: 'The Calm', tags: ['automocion', 'minimalista'] },
  { yt: 'AVf9bYsJEXw', brand: 'BMW', title: 'Father & Son', tags: ['automocion', 'emocional'] },
  { yt: 'MpwXSE2pQu4', brand: 'BMW', title: 'Zeus & Hera', tags: ['automocion', 'humor', 'celebrity'] },

  // === ADIDAS RECIENTES ===
  { yt: 'ey23ZYqvVmg', brand: 'Adidas', title: 'Impossible Is Nothing', tags: ['deportes', 'inspirador'] },
  { yt: 'IwL3aOr8TUQ', brand: 'Adidas', title: 'End Plastic Waste', tags: ['deportes', 'educacion'] },
  { yt: 'b5C-7jxAmm8', brand: 'Adidas', title: 'Ready For Sport', tags: ['deportes', 'spot-tv'] },

  // === MCDONALD'S RECIENTES ===
  { yt: 'rDqXwUS402I', brand: 'McDonald\'s', title: 'Famous Orders', tags: ['alimentacion', 'celebrity'] },
  { yt: 'Gc6_k3RRvW8', brand: 'McDonald\'s', title: 'The Menu Hacks', tags: ['alimentacion', 'humor'] },
  { yt: 'eTcCqKtO9pY', brand: 'McDonald\'s', title: 'Travis Scott', tags: ['alimentacion', 'celebrity'] },

  // === PEPSI RECIENTES ===
  { yt: 'pKB5MNi-zy8', brand: 'Pepsi', title: 'Road to Super Bowl', tags: ['alimentacion', 'celebrity', 'spot-tv'] },
  { yt: 'dIE26OHXjfQ', brand: 'Pepsi', title: 'The Weeknd - Blinding Lights', tags: ['alimentacion', 'celebrity'] },

  // === AUDI RECIENTES ===
  { yt: 'Td6eFy3MLYM', brand: 'Audi', title: 'Let It Go - e-tron', tags: ['automocion', 'emocional'] },
  { yt: 'KYwEvbJl9Ko', brand: 'Audi', title: 'Cashew', tags: ['automocion', 'humor'] },

  // === VOLKSWAGEN RECIENTES ===
  { yt: '7sWPHKU1XZU', brand: 'Volkswagen', title: 'Electric Driving', tags: ['automocion', 'emocional'] },
  { yt: 'KMl5l6mOySU', brand: 'Volkswagen', title: 'Hello Light', tags: ['automocion', 'emocional'] },

  // === BUDWEISER RECIENTES ===
  { yt: 'x2_VP14RWoA', brand: 'Budweiser', title: 'Clydesdale Reunion', tags: ['alimentacion', 'emocional'] },
  { yt: 'TQTnr-uNiV4', brand: 'Budweiser', title: 'Typical American', tags: ['alimentacion', 'emocional'] },

  // === HEINEKEN RECIENTES ===
  { yt: 'ErBTlOJqXiI', brand: 'Heineken', title: 'The Night Belongs to Lovers', tags: ['alimentacion', 'emocional'] },
  { yt: 'zTfcHxCijfk', brand: 'Heineken', title: 'Shutter Ads', tags: ['alimentacion', 'humor'] },

  // === UBER/LYFT ===
  { yt: 'W_tHv3mxhSM', brand: 'Uber', title: 'Move What Matters', tags: ['tecnologia', 'emocional'] },
  { yt: 'lVKgwJJ3_Ow', brand: 'Uber Eats', title: 'Wayne\'s World', tags: ['tecnologia', 'humor', 'celebrity'] },
  { yt: 'GcmS3N3IGAQ', brand: 'Lyft', title: 'It\'s a New Mode', tags: ['tecnologia', 'humor'] },

  // === STREAMING ===
  { yt: 'WVDQEoe6ZWY', brand: 'Netflix', title: 'Wednesday Dance', tags: ['entretenimiento', 'juvenil'] },
  { yt: 'bEVY_lonKf4', brand: 'Disney+', title: 'The Streaming Home', tags: ['entretenimiento', 'emocional'] },
  { yt: 'bkJMg0d7xHs', brand: 'HBO Max', title: 'Where the Icons Are', tags: ['entretenimiento', 'lujoso'] },

  // === DEPORTES ===
  { yt: 'Ot8ngl_3apk', brand: 'Gatorade', title: 'Hard Work', tags: ['alimentacion', 'deportes', 'inspirador'] },
  { yt: 'R-Rf6vHHPPc', brand: 'Gatorade', title: 'The Boy Who Learned to Fly', tags: ['alimentacion', 'deportes', 'animacion'] },
  { yt: 'Kcc4cRW-PL4', brand: 'Under Armour', title: 'The Only Way Is Through', tags: ['deportes', 'inspirador'] },
  { yt: 'qr4MNRX-sQQ', brand: 'Puma', title: 'Only See Great', tags: ['deportes', 'inspirador'] },

  // === BELLEZA ===
  { yt: 'D8K90hX7fLo', brand: 'Dove', title: 'Cost of Beauty', tags: ['belleza', 'emocional', 'provocador'] },
  { yt: 'A8MO7fkZc5o', brand: 'Dove', title: 'Reverse Selfie', tags: ['belleza', 'emocional'] },
  { yt: 'sClGg2h9FVQ', brand: 'Dove', title: 'Toxic Influence', tags: ['belleza', 'emocional'] },
  { yt: 'QdXNHJ3e3oA', brand: 'Old Spice', title: 'School of Swagger', tags: ['belleza', 'humor'] },
  { yt: 'Dc3sKwwAaCU', brand: 'Old Spice', title: 'Night Panther', tags: ['belleza', 'humor'] },

  // === RETAIL ===
  { yt: 'nRpN4mUtbQQ', brand: 'IKEA', title: 'Proudly Second Best', tags: ['hogar', 'emocional'] },
  { yt: 'D1aYDc9k8L8', brand: 'IKEA', title: 'Fortune Favours the Frugal', tags: ['hogar', 'humor'] },
  { yt: 'vJ2rcXr8Qmo', brand: 'Target', title: 'Run and Done', tags: ['moda', 'humor'] },

  // === SEGUROS ===
  { yt: 'RlwlV4hcBac', brand: 'GEICO', title: 'Caveman', tags: ['finanzas', 'humor'] },
  { yt: 'zdA__2tKoIU', brand: 'Progressive', title: 'Sign Spinner', tags: ['finanzas', 'humor'] },
  { yt: 'e0fv_g9bQI8', brand: 'State Farm', title: 'Like a Good Neighbor', tags: ['finanzas', 'humor'] },
  { yt: '1Cj7NSoUFH0', brand: 'Allstate', title: 'Mayhem', tags: ['finanzas', 'humor'] },

  // === AIRLINES ===
  { yt: 'K_P7rmJ-J_8', brand: 'British Airways', title: 'You Make Us Fly', tags: ['viajes', 'emocional'] },
  { yt: 'h5y6pHfH5FI', brand: 'Turkish Airlines', title: 'Pangea', tags: ['viajes', 'emocional'] },
  { yt: 'rYKvT4kvJIc', brand: 'Emirates', title: 'Don\'t Stop Me Now', tags: ['viajes', 'lujoso'] },
  { yt: 'RkjHDBLmHz0', brand: 'KLM', title: '100 Years', tags: ['viajes', 'emocional'] },

  // === TECH STARTUPS ===
  { yt: 'b2F-DItXtZs', brand: 'Slack', title: 'So Yeah, We Tried Slack', tags: ['tecnologia', 'humor'] },
  { yt: 'GIkpx4lzFxk', brand: 'Mailchimp', title: 'Did You Mean', tags: ['tecnologia', 'humor'] },
  { yt: 'k3JZI-sLUKE', brand: 'Zoom', title: 'Meet Happy', tags: ['tecnologia', 'emocional'] },
  { yt: 'SWd-8c5UQac', brand: 'Monday.com', title: 'Work Without Limits', tags: ['tecnologia', 'humor'] },

  // === FOOD & BEVERAGE ===
  { yt: 'UwBvXQz0BWE', brand: 'KFC', title: 'Finger Lickin Good Pause', tags: ['alimentacion', 'humor'] },
  { yt: '9fDHOdLA9iA', brand: 'Burger King', title: 'Confusing Times', tags: ['alimentacion', 'humor'] },
  { yt: 'qvtHOr77_DY', brand: 'Taco Bell', title: 'The Bell', tags: ['alimentacion', 'provocador'] },
  { yt: '79l_TnO6UxY', brand: 'Wendy\'s', title: 'We Beefin', tags: ['alimentacion', 'humor'] },
  { yt: '3vDWWy4CMhE', brand: 'Skittles', title: 'Apology', tags: ['alimentacion', 'humor'] },
  { yt: 'sQCfWXoMLi0', brand: 'Doritos', title: 'Flat Matthew', tags: ['alimentacion', 'humor', 'celebrity'] },
  { yt: 'EBQBSvfBCwM', brand: 'M&Ms', title: 'Come Together', tags: ['alimentacion', 'emocional'] },

  // === CHRISTMAS ADS 2023-2024 ===
  { yt: 'jqYiWRPlPEo', brand: 'John Lewis', title: 'Snapper', tags: ['moda', 'emocional'] },
  { yt: 'x2EdhXYWz84', brand: 'Coca-Cola', title: 'The World Needs More Santas', tags: ['alimentacion', 'emocional'] },
  { yt: 'mMZA2rP5iWE', brand: 'Amazon', title: 'Joy Ride', tags: ['tecnologia', 'emocional'] },
  { yt: 'pUmPJQm-q8U', brand: 'Apple', title: 'Fuzzy Feelings', tags: ['tecnologia', 'emocional'] },
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
  console.log('SEED EXTRA - Más anuncios recientes');
  console.log('='.repeat(50));

  await initDb();

  const before = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;
  console.log(`Referencias antes: ${before}`);
  console.log(`Anuncios a añadir: ${EXTRA_ADS.length}\n`);

  for (const ad of EXTRA_ADS) {
    const url = `https://www.youtube.com/watch?v=${ad.yt}`;
    const thumbnail = `https://img.youtube.com/vi/${ad.yt}/maxresdefault.jpg`;

    const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [url]);
    if (existing.length > 0) continue;

    const id = uuidv4();

    runExec(`
      INSERT INTO references_ads (id, title, type, url, thumbnail, brand, source)
      VALUES (?, ?, 'video', ?, ?, ?, 'extra')
    `, [id, ad.title, url, thumbnail, ad.brand]);

    for (const tagName of ad.tags) {
      const tagResult = runQuery('SELECT id FROM tags WHERE name = ?', [tagName]);
      if (tagResult.length > 0) {
        runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [id, tagResult[0].id]);
      }
    }

    added++;
    process.stdout.write(`\r  Añadidos: ${added}/${EXTRA_ADS.length}`);
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
