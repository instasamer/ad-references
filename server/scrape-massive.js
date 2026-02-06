/**
 * Scraper masivo de Ads of the World
 * Ejecutar con: node server/scrape-massive.js [páginas]
 * Ejemplo: node server/scrape-massive.js 50
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

// Configuración
const MAX_PAGES = parseInt(process.argv[2]) || 50;
const DELAY_BETWEEN_PAGES = 3000;
const DELAY_BETWEEN_CATEGORIES = 5000;

// Categorías para scrapear
const CATEGORIES = [
  { url: '/media/film', type: 'video', format: 'spot-tv' },
  { url: '/media/print', type: 'image', format: 'print' },
  { url: '/media/outdoor', type: 'image', format: 'outdoor' },
  { url: '/media/digital', type: 'link', format: 'banner' },
  { url: '/highlighted', type: 'video', format: 'spot-tv' },
  { url: '/professional', type: 'video', format: 'spot-tv' },
];

// Mapeo de industrias a tags
const INDUSTRY_MAP = {
  'food': 'alimentacion', 'beverage': 'alimentacion', 'restaurant': 'alimentacion',
  'tech': 'tecnologia', 'electronic': 'tecnologia', 'software': 'tecnologia', 'app': 'tecnologia',
  'fashion': 'moda', 'apparel': 'moda', 'retail': 'moda', 'clothing': 'moda',
  'auto': 'automocion', 'car': 'automocion', 'motor': 'automocion',
  'beauty': 'belleza', 'cosmetic': 'belleza', 'skincare': 'belleza',
  'bank': 'finanzas', 'finance': 'finanzas', 'insurance': 'finanzas',
  'health': 'salud', 'pharma': 'salud', 'medical': 'salud',
  'entertainment': 'entretenimiento', 'gaming': 'entretenimiento', 'music': 'entretenimiento',
  'travel': 'viajes', 'airline': 'viajes', 'hotel': 'viajes', 'tourism': 'viajes',
  'home': 'hogar', 'furniture': 'hogar', 'appliance': 'hogar',
  'sport': 'deportes', 'fitness': 'deportes', 'athletic': 'deportes',
  'education': 'educacion', 'school': 'educacion', 'nonprofit': 'educacion',
};

const BASE_URL = 'https://www.adsoftheworld.com';

let db;
let totalAdded = 0;
let totalSkipped = 0;

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

function inferTags(title, brand) {
  const tags = [];
  const text = `${title} ${brand}`.toLowerCase();

  for (const [keyword, tag] of Object.entries(INDUSTRY_MAP)) {
    if (text.includes(keyword)) {
      tags.push(tag);
      break;
    }
  }
  return tags;
}

async function scrollAndLoad(page) {
  let previousHeight = 0;
  let scrolls = 0;
  const maxScrolls = 10;

  while (scrolls < maxScrolls) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1500));

    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currentHeight === previousHeight) break;
    previousHeight = currentHeight;
    scrolls++;
  }
}

async function scrapeCategoryPage(page, categoryUrl, categoryInfo) {
  const ads = [];

  try {
    await page.goto(BASE_URL + categoryUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    await scrollAndLoad(page);

    const pageData = await page.evaluate(() => {
      const campaigns = [];

      // Buscar todos los links de campañas
      const campaignLinks = document.querySelectorAll('a[href*="/campaigns/"]');
      const seen = new Set();

      campaignLinks.forEach(link => {
        const href = link.href;
        if (seen.has(href) || href.includes('campaigns/new')) return;
        seen.add(href);

        // Buscar imagen cercana
        const container = link.closest('article, div, li') || link.parentElement;
        const img = container?.querySelector('img');

        // Buscar marca cercana
        const brandLink = container?.querySelector('a[href*="/brands/"]');
        const agencyLink = container?.querySelector('a[href*="/agencies/"]');

        campaigns.push({
          url: href,
          title: img?.alt || link.textContent?.trim()?.substring(0, 100) || '',
          thumbnail: img?.src || null,
          brand: brandLink?.textContent?.trim() || null,
          agency: agencyLink?.textContent?.trim() || null
        });
      });

      return campaigns;
    });

    for (const item of pageData) {
      if (item.title && item.url) {
        ads.push({
          ...item,
          type: categoryInfo.type,
          format: categoryInfo.format
        });
      }
    }
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }

  return ads;
}

async function saveAd(ad) {
  try {
    const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [ad.url]);
    if (existing.length > 0) {
      totalSkipped++;
      return false;
    }

    const id = uuidv4();
    const tags = inferTags(ad.title, ad.brand || '');
    if (ad.format) tags.push(ad.format);

    let description = '';
    if (ad.agency) description = `Agencia: ${ad.agency}`;

    runExec(`
      INSERT INTO references_ads (id, title, description, type, url, thumbnail, brand, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'adsoftheworld')
    `, [id, ad.title, description || null, ad.type, ad.url, ad.thumbnail, ad.brand]);

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

async function main() {
  console.log('='.repeat(50));
  console.log('SCRAPER - Ads of the World');
  console.log('='.repeat(50));

  await initDb();

  const currentCount = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;
  console.log(`Referencias actuales en BD: ${currentCount}\n`);

  console.log('Iniciando navegador...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });

  const startTime = Date.now();

  for (const category of CATEGORIES) {
    console.log(`\n📁 Categoría: ${category.url}`);

    const ads = await scrapeCategoryPage(page, category.url, category);
    console.log(`   Encontrados: ${ads.length} anuncios`);

    let added = 0;
    for (const ad of ads) {
      if (await saveAd(ad)) added++;
    }
    console.log(`   Nuevos guardados: ${added}`);

    saveDb();
    await new Promise(r => setTimeout(r, DELAY_BETWEEN_CATEGORIES));
  }

  // También scrapear páginas con scroll infinito
  console.log('\n📁 Scraping página principal con scroll...');
  await page.goto(BASE_URL + '/highlighted', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  for (let i = 0; i < MAX_PAGES; i++) {
    process.stdout.write(`   Scroll ${i + 1}/${MAX_PAGES}... `);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 2000));

    const ads = await page.evaluate(() => {
      const campaigns = [];
      const campaignLinks = document.querySelectorAll('a[href*="/campaigns/"]');
      const seen = new Set();

      campaignLinks.forEach(link => {
        const href = link.href;
        if (seen.has(href) || href.includes('campaigns/new')) return;
        seen.add(href);

        const container = link.closest('article, div, li') || link.parentElement;
        const img = container?.querySelector('img');
        const brandLink = container?.querySelector('a[href*="/brands/"]');

        campaigns.push({
          url: href,
          title: img?.alt || link.textContent?.trim()?.substring(0, 100) || '',
          thumbnail: img?.src || null,
          brand: brandLink?.textContent?.trim() || null
        });
      });

      return campaigns;
    });

    let added = 0;
    for (const ad of ads) {
      if (ad.title && ad.url) {
        const result = await saveAd({ ...ad, type: 'video', format: 'spot-tv' });
        if (result) added++;
      }
    }
    console.log(`${added} nuevos`);

    if ((i + 1) % 5 === 0) saveDb();
  }

  saveDb();
  await browser.close();

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const finalCount = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;

  console.log('\n' + '='.repeat(50));
  console.log('COMPLETADO');
  console.log('='.repeat(50));
  console.log(`Tiempo: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
  console.log(`Nuevos añadidos: ${totalAdded}`);
  console.log(`Duplicados: ${totalSkipped}`);
  console.log(`Total en BD: ${finalCount}`);
}

main().catch(err => {
  console.error('Error:', err);
  if (db) saveDb();
  process.exit(1);
});
