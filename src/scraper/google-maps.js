import puppeteer from 'puppeteer';
import { getDb, runQuery, runExec, saveDb } from '../db/database.js';
import config from '../../config.js';

/**
 * Scrapes Google Maps for local businesses using Puppeteer.
 * No API key needed - uses the public Google Maps search.
 */
export async function scrapeGoogleMaps(options = {}) {
  const {
    query = config.search.query,
    location = config.search.location,
    maxResults = config.search.maxResults,
    onProgress = () => {},
  } = options;

  const searchTerm = `${query} en ${location}`;
  const db = await getDb();

  // Log scrape run
  runExec(
    'INSERT INTO scrape_runs (query, location) VALUES (?, ?)',
    [searchTerm, location]
  );
  const runId = runQuery('SELECT last_insert_rowid() as id')[0].id;

  onProgress({ phase: 'starting', message: `Buscando "${searchTerm}" en Google Maps...` });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to Google Maps search
    const url = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm)}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Accept cookies if prompted (EU)
    try {
      const acceptBtn = await page.$('button[aria-label="Aceptar todo"], button[aria-label="Accept all"]');
      if (acceptBtn) await acceptBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) { /* no cookie banner */ }

    onProgress({ phase: 'scrolling', message: 'Cargando resultados...' });

    // Scroll the results panel to load more businesses
    const resultsSelector = 'div[role="feed"]';
    await page.waitForSelector(resultsSelector, { timeout: 10000 });

    let previousCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20;

    while (scrollAttempts < maxScrollAttempts) {
      const currentCount = await page.$$eval(
        'div[role="feed"] > div > div > a[href*="/maps/place/"]',
        els => els.length
      );

      if (currentCount >= maxResults || currentCount === previousCount) break;

      previousCount = currentCount;
      onProgress({
        phase: 'scrolling',
        message: `Encontrados ${currentCount} negocios, cargando más...`,
      });

      await page.evaluate((sel) => {
        const feed = document.querySelector(sel);
        if (feed) feed.scrollTop = feed.scrollHeight;
      }, resultsSelector);

      await new Promise(r => setTimeout(r, 2000));
      scrollAttempts++;
    }

    onProgress({ phase: 'extracting', message: 'Extrayendo datos de negocios...' });

    // Extract business data from listing cards
    const businesses = await page.evaluate((max) => {
      const cards = document.querySelectorAll('div[role="feed"] > div > div > a[href*="/maps/place/"]');
      const results = [];

      for (const card of Array.from(cards).slice(0, max)) {
        const name = card.getAttribute('aria-label') || '';
        const mapsUrl = card.href || '';

        // Extract place_id-like identifier from URL
        const urlMatch = mapsUrl.match(/place\/([^/]+)/);
        const placeSlug = urlMatch ? urlMatch[1] : '';

        // Try to get rating and review count from parent container
        const container = card.closest('div > div');
        const text = container ? container.innerText : '';

        let rating = null;
        let reviewCount = 0;
        const ratingMatch = text.match(/(\d[.,]\d)\s*\((\d[\d.]*)\)/);
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[1].replace(',', '.'));
          reviewCount = parseInt(ratingMatch[2].replace(/\./g, ''));
        }

        // Try to find address-like text (after the rating line)
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        let address = '';
        let businessType = '';
        for (const line of lines) {
          if (line.includes('·') && !address) {
            const parts = line.split('·').map(p => p.trim());
            if (parts.length >= 2) {
              businessType = parts[0];
              address = parts.slice(1).join(', ');
            }
          }
        }

        if (name) {
          results.push({
            name,
            address,
            google_maps_url: mapsUrl,
            place_slug: placeSlug,
            rating,
            review_count: reviewCount,
            business_type: businessType,
          });
        }
      }

      return results;
    }, maxResults);

    onProgress({
      phase: 'details',
      message: `Obteniendo detalles de ${businesses.length} negocios...`,
    });

    // Visit each business page briefly to get phone and website
    let saved = 0;
    for (let i = 0; i < businesses.length; i++) {
      const biz = businesses[i];

      // Check if already in DB
      const existing = runQuery(
        'SELECT id FROM businesses WHERE name = ? AND city = ?',
        [biz.name, location.split(',')[0].trim()]
      );
      if (existing.length > 0) continue;

      // Try to get details from individual listing
      let phone = '';
      let website = '';

      try {
        if (biz.google_maps_url) {
          await page.goto(biz.google_maps_url, { waitUntil: 'networkidle2', timeout: 15000 });
          await new Promise(r => setTimeout(r, 1500));

          const details = await page.evaluate(() => {
            let phone = '';
            let website = '';
            let address = '';

            // Find phone link
            const phoneEl = document.querySelector('a[href^="tel:"]');
            if (phoneEl) phone = phoneEl.href.replace('tel:', '');

            // Find website link
            const links = document.querySelectorAll('a[data-item-id="authority"]');
            if (links.length > 0) website = links[0].href;

            // Alternative website detection
            if (!website) {
              const allLinks = document.querySelectorAll('a[href]');
              for (const a of allLinks) {
                const text = a.innerText.toLowerCase();
                if (text.includes('.com') || text.includes('.es') || text.includes('sitio web')) {
                  const h = a.href;
                  if (!h.includes('google') && !h.includes('facebook') && !h.includes('instagram')) {
                    website = h;
                    break;
                  }
                }
              }
            }

            // Get full address
            const addrEl = document.querySelector('button[data-item-id="address"]');
            if (addrEl) address = addrEl.innerText;

            return { phone, website, address };
          });

          phone = details.phone;
          website = details.website;
          if (details.address) biz.address = details.address;
        }
      } catch (e) {
        // Skip detail extraction on error
      }

      // Extract coordinates from URL
      let lat = null, lng = null;
      const coordMatch = biz.google_maps_url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      }

      runExec(
        `INSERT INTO businesses (name, address, phone, website, google_maps_url, place_id, latitude, longitude, rating, review_count, business_type, city, has_website)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          biz.name,
          biz.address,
          phone,
          website,
          biz.google_maps_url,
          biz.place_slug,
          lat, lng,
          biz.rating,
          biz.review_count,
          biz.business_type,
          location.split(',')[0].trim(),
          website ? 1 : 0,
        ]
      );
      saved++;

      if (i % 5 === 0) {
        onProgress({
          phase: 'details',
          message: `Procesando ${i + 1}/${businesses.length} - guardados ${saved} nuevos`,
        });
      }
    }

    // Update run
    runExec(
      'UPDATE scrape_runs SET results_count = ?, completed_at = datetime("now") WHERE id = ?',
      [saved, runId]
    );

    onProgress({
      phase: 'done',
      message: `Scraping completado: ${saved} negocios nuevos guardados de ${businesses.length} encontrados.`,
    });

    return { total: businesses.length, saved, runId };
  } catch (error) {
    onProgress({ phase: 'error', message: `Error: ${error.message}` });
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}
