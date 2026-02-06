/**
 * Scraper MASIVO de Ads of the World
 * Explora TODAS las categorías, industrias y formatos
 * Ejecutar: node server/scrape-all.js
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../database.sqlite');

const BASE_URL = 'https://www.adsoftheworld.com';

// TODAS las secciones a scrapear
const SECTIONS = [
  // Por tipo de medio
  { url: '/media/film', type: 'video', format: 'spot-tv', scrolls: 50 },
  { url: '/media/print', type: 'image', format: 'print', scrolls: 50 },
  { url: '/media/outdoor', type: 'image', format: 'outdoor', scrolls: 50 },
  { url: '/media/digital', type: 'link', format: 'banner', scrolls: 50 },
  { url: '/media/audio', type: 'video', format: 'spot-tv', scrolls: 30 },
  { url: '/media/integrated', type: 'video', format: 'spot-tv', scrolls: 30 },
  { url: '/media/direct', type: 'image', format: 'print', scrolls: 30 },
  { url: '/media/ambient', type: 'image', format: 'outdoor', scrolls: 30 },
  { url: '/media/experiential', type: 'video', format: 'spot-tv', scrolls: 30 },

  // Por industria
  { url: '/industries/automotive', type: 'video', tag: 'automocion', scrolls: 40 },
  { url: '/industries/food', type: 'video', tag: 'alimentacion', scrolls: 40 },
  { url: '/industries/beverage', type: 'video', tag: 'alimentacion', scrolls: 40 },
  { url: '/industries/technology', type: 'video', tag: 'tecnologia', scrolls: 40 },
  { url: '/industries/fashion', type: 'image', tag: 'moda', scrolls: 40 },
  { url: '/industries/beauty', type: 'image', tag: 'belleza', scrolls: 40 },
  { url: '/industries/retail', type: 'video', tag: 'moda', scrolls: 30 },
  { url: '/industries/finance', type: 'video', tag: 'finanzas', scrolls: 30 },
  { url: '/industries/health', type: 'video', tag: 'salud', scrolls: 30 },
  { url: '/industries/travel', type: 'video', tag: 'viajes', scrolls: 30 },
  { url: '/industries/entertainment', type: 'video', tag: 'entretenimiento', scrolls: 30 },
  { url: '/industries/sports', type: 'video', tag: 'deportes', scrolls: 30 },
  { url: '/industries/education', type: 'video', tag: 'educacion', scrolls: 20 },
  { url: '/industries/nonprofit', type: 'video', tag: 'educacion', scrolls: 20 },

  // Secciones especiales
  { url: '/highlighted', type: 'video', scrolls: 60 },
  { url: '/professional', type: 'video', scrolls: 60 },
  { url: '/student', type: 'video', scrolls: 40 },
];

let db;
let totalAdded = 0;
let totalSkipped = 0;
let browser;

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
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
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

async function saveAd(ad) {
  try {
    const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [ad.url]);
    if (existing.length > 0) {
      totalSkipped++;
      return false;
    }

    const id = uuidv4();
    const tags = [];
    if (ad.format) tags.push(ad.format);
    if (ad.tag) tags.push(ad.tag);

    runExec(`
      INSERT INTO references_ads (id, title, description, type, url, thumbnail, brand, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'adsoftheworld')
    `, [id, ad.title, ad.agency ? `Agencia: ${ad.agency}` : null, ad.type, ad.url, ad.thumbnail, ad.brand]);

    for (const tagName of [...new Set(tags)]) {
      const tagResult = runQuery('SELECT id FROM tags WHERE name = ?', [tagName]);
      if (tagResult.length > 0) {
        runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [id, tagResult[0].id]);
      }
    }

    totalAdded++;
    return true;
  } catch (error) {
    return false;
  }
}

async function extractAds(page) {
  return await page.evaluate(() => {
    const campaigns = [];
    const campaignLinks = document.querySelectorAll('a[href*="/campaigns/"]');
    const seen = new Set();

    campaignLinks.forEach(link => {
      const href = link.href;
      if (seen.has(href) || href.includes('campaigns/new')) return;
      seen.add(href);

      const container = link.closest('article, div, li, section') || link.parentElement;
      const img = container?.querySelector('img');
      const brandLink = container?.querySelector('a[href*="/brands/"]');
      const agencyLink = container?.querySelector('a[href*="/agencies/"]');

      const title = img?.alt || link.textContent?.trim()?.substring(0, 100) || '';
      if (title && title.length > 2) {
        campaigns.push({
          url: href,
          title,
          thumbnail: img?.src || null,
          brand: brandLink?.textContent?.trim() || null,
          agency: agencyLink?.textContent?.trim() || null
        });
      }
    });

    return campaigns;
  });
}

async function scrapeSection(page, section, sectionIndex, totalSections) {
  const sectionName = section.url;
  console.log(`\n[${sectionIndex}/${totalSections}] 📁 ${sectionName}`);

  try {
    await page.goto(BASE_URL + section.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
  } catch (e) {
    console.log(`   ⚠️ Error cargando página: ${e.message}`);
    return 0;
  }

  let sectionAdded = 0;
  let lastCount = 0;
  let noNewCount = 0;

  for (let scroll = 1; scroll <= section.scrolls; scroll++) {
    // Scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1500));

    // Extraer
    const ads = await extractAds(page);

    // Guardar nuevos
    let newInScroll = 0;
    for (const ad of ads) {
      const saved = await saveAd({
        ...ad,
        type: section.type || 'video',
        format: section.format,
        tag: section.tag
      });
      if (saved) {
        sectionAdded++;
        newInScroll++;
      }
    }

    // Progreso cada 10 scrolls
    if (scroll % 10 === 0 || scroll === section.scrolls) {
      process.stdout.write(`   Scroll ${scroll}/${section.scrolls}: ${sectionAdded} nuevos (${ads.length} en página)\n`);
    }

    // Si no hay nuevos en 5 scrolls consecutivos, pasar a siguiente sección
    if (newInScroll === 0 && ads.length === lastCount) {
      noNewCount++;
      if (noNewCount >= 5) {
        console.log(`   ⏭️ Sin contenido nuevo, siguiente sección...`);
        break;
      }
    } else {
      noNewCount = 0;
    }
    lastCount = ads.length;

    // Guardar DB cada 20 scrolls
    if (scroll % 20 === 0) {
      saveDb();
    }
  }

  saveDb();
  console.log(`   ✅ Total nuevos en sección: ${sectionAdded}`);
  return sectionAdded;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  SCRAPER MASIVO - Ads of the World');
  console.log('  Objetivo: Miles de referencias');
  console.log('═'.repeat(60));

  await initDb();

  const currentCount = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;
  console.log(`\n📊 Referencias actuales: ${currentCount}`);
  console.log(`📋 Secciones a scrapear: ${SECTIONS.length}`);
  console.log(`🔄 Total scrolls planeados: ${SECTIONS.reduce((a, s) => a + s.scrolls, 0)}`);

  console.log('\n🚀 Iniciando navegador...');
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });

  const startTime = Date.now();

  for (let i = 0; i < SECTIONS.length; i++) {
    await scrapeSection(page, SECTIONS[i], i + 1, SECTIONS.length);

    // Pausa entre secciones
    if (i < SECTIONS.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }

    // Mostrar progreso global cada 5 secciones
    if ((i + 1) % 5 === 0) {
      const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
      console.log(`\n📈 PROGRESO: ${totalAdded} nuevos | ${totalSkipped} duplicados | ${elapsed} min\n`);
    }
  }

  await browser.close();

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const finalCount = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;

  console.log('\n' + '═'.repeat(60));
  console.log('  SCRAPING COMPLETADO');
  console.log('═'.repeat(60));
  console.log(`  ⏱️ Tiempo total: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
  console.log(`  ✅ Nuevos añadidos: ${totalAdded}`);
  console.log(`  ⏭️ Duplicados saltados: ${totalSkipped}`);
  console.log(`  📊 Total en BD: ${finalCount}`);
  console.log('═'.repeat(60));
}

main().catch(err => {
  console.error('Error fatal:', err);
  if (db) saveDb();
  if (browser) browser.close();
  process.exit(1);
});
