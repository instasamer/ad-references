/**
 * MEGA SEED - Cientos de anuncios adicionales
 * Completar hasta 2000+ referencias
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../database.sqlite');

const MEGA_ADS = [
  // === TECH GIANTS ===
  { yt: 'JbpgM-JTang', brand: 'Microsoft', title: 'Empowering Us All', tags: ['tecnologia', 'inspirador'] },
  { yt: '3LYHPnWlMYU', brand: 'Microsoft', title: 'Surface Pro', tags: ['tecnologia', 'minimalista'] },
  { yt: 'BE8RwxSroJ0', brand: 'Microsoft', title: 'We All Win', tags: ['tecnologia', 'emocional'] },
  { yt: 'Lxs5GWXBlAk', brand: 'Intel', title: 'Sponsors of Tomorrow', tags: ['tecnologia', 'humor'] },
  { yt: 'SO8thGHr1UY', brand: 'IBM', title: 'Think', tags: ['tecnologia', 'serio'] },
  { yt: 'q4y0KOeXViI', brand: 'Cisco', title: 'Tomorrow Starts Here', tags: ['tecnologia', 'inspirador'] },
  { yt: 'ZpAmXpF7_CI', brand: 'Oracle', title: 'Cloud', tags: ['tecnologia', 'serio'] },
  { yt: 'BtANDEHCIoE', brand: 'Salesforce', title: 'We Bring Companies', tags: ['tecnologia', 'serio'] },
  { yt: 'pDvR1sn1CmY', brand: 'Adobe', title: 'Creativity For All', tags: ['tecnologia', 'inspirador'] },
  { yt: 'a1IXI_KmY4o', brand: 'Spotify', title: 'Wrapped', tags: ['tecnologia', 'juvenil'] },
  { yt: 'xWMtOxlKCyc', brand: 'Netflix', title: 'One Story Away', tags: ['entretenimiento', 'emocional'] },
  { yt: 'jot3_Z-XdJE', brand: 'HBO', title: 'It\'s Not TV', tags: ['entretenimiento', 'lujoso'] },
  { yt: 'E3S2k6XRH3I', brand: 'Disney+', title: 'The Streaming Home', tags: ['entretenimiento', 'emocional'] },
  { yt: '3LuVdxhNHo4', brand: 'Hulu', title: 'Hulu Has Live Sports', tags: ['entretenimiento', 'humor'] },
  { yt: 'B-iNWdSXGEY', brand: 'Roku', title: 'Stream Happy', tags: ['tecnologia', 'humor'] },

  // === FOOD BRANDS ===
  { yt: '6aVaZnTWYFw', brand: 'Kraft', title: 'Family Recipes', tags: ['alimentacion', 'emocional'] },
  { yt: 'W7Hoz52RHVY', brand: 'Nutella', title: 'Breakfast Moments', tags: ['alimentacion', 'emocional'] },
  { yt: 'SLMJpHihykI', brand: 'Kit Kat', title: 'Have a Break', tags: ['alimentacion', 'humor'] },
  { yt: 'N7c2cptk_nE', brand: 'Milka', title: 'Tenderness', tags: ['alimentacion', 'emocional'] },
  { yt: 'kQGWJq2Ei3A', brand: 'Ferrero Rocher', title: 'Ambassador\'s Reception', tags: ['alimentacion', 'lujoso'] },
  { yt: 'Q0sxqGpDkGM', brand: 'Lindt', title: 'Master Chocolatier', tags: ['alimentacion', 'lujoso'] },
  { yt: 'R5E_s8uVJio', brand: 'Toblerone', title: 'Triangular', tags: ['alimentacion', 'minimalista'] },
  { yt: 'uwBJ3nDc2G8', brand: 'Haribo', title: 'Kids\' Voices', tags: ['alimentacion', 'humor'] },
  { yt: 'n9RqxHqzGgs', brand: 'Red Bull', title: 'Gives You Wings', tags: ['alimentacion', 'animacion'] },
  { yt: 'kC_mBv94Gc4', brand: 'Monster Energy', title: 'Unleash the Beast', tags: ['alimentacion', 'deportes'] },
  { yt: 'LJ7k1Y4HAbI', brand: 'Lucozade', title: 'Energy', tags: ['alimentacion', 'deportes'] },
  { yt: 'nKWy6z65F8g', brand: 'Powerade', title: 'ION4', tags: ['alimentacion', 'deportes'] },
  { yt: 'qMaH6DrPfRg', brand: 'Vitaminwater', title: '50 Cent', tags: ['alimentacion', 'celebrity'] },
  { yt: 'XbGs_qK2PQA', brand: 'Lay\'s', title: 'Do Us A Flavor', tags: ['alimentacion', 'humor'] },
  { yt: 'lI7_W_pGNKI', brand: 'Pringles', title: 'Once You Pop', tags: ['alimentacion', 'humor'] },
  { yt: 'wJxNhJ8fjFk', brand: 'Cheetos', title: 'Cheetos Museum', tags: ['alimentacion', 'humor'] },
  { yt: 'TvNj_K86Oxo', brand: 'Fritos', title: 'Corn Chips', tags: ['alimentacion', 'retro-80s'] },
  { yt: 'i6c4Nupnup0', brand: 'Tostitos', title: 'Party', tags: ['alimentacion', 'humor'] },
  { yt: 'A6_dHwUYwFo', brand: 'Philadelphia', title: 'Angel', tags: ['alimentacion', 'emocional'] },
  { yt: 'yXf1bhEEXd0', brand: 'Oscar Mayer', title: 'Wiener Mobile', tags: ['alimentacion', 'humor'] },
  { yt: 'gxRKMqRw0TY', brand: 'Spam', title: 'Sizzle Pork', tags: ['alimentacion', 'humor'] },

  // === PHARMA & HEALTH ===
  { yt: 'yYOxfyB7z4M', brand: 'Pfizer', title: 'Science Will Win', tags: ['salud', 'inspirador'] },
  { yt: 'W1R6sLc8Dpo', brand: 'Johnson & Johnson', title: 'For All You Love', tags: ['salud', 'emocional'] },
  { yt: 'Dm4TAdiEFn0', brand: 'Bayer', title: 'Science For A Better Life', tags: ['salud', 'serio'] },
  { yt: '5hfYJsQAhl0', brand: 'GlaxoSmithKline', title: 'Do More', tags: ['salud', 'serio'] },
  { yt: 'C3DK3_QnHos', brand: 'AstraZeneca', title: 'What Science Can Do', tags: ['salud', 'inspirador'] },
  { yt: 'i_G8j7FPWd4', brand: 'Novartis', title: 'Caring & Curing', tags: ['salud', 'emocional'] },
  { yt: '9K3MoxlCaXA', brand: 'Roche', title: 'Doing Now', tags: ['salud', 'serio'] },
  { yt: 'BezT85EUljk', brand: 'Merck', title: 'Inventing for Life', tags: ['salud', 'inspirador'] },
  { yt: 'Lj_F3Dghj-0', brand: 'Centrum', title: 'Complete', tags: ['salud', 'serio'] },
  { yt: 'oHv6vTKD6lg', brand: 'One A Day', title: 'Vitamins', tags: ['salud', 'humor'] },
  { yt: 'VGg9C6hYjag', brand: 'Emergen-C', title: 'Feel The Good', tags: ['salud', 'juvenil'] },
  { yt: 'bPbs6TQ_0DA', brand: 'Alka-Seltzer', title: 'Plop Plop Fizz Fizz', tags: ['salud', 'retro-80s'] },
  { yt: 'Q_qqjIfeVz4', brand: 'Tums', title: 'Trusted Antacid', tags: ['salud', 'humor'] },
  { yt: '2KH2gc11XQg', brand: 'Prilosec', title: 'Relief', tags: ['salud', 'serio'] },
  { yt: '8eXj97stbG8', brand: 'Zyrtec', title: 'Allergy Relief', tags: ['salud', 'serio'] },
  { yt: 'yrZ_vjBnqMI', brand: 'Claritin', title: 'Clear Skies', tags: ['salud', 'emocional'] },
  { yt: 'b0w-A_c1_yE', brand: 'Robitussin', title: 'Dr. Mom', tags: ['salud', 'emocional'] },
  { yt: 'hDMqZNHi1Po', brand: 'NyQuil', title: 'Sniffling', tags: ['salud', 'humor'] },
  { yt: 'SHnTocdD7sk', brand: 'DayQuil', title: 'Don\'t Miss a Thing', tags: ['salud', 'humor'] },

  // === HOME IMPROVEMENT ===
  { yt: 'wkPR4Rcf4ww', brand: 'Home Depot', title: 'More Saving More Doing', tags: ['hogar', 'inspirador'] },
  { yt: 'sCbtGjlBx3s', brand: 'Lowe\'s', title: 'Never Stop Improving', tags: ['hogar', 'inspirador'] },
  { yt: 'N4dp_qy1qR8', brand: 'IKEA', title: 'The Wonderful Everyday', tags: ['hogar', 'humor'] },
  { yt: 'fKYo3LoJhmo', brand: 'Pottery Barn', title: 'Designed for Life', tags: ['hogar', 'lujoso'] },
  { yt: 'zOnLVj7Y4A4', brand: 'Williams-Sonoma', title: 'Cooking', tags: ['hogar', 'lujoso'] },
  { yt: 'DcJFdCmN98s', brand: 'Wayfair', title: 'Just Like That', tags: ['hogar', 'humor'] },
  { yt: 'xLb7_UrV3-A', brand: 'Overstock', title: 'Dream Home', tags: ['hogar', 'emocional'] },
  { yt: 'ZvUx8Tf2sS4', brand: 'Pier 1', title: 'Find What Speaks', tags: ['hogar', 'emocional'] },
  { yt: 'yRhq-yO1KN8', brand: 'Sherwin-Williams', title: 'Cover the Earth', tags: ['hogar', 'serio'] },
  { yt: 'h4fX6K8sQ8o', brand: 'Benjamin Moore', title: 'Color Your World', tags: ['hogar', 'inspirador'] },
  { yt: 'JNM-N0G2n90', brand: 'Valspar', title: 'Love Your Color', tags: ['hogar', 'emocional'] },
  { yt: 'IqyDQ3P7ZDo', brand: 'Behr', title: 'Remarkable Paint', tags: ['hogar', 'serio'] },
  { yt: 'Q7Y29iGM_fM', brand: 'Dyson', title: 'Cyclone Technology', tags: ['hogar', 'tecnologia'] },
  { yt: 'TeCE_djHLfI', brand: 'Roomba', title: 'Smart Home Clean', tags: ['hogar', 'tecnologia'] },
  { yt: 'JUr5JJb1LV4', brand: 'Nest', title: 'Home Safety', tags: ['hogar', 'tecnologia'] },
  { yt: 'wnIqKqUTKj4', brand: 'Ring', title: 'Always Home', tags: ['hogar', 'tecnologia'] },

  // === FASHION BRANDS ===
  { yt: 'JfPi9Iu0fts', brand: 'Tommy Hilfiger', title: 'Classic American Cool', tags: ['moda', 'juvenil'] },
  { yt: 'u0EGxT9cojY', brand: 'Ralph Lauren', title: 'Romance', tags: ['moda', 'lujoso'] },
  { yt: 'TqO0WvDO8Lw', brand: 'Calvin Klein', title: 'My Calvins', tags: ['moda', 'provocador'] },
  { yt: 'ULhBRoC4KHE', brand: 'Diesel', title: 'Be Stupid', tags: ['moda', 'provocador'] },
  { yt: 'BvlNGXhz1uk', brand: 'Benetton', title: 'United Colors', tags: ['moda', 'provocador'] },
  { yt: '0vr5Zy7j9ko', brand: 'Hugo Boss', title: 'Success Beyond Success', tags: ['moda', 'lujoso'] },
  { yt: 'lx2CdVl7PVU', brand: 'Hermès', title: 'La Vie est un Sport', tags: ['moda', 'lujoso'] },
  { yt: 'Y23bqUGWV3w', brand: 'Lacoste', title: 'Timeless Elegance', tags: ['moda', 'lujoso'] },
  { yt: 'QxWJhdXvC5s', brand: 'Montblanc', title: 'What Moves You', tags: ['moda', 'lujoso'] },
  { yt: '0N1_0SUGlDQ', brand: 'Ray-Ban', title: 'Never Hide', tags: ['moda', 'provocador'] },
  { yt: 'Xd1DOloOppc', brand: 'Oakley', title: 'Beyond Reason', tags: ['moda', 'deportes'] },
  { yt: 'tSYmBqkMj5A', brand: 'Warby Parker', title: 'Glasses Direct', tags: ['moda', 'minimalista'] },
  { yt: '3eR7ZgFoMhc', brand: 'Allbirds', title: 'Meet Your Shoes', tags: ['moda', 'minimalista'] },
  { yt: 'mPt8d3EQWHo', brand: 'Everlane', title: 'Radical Transparency', tags: ['moda', 'minimalista'] },
  { yt: 'YsWIjDsNa-A', brand: 'Patagonia', title: 'Don\'t Buy This Jacket', tags: ['moda', 'provocador'] },
  { yt: 'lFg8i7d7P0A', brand: 'The North Face', title: 'Never Stop Exploring', tags: ['moda', 'inspirador'] },
  { yt: 'rQMeY9XGfC8', brand: 'Columbia', title: 'Tested Tough', tags: ['moda', 'deportes'] },
  { yt: 'zV4qOmHG_H0', brand: 'Canada Goose', title: 'Live in the Open', tags: ['moda', 'lujoso'] },

  // === GLOBAL BRANDS ===
  { yt: 'nWN7POyT1wk', brand: 'Nestle', title: 'Good Food, Good Life', tags: ['alimentacion', 'emocional'] },
  { yt: 'hV_7oxVH9VM', brand: 'Unilever', title: 'Sustainable Living', tags: ['hogar', 'inspirador'] },
  { yt: 'oR7SdwR_TdE', brand: 'L\'Oreal', title: 'We\'re Worth It', tags: ['belleza', 'inspirador'] },
  { yt: 'lEd3pT7hfj8', brand: 'Estée Lauder', title: 'Beautiful', tags: ['belleza', 'lujoso'] },
  { yt: 'g_JvT0Xq_eg', brand: 'Lancôme', title: 'La Vie Est Belle', tags: ['belleza', 'lujoso'] },
  { yt: 'rk3MRpQV-VY', brand: 'MAC', title: 'All Ages All Races', tags: ['belleza', 'provocador'] },
  { yt: 'w0nzPBxsINQ', brand: 'Clinique', title: 'Allergy Tested', tags: ['belleza', 'serio'] },
  { yt: 'YfSYc8wqCuM', brand: 'Neutrogena', title: 'See What\'s Possible', tags: ['belleza', 'inspirador'] },
  { yt: 'hQ_S5E1CxAM', brand: 'Nivea', title: 'Touch of Care', tags: ['belleza', 'emocional'] },
  { yt: 'F0LQH5oq9cM', brand: 'Olay', title: 'Face Anything', tags: ['belleza', 'inspirador'] },
  { yt: 'MFl0LFqb0Tk', brand: 'Crest', title: '3D White', tags: ['belleza', 'serio'] },
  { yt: 'ek6j4p5qECA', brand: 'Colgate', title: 'Smile', tags: ['belleza', 'emocional'] },
  { yt: 'mGnY-Im6dcE', brand: 'Sensodyne', title: 'Dentist Recommended', tags: ['salud', 'serio'] },
  { yt: 'dDfM_t7pD8M', brand: 'Oral-B', title: 'Brush Like a Pro', tags: ['belleza', 'tecnologia'] },
  { yt: 'OLo1lJPaJ08', brand: 'Listerine', title: 'Kill Germs', tags: ['belleza', 'serio'] },
  { yt: 'R14I1JV2gOQ', brand: 'Scope', title: 'Minty Fresh', tags: ['belleza', 'humor'] },

  // === JAPAN ADS ===
  { yt: 'P9eK8wR_LXs', brand: 'Softbank', title: 'White Family', tags: ['tecnologia', 'humor'] },
  { yt: 'D0RR5Jf8W2A', brand: 'Cup Noodle', title: 'Hungry Days', tags: ['alimentacion', 'animacion'] },
  { yt: '5qap5aO4i9A', brand: 'Shiseido', title: 'High School Girl?', tags: ['belleza', 'provocador'] },
  { yt: 'fxRYwNMK8ew', brand: 'Toyota Japan', title: 'Doraemon', tags: ['automocion', 'celebrity'] },
  { yt: 'qO-mSLxih-c', brand: 'Sony', title: 'Make.Believe', tags: ['tecnologia', 'inspirador'] },
  { yt: 'N7l0K5ISFYg', brand: 'Panasonic', title: 'Wonder', tags: ['tecnologia', 'emocional'] },
  { yt: 'byxGBtjMJKw', brand: 'Suntory', title: 'Boss Coffee', tags: ['alimentacion', 'celebrity'] },
  { yt: 'W0w5oGVwJ_Q', brand: 'Pocky', title: 'Share Happiness', tags: ['alimentacion', 'juvenil'] },

  // === KOREAN ADS ===
  { yt: '9bZkp7q19f0', brand: 'PSY', title: 'Gangnam Style', tags: ['entretenimiento', 'humor'] },
  { yt: 'nYh-n7EOtMA', brand: 'Hyundai Korea', title: 'Live Brilliant', tags: ['automocion', 'emocional'] },
  { yt: 'J8L8fXDZQsk', brand: 'Samsung Korea', title: 'Galaxy Story', tags: ['tecnologia', 'emocional'] },
  { yt: 'Xj078klxF-U', brand: 'LG', title: 'Life\'s Good', tags: ['tecnologia', 'inspirador'] },
  { yt: 'MqmNePQdoA8', brand: 'Kia Korea', title: 'Movement That Inspires', tags: ['automocion', 'inspirador'] },

  // === SPORTS & FITNESS ===
  { yt: 'Oj9TnKO_8Lo', brand: 'Under Armour', title: 'I Will', tags: ['deportes', 'inspirador'] },
  { yt: 'JEi81wW9S4g', brand: 'Reebok', title: 'Be More Human', tags: ['deportes', 'inspirador'] },
  { yt: '4LLvLrJDL_g', brand: 'Puma', title: 'Forever Faster', tags: ['deportes', 'juvenil'] },
  { yt: '5nT0g9BgQHU', brand: 'ASICS', title: 'I Move Me', tags: ['deportes', 'inspirador'] },
  { yt: 'S4C_SY7RxxM', brand: 'New Balance', title: 'Always in Beta', tags: ['deportes', 'inspirador'] },
  { yt: '3ZKs3oSLgTk', brand: 'Brooks', title: 'Run Happy', tags: ['deportes', 'emocional'] },
  { yt: 'RUk0K7K42R4', brand: 'Saucony', title: 'Run for Good', tags: ['deportes', 'inspirador'] },
  { yt: 'hoxCVxw3DTs', brand: 'Peloton', title: 'It\'s You. That Makes Us', tags: ['deportes', 'emocional'] },
  { yt: 'QjgNrTm9uL0', brand: 'SoulCycle', title: 'Find Your Soul', tags: ['deportes', 'inspirador'] },
  { yt: 'ddsYspv9hzY', brand: 'Equinox', title: 'Equinox Made Me Do It', tags: ['deportes', 'provocador'] },
  { yt: 'Rb0UmrCXxVA', brand: 'GoPro', title: 'Be a Hero', tags: ['deportes', 'spot-tv'] },
  { yt: 'A3PDXmYoF5U', brand: 'Fitbit', title: 'Find Your Fit', tags: ['deportes', 'inspirador'] },
  { yt: 'WcT17tq8qlI', brand: 'Garmin', title: 'Beat Yesterday', tags: ['deportes', 'inspirador'] },

  // === DRINKS ===
  { yt: 'Cil7tOPh4qM', brand: 'Evian', title: 'Live Young', tags: ['alimentacion', 'humor'] },
  { yt: 'QL5xfyKRwuA', brand: 'Fiji Water', title: 'Earth\'s Finest Water', tags: ['alimentacion', 'lujoso'] },
  { yt: 'C0SrxKl3lmE', brand: 'Smartwater', title: 'Inspired by the Clouds', tags: ['alimentacion', 'minimalista'] },
  { yt: '4qTDCbJ8dHM', brand: 'Perrier', title: 'Secret Place', tags: ['alimentacion', 'lujoso'] },
  { yt: 'DsyC4I2RcVs', brand: 'San Pellegrino', title: 'Live in Italian', tags: ['alimentacion', 'lujoso'] },
  { yt: 'IQRdq0jKMlY', brand: 'Nespresso', title: 'What Else - Clooney', tags: ['alimentacion', 'celebrity'] },
  { yt: 'g-p6yMxNIsk', brand: 'Starbucks', title: 'Meet Me at Starbucks', tags: ['alimentacion', 'emocional'] },
  { yt: 'bkA9LW3xPng', brand: 'Dunkin\'', title: 'America Runs on Dunkin\'', tags: ['alimentacion', 'humor'] },
  { yt: 'KCoQF6tgHrU', brand: 'Keurig', title: 'Brew the Love', tags: ['alimentacion', 'emocional'] },
  { yt: 'SqMb_E6jR4A', brand: 'Folgers', title: 'The Best Part of Waking Up', tags: ['alimentacion', 'emocional'] },
  { yt: 'I8bXWmk97nA', brand: 'Maxwell House', title: 'Good to the Last Drop', tags: ['alimentacion', 'retro-80s'] },

  // === INSURANCE EXTENDED ===
  { yt: 'sX0CbA4718A', brand: 'Liberty Mutual', title: 'Truth Tellers', tags: ['finanzas', 'emocional'] },
  { yt: 'D4tb0ge2gYg', brand: 'Farmers', title: 'We Know a Thing or Two', tags: ['finanzas', 'humor'] },
  { yt: 'OQSNhk5ICTI', brand: 'Nationwide', title: 'On Your Side', tags: ['finanzas', 'emocional'] },
  { yt: 'vM1sbaP-6As', brand: 'AAA', title: 'Always There', tags: ['finanzas', 'serio'] },
  { yt: 'l-6Qb9hJFgU', brand: 'USAA', title: 'For the Military', tags: ['finanzas', 'emocional'] },
  { yt: 'S-7pYzsMtP4', brand: 'Erie Insurance', title: 'Caring', tags: ['finanzas', 'emocional'] },
  { yt: 'Rh_F2c8J0_4', brand: 'Travelers', title: 'Dog\' s Umbrella', tags: ['finanzas', 'emocional'] },
  { yt: 'cHQUiSECZV8', brand: 'Aflac', title: 'Aflac Duck', tags: ['finanzas', 'humor'] },

  // === MISC CATEGORIES ===
  { yt: 'zIfKZm0sO2A', brand: 'U.S. Army', title: 'Be All You Can Be', tags: ['educacion', 'inspirador'] },
  { yt: 'H6MRRCHaJ3E', brand: 'U.S. Navy', title: 'A Global Force', tags: ['educacion', 'inspirador'] },
  { yt: 'G0MTJoXLWfk', brand: 'Marines', title: 'The Few The Proud', tags: ['educacion', 'inspirador'] },
  { yt: 'TY2yZPpylF8', brand: 'Peace Corps', title: 'Life is Calling', tags: ['educacion', 'inspirador'] },
  { yt: '1X4hbGXF2l0', brand: 'Ad Council', title: 'Love Has No Labels', tags: ['educacion', 'emocional'] },
  { yt: 'TIvv7HGmD3k', brand: 'The Foundation', title: 'It Can Wait', tags: ['educacion', 'emocional'] },
  { yt: 'Rr7z77I9BFU', brand: 'Smokey Bear', title: 'Only You', tags: ['educacion', 'serio'] },
  { yt: 'kGUcIRcdHXE', brand: 'McGruff', title: 'Take a Bite Out of Crime', tags: ['educacion', 'retro-80s'] },
  { yt: 'vKDvCB2cWc8', brand: 'DARE', title: 'Just Say No', tags: ['educacion', 'retro-80s'] },
  { yt: 'Yf7QAf5RUEw', brand: 'Partnership for Drug-Free', title: 'This Is Your Brain', tags: ['educacion', 'provocador'] },
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
  console.log('MEGA SEED - Cientos de Anuncios Adicionales');
  console.log('='.repeat(50));

  await initDb();

  const before = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;
  console.log(`Referencias antes: ${before}`);
  console.log(`Anuncios a añadir: ${MEGA_ADS.length}\n`);

  for (const ad of MEGA_ADS) {
    const url = `https://www.youtube.com/watch?v=${ad.yt}`;
    const thumbnail = `https://img.youtube.com/vi/${ad.yt}/maxresdefault.jpg`;

    const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [url]);
    if (existing.length > 0) continue;

    const id = uuidv4();

    runExec(`
      INSERT INTO references_ads (id, title, type, url, thumbnail, brand, source)
      VALUES (?, ?, 'video', ?, ?, ?, 'mega')
    `, [id, ad.title, url, thumbnail, ad.brand]);

    for (const tagName of ad.tags) {
      const tagResult = runQuery('SELECT id FROM tags WHERE name = ?', [tagName]);
      if (tagResult.length > 0) {
        runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [id, tagResult[0].id]);
      }
    }

    added++;
    process.stdout.write(`\r  Añadidos: ${added}/${MEGA_ADS.length}`);
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
