/**
 * MÁS ANUNCIOS - Colección extendida de publicidad
 * Más marcas, más países, más épocas
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../database.sqlite');

// Más anuncios variados por categoría
const MORE_ADS = [
  // === FINANZAS ===
  { yt: 'vBkBS4O3yvY', brand: 'State Farm', title: 'Jake from State Farm', tags: ['finanzas', 'humor'] },
  { yt: 'G_Msszgx7bg', brand: 'GEICO', title: 'Hump Day', tags: ['finanzas', 'humor'] },
  { yt: 'KhGWbt1dAKQ', brand: 'Allstate', title: 'Mayhem', tags: ['finanzas', 'humor'] },
  { yt: 'bFksxx4YPko', brand: 'Progressive', title: 'Flo Commercials', tags: ['finanzas', 'humor'] },
  { yt: 'b6UAYGxiRwU', brand: 'MasterCard', title: 'Priceless', tags: ['finanzas', 'emocional'] },
  { yt: '2yckqyg75oE', brand: 'American Express', title: 'Small Business Saturday', tags: ['finanzas', 'inspirador'] },
  { yt: 'wD9SVtY0V8I', brand: 'Visa', title: 'Go World', tags: ['finanzas', 'deportes'] },

  // === RETAIL ===
  { yt: 'yk7IDVzLiQo', brand: 'Target', title: 'Everyday Collection', tags: ['moda', 'juvenil'] },
  { yt: '3XviR7esUvo', brand: 'Walmart', title: 'Famous Cars', tags: ['hogar', 'humor'] },
  { yt: 'SfLV8hD7zPs', brand: 'ALDI', title: 'Like Brands', tags: ['alimentacion', 'humor'] },
  { yt: 'tAp9BKosZXs', brand: 'Lidl', title: 'Big on Quality', tags: ['alimentacion', 'humor'] },
  { yt: 'qfNReBBUk_w', brand: 'Sainsbury\'s', title: 'Christmas 1914', tags: ['alimentacion', 'emocional'] },
  { yt: 'NWF2JBb1bvM', brand: 'Waitrose', title: 'Christmas Together', tags: ['alimentacion', 'emocional'] },

  // === BELLEZA ADICIONAL ===
  { yt: 'o3mP3mJDL2k', brand: 'L\'Oreal', title: 'Because You\'re Worth It', tags: ['belleza', 'inspirador'] },
  { yt: 'FqhQl_sJw3Y', brand: 'Maybelline', title: 'Maybe It\'s Maybelline', tags: ['belleza', 'celebrity'] },
  { yt: '8DYje57V_BY', brand: 'CoverGirl', title: 'Easy Breezy Beautiful', tags: ['belleza', 'celebrity'] },
  { yt: 'wVG_idqbNdE', brand: 'Gillette', title: 'The Best Men Can Be', tags: ['belleza', 'emocional'] },
  { yt: '0whUi-lmywE', brand: 'Pantene', title: 'Strong is Beautiful', tags: ['belleza', 'inspirador'] },
  { yt: 'gT1wLOI5Xtc', brand: 'Head & Shoulders', title: 'Troy Polamalu', tags: ['belleza', 'celebrity', 'deportes'] },

  // === TELECOMUNICACIONES ===
  { yt: 'gHGDN9-oFJE', brand: 'T-Mobile', title: 'Un-carrier', tags: ['tecnologia', 'humor'] },
  { yt: '6VGLvE3xt0Y', brand: 'Verizon', title: 'Can You Hear Me Now', tags: ['tecnologia', 'humor'] },
  { yt: 'nfHuZ5qrYX4', brand: 'AT&T', title: 'It\'s Not Complicated', tags: ['tecnologia', 'humor'] },
  { yt: 'JYuagGp2fsg', brand: 'Sprint', title: 'Framily Plan', tags: ['tecnologia', 'humor'] },
  { yt: 'sZsJyCyGBSI', brand: 'O2', title: 'Be More Dog', tags: ['tecnologia', 'humor'] },
  { yt: 'bhTL_Qj4voo', brand: 'Three', title: 'Moonwalking Pony', tags: ['tecnologia', 'humor'] },
  { yt: 'x1MJlmzYVzk', brand: 'EE', title: 'Kevin Bacon', tags: ['tecnologia', 'celebrity'] },

  // === JUEGOS Y ENTRETENIMIENTO ===
  { yt: 'BSLPH9d-jsI', brand: 'PlayStation', title: 'For the Players', tags: ['entretenimiento', 'emocional'] },
  { yt: '0L8RGy3FWWo', brand: 'Xbox', title: 'Jump Ahead', tags: ['entretenimiento', 'inspirador'] },
  { yt: 'tYG-7T2LVDc', brand: 'Nintendo', title: 'Switch Super Bowl', tags: ['entretenimiento', 'juvenil'] },
  { yt: 'dJ-JW-_hFSg', brand: 'FIFA', title: 'Live Your Goals', tags: ['entretenimiento', 'deportes'] },
  { yt: 'KsLxkZ88_tw', brand: 'EA Sports', title: 'It\'s in the Game', tags: ['entretenimiento', 'deportes'] },
  { yt: 'U_yJSv5SVLI', brand: 'Ubisoft', title: 'Assassin\'s Creed', tags: ['entretenimiento', 'spot-tv'] },

  // === BEBIDAS ALCOHÓLICAS ===
  { yt: 'xNzXze5Yza8', brand: 'Jack Daniel\'s', title: 'Gentleman Jack', tags: ['alimentacion', 'lujoso'] },
  { yt: 'XPoP5J96nKw', brand: 'Johnnie Walker', title: 'Keep Walking', tags: ['alimentacion', 'inspirador'] },
  { yt: 'qB8JpVVXdYw', brand: 'Jameson', title: 'Sine Metu', tags: ['alimentacion', 'inspirador'] },
  { yt: '4sZuN0xXWLc', brand: 'Stella Artois', title: 'Reassuringly Expensive', tags: ['alimentacion', 'lujoso'] },
  { yt: 'CPNK0VspQ0M', brand: 'Peroni', title: 'House of Peroni', tags: ['alimentacion', 'lujoso'] },
  { yt: 'CVZwz8n_tLQ', brand: 'Beck\'s', title: 'Different by Choice', tags: ['alimentacion', 'juvenil'] },
  { yt: 'Y63-9AqlYTU', brand: 'Modelo', title: 'Brewed for Those With Fighting Spirit', tags: ['alimentacion', 'inspirador'] },

  // === COMIDA RÁPIDA ===
  { yt: 'lY-BR-KQqSY', brand: 'Burger King', title: 'Whopper Detour', tags: ['alimentacion', 'humor'] },
  { yt: 'pvz8uvG-A3o', brand: 'Taco Bell', title: 'Live Más', tags: ['alimentacion', 'juvenil'] },
  { yt: 'P_YFq9X2QM4', brand: 'KFC', title: 'Finger Lickin Good', tags: ['alimentacion', 'humor'] },
  { yt: 'lz6r4HW7gCc', brand: 'Subway', title: 'Eat Fresh', tags: ['alimentacion', 'salud'] },
  { yt: 'Jk8NmJJRsEI', brand: 'Wendy\'s', title: 'Never Frozen', tags: ['alimentacion', 'serio'] },
  { yt: 'WCODhRQD45U', brand: 'Chick-fil-A', title: 'Eat Mor Chikin', tags: ['alimentacion', 'humor'] },
  { yt: 'QZ0K2z9-Mrc', brand: 'Pizza Hut', title: 'No One OutPizzas', tags: ['alimentacion', 'humor'] },
  { yt: 'CJEoASUMZbI', brand: 'Domino\'s', title: 'Pizza Turnaround', tags: ['alimentacion', 'serio'] },

  // === CEREAL Y SNACKS ===
  { yt: 'zwiBtXodkns', brand: 'Cheerios', title: 'Gracie', tags: ['alimentacion', 'emocional'] },
  { yt: 'ieFfJJbH9Fs', brand: 'Frosted Flakes', title: 'They\'re Grrreat', tags: ['alimentacion', 'humor'] },
  { yt: 'HfWB2CrxOb0', brand: 'Rice Krispies', title: 'Snap Crackle Pop', tags: ['alimentacion', 'retro-90s'] },
  { yt: 'OGldNpngDws', brand: 'Oreo', title: 'Wonderfilled', tags: ['alimentacion', 'emocional'] },
  { yt: 'PmDTtkZlMwM', brand: 'Skittles', title: 'Taste the Rainbow', tags: ['alimentacion', 'provocador'] },
  { yt: 'GjpX8YZGK9w', brand: 'M&M\'s', title: 'Spokescandies', tags: ['alimentacion', 'humor'] },
  { yt: 'T7-nSMdNiXI', brand: 'Twix', title: 'Left or Right', tags: ['alimentacion', 'humor'] },

  // === LÁCTEOS Y BEBIDAS NO ALCOHÓLICAS ===
  { yt: 'OLSsswr6z9Y', brand: 'Got Milk?', title: 'Aaron Burr', tags: ['alimentacion', 'humor'] },
  { yt: 'gDW_Hj2K0wo', brand: 'Gatorade', title: 'Be Like Mike', tags: ['alimentacion', 'celebrity', 'deportes'] },
  { yt: '_Gs2T_gqLqM', brand: 'Powerade', title: 'There\'s Power In Every Game', tags: ['alimentacion', 'deportes'] },
  { yt: 'Bq-lY4J8BtQ', brand: 'Mountain Dew', title: 'Do the Dew', tags: ['alimentacion', 'juvenil'] },
  { yt: '0pnwE_Oy5WI', brand: '7UP', title: 'Make 7 Up Yours', tags: ['alimentacion', 'humor'] },
  { yt: 'NLriML-VwLs', brand: 'Sprite', title: 'Obey Your Thirst', tags: ['alimentacion', 'juvenil'] },
  { yt: '2msbfN81Gm0', brand: 'Tropicana', title: 'Squeeze', tags: ['alimentacion', 'salud'] },

  // === AUTOS ADICIONALES ===
  { yt: 'c4BLVznuWnU', brand: 'Toyota', title: 'Let\'s Go Places', tags: ['automocion', 'inspirador'] },
  { yt: 'WqnhN2Rzaqc', brand: 'Lexus', title: 'Experience Amazing', tags: ['automocion', 'lujoso'] },
  { yt: 'Rs9dBLNXE_4', brand: 'Hyundai', title: 'Dad\'s Sixth Sense', tags: ['automocion', 'emocional'] },
  { yt: 'r8LZJRKY6fQ', brand: 'Kia', title: 'Space Babies', tags: ['automocion', 'humor'] },
  { yt: 'kF1-ViLK1q4', brand: 'Subaru', title: 'Love Promise', tags: ['automocion', 'emocional'] },
  { yt: 'kU3m-vVVHso', brand: 'Mazda', title: 'Driving Matters', tags: ['automocion', 'emocional'] },
  { yt: 'qG1YPsKVFXI', brand: 'Jeep', title: 'The Middle - Springsteen', tags: ['automocion', 'emocional'] },
  { yt: 'LhaYXXSU-Qw', brand: 'Ram Trucks', title: 'Farmer - Paul Harvey', tags: ['automocion', 'emocional'] },
  { yt: 'On8p-1XlNgo', brand: 'Land Rover', title: 'Above and Beyond', tags: ['automocion', 'lujoso'] },
  { yt: 'Hy8FBDAMRhU', brand: 'Jaguar', title: 'Good to Be Bad', tags: ['automocion', 'lujoso', 'celebrity'] },
  { yt: 'pXbTMx8eTXw', brand: 'Porsche', title: 'The Heist', tags: ['automocion', 'spot-tv'] },
  { yt: 'ZPISdOhFqOM', brand: 'Ferrari', title: 'We Are', tags: ['automocion', 'lujoso'] },
  { yt: 'dM4SqIEYOeE', brand: 'Lamborghini', title: 'With Italy For Italy', tags: ['automocion', 'lujoso'] },

  // === MODA Y LUJO ===
  { yt: 'Xn0B2OwpRYg', brand: 'Chanel', title: 'No. 5 - Marilyn', tags: ['moda', 'lujoso'] },
  { yt: 'K7IiflDLtBg', brand: 'Dior', title: 'J\'adore - Charlize', tags: ['moda', 'lujoso', 'celebrity'] },
  { yt: 'VL9JG3SU3OM', brand: 'Gucci', title: 'The Ritual', tags: ['moda', 'lujoso'] },
  { yt: 'Ky4HrWJl2gk', brand: 'Louis Vuitton', title: 'A Journey', tags: ['moda', 'lujoso'] },
  { yt: 'xycvEQLweFg', brand: 'Prada', title: 'Candy', tags: ['moda', 'lujoso'] },
  { yt: 'y35Rrt4AMfI', brand: 'Versace', title: 'Eros', tags: ['moda', 'lujoso'] },
  { yt: 'C8-GWJmR4t4', brand: 'Armani', title: 'Acqua di Gio', tags: ['moda', 'lujoso'] },
  { yt: 'KZ5A0d8NmE8', brand: 'Burberry', title: 'The Tale of Thomas Burberry', tags: ['moda', 'lujoso'] },
  { yt: 'c8Qg5gVFbZc', brand: 'H&M', title: 'Come Together - Wes Anderson', tags: ['moda', 'celebrity'] },
  { yt: 'lRKUHqmCb5M', brand: 'Zara', title: 'Dear America', tags: ['moda', 'minimalista'] },
  { yt: 'NQGgXLKEl6g', brand: 'Uniqlo', title: 'LifeWear', tags: ['moda', 'minimalista'] },
  { yt: 'pbS31FXV5Rc', brand: 'GAP', title: 'Dress Normal', tags: ['moda', 'minimalista'] },

  // === AIRLINES ===
  { yt: 'Gg6d8hDZu6M', brand: 'Emirates', title: 'Hello Tomorrow', tags: ['viajes', 'lujoso'] },
  { yt: 'sYMqVwsewSg', brand: 'Qatar Airways', title: 'Going Places Together', tags: ['viajes', 'lujoso'] },
  { yt: 'V7fqaNNXQMY', brand: 'Singapore Airlines', title: 'A Great Way To Fly', tags: ['viajes', 'lujoso'] },
  { yt: 'ZpkF5nKQBz8', brand: 'Delta', title: 'Keep Climbing', tags: ['viajes', 'emocional'] },
  { yt: 'qLKVJpzIfTU', brand: 'United', title: 'Good Leads the Way', tags: ['viajes', 'inspirador'] },
  { yt: 'gm_w31H3ILw', brand: 'Southwest', title: 'Wanna Get Away', tags: ['viajes', 'humor'] },
  { yt: 'H5N6O1wZr3c', brand: 'JetBlue', title: 'Fly-Fi', tags: ['viajes', 'humor'] },
  { yt: 'cU-eAzNp5Hw', brand: 'Turkish Airlines', title: 'Widen Your World', tags: ['viajes', 'emocional'] },

  // === HOTELES ===
  { yt: 'mSHUIEDBbl4', brand: 'Marriott', title: 'Travel Brilliantly', tags: ['viajes', 'lujoso'] },
  { yt: 'dPn23IVWjI8', brand: 'Hilton', title: 'Stop Clicking Around', tags: ['viajes', 'humor'] },
  { yt: 'u7qKlwpQ6to', brand: 'Airbnb', title: 'Belong Anywhere', tags: ['viajes', 'emocional'] },
  { yt: 'tBVjF6HnEZI', brand: 'Booking.com', title: 'Yeah', tags: ['viajes', 'humor'] },

  // === FARMACIA ===
  { yt: 'WNivGoHtm-A', brand: 'Tylenol', title: 'How We Family', tags: ['salud', 'emocional'] },
  { yt: 'X27msDpxdwM', brand: 'Advil', title: 'Believe in What Moves You', tags: ['salud', 'inspirador'] },
  { yt: 'jWBB_Vr1y7A', brand: 'Mucinex', title: 'Mr. Mucus', tags: ['salud', 'humor'] },
  { yt: 'Vos_jzJykgo', brand: 'Pepto-Bismol', title: 'Upset Stomach', tags: ['salud', 'humor'] },

  // === LIMPIEZA HOGAR ===
  { yt: 'Dcbyy9luVqI', brand: 'Mr. Clean', title: 'Cleaner of Your Dreams', tags: ['hogar', 'humor'] },
  { yt: 'jZHjflzC5wY', brand: 'Tide', title: 'It\'s a Tide Ad', tags: ['hogar', 'humor'] },
  { yt: 'rV_m3f-4_D0', brand: 'Febreze', title: 'Breathe Happy', tags: ['hogar', 'humor'] },
  { yt: 'uB6NmyH9gN0', brand: 'Swiffer', title: 'Morty', tags: ['hogar', 'emocional'] },
  { yt: 'Bl6X3rU2lWE', brand: 'Lysol', title: 'Protect Like a Mother', tags: ['hogar', 'emocional'] },

  // === LATINOAMÉRICA ===
  { yt: 'D8K90hX7fLo', brand: 'Quilmes', title: 'El Sabor del Encuentro', tags: ['alimentacion', 'emocional'] },
  { yt: 'sNPnbI1arSE', brand: 'Inca Kola', title: 'Creatividad Peruana', tags: ['alimentacion', 'inspirador'] },
  { yt: 'DF4SClbWAw8', brand: 'Banco Galicia', title: 'Héroes Anónimos', tags: ['finanzas', 'emocional'] },
  { yt: 'r2ADqL2jSLc', brand: 'Cerveza Poker', title: 'Amigos', tags: ['alimentacion', 'humor'] },
  { yt: 'hD9tZ7c9HMY', brand: 'Fernet Branca', title: 'Cultura Branca', tags: ['alimentacion', 'juvenil'] },

  // === UK CLASSICS ===
  { yt: 'oS5dZ75OlHY', brand: 'Comparethemarket', title: 'Meerkat', tags: ['finanzas', 'humor'] },
  { yt: 'Aq-G4HATiC8', brand: 'GoCompare', title: 'Gio Compario', tags: ['finanzas', 'humor'] },
  { yt: 'R2_f-c2v-ew', brand: 'Churchill', title: 'Oh Yes!', tags: ['finanzas', 'humor'] },
  { yt: 'D1UY7eDRXrs', brand: 'Marmite', title: 'Love It or Hate It', tags: ['alimentacion', 'provocador'] },
  { yt: 'TnzFRV1LwIo', brand: 'Paddy Power', title: 'Mischief', tags: ['entretenimiento', 'provocador'] },

  // === CHARITY & NGO ===
  { yt: 'DLzxrzFCyOs', brand: 'WWF', title: 'Last Selfie', tags: ['educacion', 'emocional'] },
  { yt: 'K3dAEFJQqN4', brand: 'UNICEF', title: 'Good Guys', tags: ['educacion', 'emocional'] },
  { yt: 'V7Ox7JzPe3Q', brand: 'Amnesty', title: 'Signatures', tags: ['educacion', 'serio'] },
  { yt: 'xMGtpzAr6OI', brand: 'Truth', title: 'Be the Generation', tags: ['educacion', 'juvenil'] },
  { yt: 'dH1E6AOqhvg', brand: 'ASPCA', title: 'In the Arms of an Angel', tags: ['educacion', 'emocional'] },
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
  console.log('SEED - Más Anuncios Variados');
  console.log('='.repeat(50));

  await initDb();

  const before = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;
  console.log(`Referencias antes: ${before}`);
  console.log(`Anuncios a añadir: ${MORE_ADS.length}\n`);

  for (const ad of MORE_ADS) {
    const url = `https://www.youtube.com/watch?v=${ad.yt}`;
    const thumbnail = `https://img.youtube.com/vi/${ad.yt}/maxresdefault.jpg`;

    const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [url]);
    if (existing.length > 0) continue;

    const id = uuidv4();

    runExec(`
      INSERT INTO references_ads (id, title, type, url, thumbnail, brand, source)
      VALUES (?, ?, 'video', ?, ?, ?, 'curated')
    `, [id, ad.title, url, thumbnail, ad.brand]);

    for (const tagName of ad.tags) {
      const tagResult = runQuery('SELECT id FROM tags WHERE name = ?', [tagName]);
      if (tagResult.length > 0) {
        runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [id, tagResult[0].id]);
      }
    }

    added++;
    process.stdout.write(`\r  Añadidos: ${added}/${MORE_ADS.length}`);
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
