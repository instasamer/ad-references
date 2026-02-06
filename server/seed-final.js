/**
 * COLECCIÓN FINAL - Más anuncios para superar 1500+
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../database.sqlite');

const FINAL_ADS = [
  // === SUPER BOWL ADS ===
  { yt: '45kODxGl7no', brand: 'M&M\'s', title: 'I\'m Sexy and I Know It', tags: ['alimentacion', 'humor'] },
  { yt: 'TnpTcrtsN3U', brand: 'Coca-Cola', title: 'Super Bowl Showdown', tags: ['alimentacion', 'celebrity'] },
  { yt: 'cbP2N1BQdYc', brand: 'Chrysler', title: 'Imported from Detroit', tags: ['automocion', 'emocional'] },
  { yt: 'SKL254Y_jtc', brand: 'Chrysler', title: 'Halftime in America', tags: ['automocion', 'emocional'] },
  { yt: 'WYp9Eo9T3BA', brand: 'Avocados from Mexico', title: 'First Draft Ever', tags: ['alimentacion', 'humor'] },
  { yt: 'FM_xDO1x-ew', brand: 'Hyundai', title: 'Elevator', tags: ['automocion', 'humor'] },
  { yt: '_z-hEyVQDRA', brand: 'Oikos', title: 'Big Game Teaser', tags: ['alimentacion', 'celebrity'] },
  { yt: '7mGvNZNGnDA', brand: 'E*TRADE', title: 'Baby Trading', tags: ['finanzas', 'humor'] },
  { yt: 'OQSNhk5ICTI', brand: 'Nationwide', title: 'Dead Boy', tags: ['finanzas', 'emocional'] },
  { yt: 'z6sMW8_Ccw8', brand: 'TurboTax', title: 'Boston Tea Party', tags: ['finanzas', 'humor'] },
  { yt: 'Y9znA_dwjHw', brand: 'Squarespace', title: 'Who is JohnMalkovich', tags: ['tecnologia', 'celebrity'] },
  { yt: 'dP15zlyra3c', brand: 'Wix', title: 'Kung Fu Panda', tags: ['tecnologia', 'celebrity'] },
  { yt: 'e9pBK7qzYK0', brand: 'GoDaddy', title: 'Domains', tags: ['tecnologia', 'humor'] },
  { yt: '3VTtxCvxNmU', brand: 'T-Mobile', title: 'Dropping Calls', tags: ['tecnologia', 'humor'] },
  { yt: 'sPPK9OYJN34', brand: 'Sprint', title: 'Can You Hear Me Now Guy', tags: ['tecnologia', 'humor'] },
  { yt: 'F3_ANdPFVdQ', brand: 'Kia', title: 'Walken Closet', tags: ['automocion', 'celebrity'] },
  { yt: 'lS6lZ2oKlZE', brand: 'Honda', title: 'Yearbooks', tags: ['automocion', 'emocional'] },
  { yt: 'ewtbNmJoV70', brand: 'Jeep', title: 'Groundhog Day', tags: ['automocion', 'celebrity'] },
  { yt: 'p3CxSPMI36E', brand: 'Maserati', title: 'Strike', tags: ['automocion', 'lujoso'] },
  { yt: 'z5qXhBJJszA', brand: 'Lincoln', title: 'McConaughey', tags: ['automocion', 'celebrity'] },

  // === CHRISTMAS CLASSICS ===
  { yt: 'z5qLsBT0bIo', brand: 'Hershey\'s Kisses', title: 'Bells', tags: ['alimentacion', 'emocional'] },
  { yt: 'a2DB3J_FrlQ', brand: 'M&M\'s', title: 'Faint', tags: ['alimentacion', 'humor'] },
  { yt: 'gxPF9AeHqxs', brand: 'Folgers', title: 'Coming Home', tags: ['alimentacion', 'emocional'] },
  { yt: 'qhUNZ8vG_5A', brand: 'Campbell\'s', title: 'Snowman', tags: ['alimentacion', 'emocional'] },
  { yt: 'UUvBuLy0tCI', brand: 'Clairol', title: 'Herbal Essences', tags: ['belleza', 'humor'] },
  { yt: '2jqkk2JmF8Q', brand: 'Toys R Us', title: 'I Don\'t Wanna Grow Up', tags: ['entretenimiento', 'nostalgico'] },
  { yt: 'YqLr0Qy-DyE', brand: 'Norelco', title: 'Santa', tags: ['belleza', 'retro-80s'] },
  { yt: 'KqEVYbPw9lI', brand: 'Corona', title: 'O Tannenpalm', tags: ['alimentacion', 'emocional'] },
  { yt: 'iblELIQsYgI', brand: 'Publix', title: 'Thanksgiving', tags: ['alimentacion', 'emocional'] },
  { yt: 'awSuQCL3wPI', brand: 'Macy\'s', title: 'Believe', tags: ['moda', 'emocional'] },

  // === DECADES ===
  { yt: 'CTLlzHfMSEY', brand: 'Levi\'s', title: 'Spaceman', tags: ['moda', 'retro-90s'] },
  { yt: 'Eog5B2D6VWk', brand: 'Reebok', title: 'UBU', tags: ['deportes', 'retro-80s'] },
  { yt: 'Qdf9dW5q8mY', brand: 'Where\'s the Beef', title: 'Clara Peller', tags: ['alimentacion', 'retro-80s'] },
  { yt: 'owALEpLT7fg', brand: 'Miller Lite', title: 'Tastes Great Less Filling', tags: ['alimentacion', 'retro-80s'] },
  { yt: 'T3yPyc5ZdNs', brand: 'Energizer', title: 'Bunny', tags: ['hogar', 'retro-90s'] },
  { yt: 'I8BNOECHf9c', brand: 'Duracell', title: 'Toys', tags: ['hogar', 'retro-90s'] },
  { yt: 'ODXgGS50AH0', brand: 'Taco Bell', title: 'Chihuahua', tags: ['alimentacion', 'retro-90s'] },
  { yt: 'QhpydZjSKkE', brand: 'Pepsi', title: 'Cindy Crawford', tags: ['alimentacion', 'retro-90s'] },
  { yt: 'o-Mu9XWMQGE', brand: 'Got Milk?', title: 'Mustache', tags: ['alimentacion', 'retro-90s'] },
  { yt: 'RnxNKBrqhns', brand: 'Nike', title: 'Bo Knows', tags: ['deportes', 'retro-80s'] },

  // === EMOTIONAL STORIES ===
  { yt: 'qeipMoqLitY', brand: 'Extra Gum', title: 'Origami', tags: ['alimentacion', 'emocional'] },
  { yt: 'v74NCPjoxsk', brand: 'Edeka', title: 'Heimkommen', tags: ['alimentacion', 'emocional'] },
  { yt: 'PQNg8pnLqoQ', brand: 'Allegro', title: 'English for Beginners', tags: ['tecnologia', 'emocional'] },
  { yt: 'uT0KcGVB3Lw', brand: 'German Rail', title: 'Heimkommen', tags: ['viajes', 'emocional'] },
  { yt: 'zy-vwvQG_FI', brand: 'Budweiser', title: 'Brotherhood', tags: ['alimentacion', 'emocional'] },
  { yt: 'wf_BBvpEHOk', brand: 'Guinness', title: 'Cloud', tags: ['alimentacion', 'emocional'] },
  { yt: 'x4gBJW9UgMQ', brand: 'Bell\'s', title: 'Homecoming', tags: ['alimentacion', 'emocional'] },
  { yt: 'i1NfWIaYed8', brand: 'SickKids', title: 'Undeniable', tags: ['salud', 'emocional'] },
  { yt: 'ZJGcNjD_kxA', brand: 'NHS', title: 'Thank You', tags: ['salud', 'emocional'] },
  { yt: 'iRUdMNlzH8c', brand: 'Canadian Tire', title: 'Wheels', tags: ['hogar', 'emocional'] },

  // === ANIMATION ===
  { yt: 'pBLGMBd85xE', brand: 'Chipotle', title: 'Back to the Start', tags: ['alimentacion', 'animacion'] },
  { yt: 'lUtnas5ScSE', brand: 'Chipotle', title: 'Scarecrow', tags: ['alimentacion', 'animacion'] },
  { yt: '5Zq3MABRWrM', brand: 'John Lewis', title: 'Bear and Hare', tags: ['moda', 'animacion'] },
  { yt: 'wk2H3b2D_kk', brand: 'Gatorade', title: 'Replay', tags: ['alimentacion', 'emocional'] },
  { yt: 'DnQoH4o0v8w', brand: 'Hornbach', title: 'Hammer', tags: ['hogar', 'emocional'] },
  { yt: 'KgPU5Eg-3Wc', brand: 'Johnny Walker', title: 'Dear Brother', tags: ['alimentacion', 'animacion'] },
  { yt: 'L-kGFGVTRZg', brand: 'Lurpak', title: 'Adventure Awaits', tags: ['alimentacion', 'animacion'] },
  { yt: 'HJihi5rB_Ek', brand: 'Airbnb', title: 'Wall and Chain', tags: ['viajes', 'animacion'] },
  { yt: 'LwBMNpBwfvE', brand: 'Harvey Nichols', title: 'Walk of Shame', tags: ['moda', 'humor'] },
  { yt: 'Zv11L-ZfrSg', brand: 'Sainsbury\'s', title: 'Mog', tags: ['alimentacion', 'animacion'] },

  // === UK CHRISTMAS ===
  { yt: 'qKqSBm07KHs', brand: 'Marks & Spencer', title: 'Mrs Claus', tags: ['moda', 'emocional'] },
  { yt: '4qaTeHr7eDw', brand: 'Debenhams', title: 'You Shall', tags: ['moda', 'emocional'] },
  { yt: 'UzS8QKvZqYA', brand: 'Boots', title: 'Get Closer', tags: ['belleza', 'emocional'] },
  { yt: 'BNmj4tP5b4k', brand: 'Argos', title: 'Fools Gold', tags: ['hogar', 'emocional'] },
  { yt: 'SDqnbBGVUuw', brand: 'Very.co.uk', title: 'Get More out of Giving', tags: ['moda', 'emocional'] },
  { yt: 'fU_K3VpJxE8', brand: 'Heathrow', title: 'Bears', tags: ['viajes', 'emocional'] },
  { yt: 'U7RUPeSZd5k', brand: 'Aldi', title: 'Kevin the Carrot', tags: ['alimentacion', 'humor'] },
  { yt: 'EsJH0piVsWI', brand: 'Lidl', title: 'Big on a Christmas You Can Believe In', tags: ['alimentacion', 'emocional'] },
  { yt: 'nfWlot6h_JM', brand: 'Tesco', title: 'No Naughty List', tags: ['alimentacion', 'humor'] },
  { yt: '7qZl_5xHoBw', brand: 'Morrisons', title: 'Farmer Christmas', tags: ['alimentacion', 'emocional'] },

  // === CONTROVERSIAL ===
  { yt: 'koPmuEyP3a0', brand: 'Nike', title: 'Believe in Something', tags: ['deportes', 'provocador'] },
  { yt: 'UYaY2Kb_PKI', brand: 'Gillette', title: 'The Best Men Can Be', tags: ['belleza', 'provocador'] },
  { yt: 'WD8aZV5k5DA', brand: 'Pepsi', title: 'Kendall Jenner', tags: ['alimentacion', 'celebrity'] },
  { yt: 'pB-bN-RkJLM', brand: 'Peloton', title: 'The Gift That Gives Back', tags: ['deportes', 'emocional'] },
  { yt: 'SJ-x0c10h8M', brand: 'Burger King', title: 'Mouldy Whopper', tags: ['alimentacion', 'provocador'] },
  { yt: 'aXnuF5Ob4Oo', brand: 'Booking.com', title: 'Booking Right', tags: ['viajes', 'humor'] },
  { yt: 'C7JZ4F3zJdY', brand: 'Cards Against Humanity', title: 'SuperBowl Hole', tags: ['entretenimiento', 'provocador'] },
  { yt: 'FQe8MKcTv2U', brand: 'Patagonia', title: 'Vote the Environment', tags: ['moda', 'provocador'] },
  { yt: 'gL0lhWVSn1A', brand: 'REI', title: 'OptOutside', tags: ['moda', 'provocador'] },
  { yt: 'YIUvX4nFn4s', brand: 'Aerie', title: 'Real', tags: ['moda', 'inspirador'] },

  // === MUSIC IN ADS ===
  { yt: '0wFb9m3w4gU', brand: 'Sony Bravia', title: 'Balls', tags: ['tecnologia', 'emocional'] },
  { yt: 'FtWv_EbHk6c', brand: 'Sony Bravia', title: 'Paint', tags: ['tecnologia', 'emocional'] },
  { yt: 'vl_AoPGqaSw', brand: 'Sony Bravia', title: 'Bunnies', tags: ['tecnologia', 'emocional'] },
  { yt: 'cG8asOylxG4', brand: 'John Legend', title: 'Google Duo', tags: ['tecnologia', 'celebrity'] },
  { yt: 'T0HFCjOxd0M', brand: 'Orange', title: 'Flat Eric', tags: ['tecnologia', 'retro-90s'] },
  { yt: 'Pbn6a0AFfnM', brand: 'VW', title: 'Pink Moon', tags: ['automocion', 'emocional'] },
  { yt: 'dGJKxiY1Yjs', brand: 'Citroen', title: 'Dancing Robot', tags: ['automocion', 'emocional'] },
  { yt: 'pjQt2lEZzXM', brand: 'Kia', title: 'Soul Hamsters', tags: ['automocion', 'humor'] },
  { yt: 'kbLMj0lHI9U', brand: 'Chevrolet', title: 'Maddie', tags: ['automocion', 'emocional'] },
  { yt: 'bsGsj83N2H4', brand: 'Lexus', title: 'December to Remember', tags: ['automocion', 'lujoso'] },

  // === TECH ADS ===
  { yt: 'VrLLdNSvhuc', brand: 'Windows 95', title: 'Start Me Up', tags: ['tecnologia', 'retro-90s'] },
  { yt: 'dP3wH5SFdvY', brand: 'Compaq', title: 'Has it Changed Your Life', tags: ['tecnologia', 'retro-90s'] },
  { yt: 'rP1PD_XM2Y0', brand: 'Gateway', title: 'Cow Boxes', tags: ['tecnologia', 'retro-90s'] },
  { yt: 'F4PZXuk3TsM', brand: 'AOL', title: 'You\'ve Got Mail', tags: ['tecnologia', 'retro-90s'] },
  { yt: 'pN0dZoTH5gU', brand: 'eBay', title: 'Whatever It Is', tags: ['tecnologia', '2000s'] },
  { yt: 'MbADqVPZAFY', brand: 'PayPal', title: 'There\'s a New Money', tags: ['finanzas', 'tecnologia'] },
  { yt: 'TqsWRjwjPlM', brand: 'Venmo', title: 'Pay With Venmo', tags: ['finanzas', 'tecnologia'] },
  { yt: '08mTx5L-iKk', brand: 'Coinbase', title: 'Less Talk More Bitcoin', tags: ['finanzas', 'minimalista'] },
  { yt: 'Wvz3F0tbGw0', brand: 'Dropbox', title: 'Dropbox', tags: ['tecnologia', 'minimalista'] },
  { yt: 'Z8YJBVjG1Yg', brand: 'Slack', title: 'So Yeah We Tried Slack', tags: ['tecnologia', 'humor'] },

  // === GLOBAL ICONS ===
  { yt: 'BQhfcdQf0hI', brand: 'Rolex', title: 'Perpetual', tags: ['moda', 'lujoso'] },
  { yt: 'suIw2j_gx-o', brand: 'Omega', title: 'James Bond', tags: ['moda', 'lujoso'] },
  { yt: 'T3TdM3SFE_o', brand: 'Tag Heuer', title: 'Don\'t Crack Under Pressure', tags: ['moda', 'lujoso'] },
  { yt: 'Qn_czU7Wn9k', brand: 'Patek Philippe', title: 'Generations', tags: ['moda', 'lujoso'] },
  { yt: '1rp-_q-ZrRg', brand: 'Breitling', title: 'Squads', tags: ['moda', 'celebrity'] },
  { yt: 'zXaJLNDd6y8', brand: 'Cartier', title: 'L\'Odyssée', tags: ['moda', 'lujoso'] },
  { yt: 'AJwJebJOrlI', brand: 'Van Cleef', title: 'Poetry of Time', tags: ['moda', 'lujoso'] },
  { yt: 'VQ3d3KigPQM', brand: 'Tiffany', title: 'Believe in Dreams', tags: ['moda', 'emocional'] },
  { yt: 'awQ1MFB6zU0', brand: 'De Beers', title: 'A Diamond is Forever', tags: ['moda', 'lujoso'] },
  { yt: 'hWGxW7HYLSM', brand: 'Pandora', title: 'The Unique Connection', tags: ['moda', 'emocional'] },

  // === BANKING ===
  { yt: 'OOB8YeEPyIc', brand: 'Capital One', title: 'What\'s In Your Wallet', tags: ['finanzas', 'celebrity'] },
  { yt: '0hCl6yFmHXE', brand: 'Chase', title: 'Momentum', tags: ['finanzas', 'inspirador'] },
  { yt: 'eOZ8-yS7PKE', brand: 'Bank of America', title: 'What Would You Like', tags: ['finanzas', 'serio'] },
  { yt: 'Y0CLN4MIIb8', brand: 'Wells Fargo', title: 'Stagecoach', tags: ['finanzas', 'emocional'] },
  { yt: 'NqDamqBlY9c', brand: 'Citi', title: 'Progress', tags: ['finanzas', 'inspirador'] },
  { yt: 'j4B3dKNLAZY', brand: 'Barclays', title: 'Take One Small Step', tags: ['finanzas', 'emocional'] },
  { yt: 'cBIXI-KqE48', brand: 'HSBC', title: 'Different Values', tags: ['finanzas', 'provocador'] },
  { yt: 'sUzKDqT03xk', brand: 'NatWest', title: 'This Is Tomorrow', tags: ['finanzas', 'emocional'] },
  { yt: 'iDmWEjLFq9M', brand: 'Santander', title: 'Simple Personal Fair', tags: ['finanzas', 'serio'] },
  { yt: 'WUP9rrIlK8k', brand: 'ING', title: 'Think Forward', tags: ['finanzas', 'inspirador'] },

  // === MORE ICONIC ===
  { yt: 'PYZNUjqPJ6E', brand: 'De Beers', title: 'Shadows', tags: ['moda', 'emocional'] },
  { yt: 'RU9Jft1x8pU', brand: 'Baileys', title: 'Treat Yourself', tags: ['alimentacion', 'lujoso'] },
  { yt: '3AoSGvX_czo', brand: 'Bombay Sapphire', title: 'Imagination', tags: ['alimentacion', 'lujoso'] },
  { yt: 'oDnUQPGJV5Q', brand: 'Grey Goose', title: 'Fly Beyond', tags: ['alimentacion', 'lujoso'] },
  { yt: 'sDdY3VkODno', brand: 'Bacardi', title: 'Do What Moves You', tags: ['alimentacion', 'juvenil'] },
  { yt: 'yXl8jwBdgco', brand: 'Captain Morgan', title: 'Got a Little Captain', tags: ['alimentacion', 'humor'] },
  { yt: 'gxjWNzPmk4k', brand: 'Smirnoff', title: 'Exclusively For Everybody', tags: ['alimentacion', 'provocador'] },
  { yt: '_mTnWNDf7RE', brand: 'Jägermeister', title: 'Meister of the Moment', tags: ['alimentacion', 'juvenil'] },
  { yt: '1WYLqkPApJA', brand: 'Kahlua', title: 'Nights Done Right', tags: ['alimentacion', 'juvenil'] },
  { yt: 'MKGbKaZH5Ao', brand: 'Malibu', title: 'Because Summer', tags: ['alimentacion', 'juvenil'] },
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
  console.log('SEED FINAL - Colección Completa');
  console.log('='.repeat(50));

  await initDb();

  const before = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;
  console.log(`Referencias antes: ${before}`);
  console.log(`Anuncios a añadir: ${FINAL_ADS.length}\n`);

  for (const ad of FINAL_ADS) {
    const url = `https://www.youtube.com/watch?v=${ad.yt}`;
    const thumbnail = `https://img.youtube.com/vi/${ad.yt}/maxresdefault.jpg`;

    const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [url]);
    if (existing.length > 0) continue;

    const id = uuidv4();

    runExec(`
      INSERT INTO references_ads (id, title, type, url, thumbnail, brand, source)
      VALUES (?, ?, 'video', ?, ?, ?, 'final')
    `, [id, ad.title, url, thumbnail, ad.brand]);

    for (const tagName of ad.tags) {
      const tagResult = runQuery('SELECT id FROM tags WHERE name = ?', [tagName]);
      if (tagResult.length > 0) {
        runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [id, tagResult[0].id]);
      }
    }

    added++;
    process.stdout.write(`\r  Añadidos: ${added}/${FINAL_ADS.length}`);
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
