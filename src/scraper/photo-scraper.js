import puppeteer from 'puppeteer';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { getDb, runQuery, runExec } from '../db/database.js';

const PHOTOS_DIR = './sites/photos';

/**
 * Scrapes photos for businesses from Google Maps reviews and business listing.
 * Falls back to Unsplash-style placeholder images based on cuisine type.
 *
 * Photo sources (in order of preference):
 * 1. Google Maps business photos (from the listing itself)
 * 2. Google Maps review photos (user-uploaded)
 * 3. Business's own website (if it has images)
 * 4. Placeholder images by cuisine type (free stock)
 */
export async function scrapePhotosForBusiness(businessId, options = {}) {
  const { onProgress = () => {}, maxPhotos = 6 } = options;

  const db = await getDb();
  const [biz] = runQuery('SELECT * FROM businesses WHERE id = ?', [businessId]);
  if (!biz) throw new Error('Negocio no encontrado');

  if (!existsSync(PHOTOS_DIR)) mkdirSync(PHOTOS_DIR, { recursive: true });

  const bizPhotoDir = `${PHOTOS_DIR}/${biz.id}`;
  if (!existsSync(bizPhotoDir)) mkdirSync(bizPhotoDir, { recursive: true });

  onProgress({ phase: 'photos', message: `Buscando fotos de ${biz.name}...` });

  let photos = [];
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    // Source 1: Google Maps photos
    if (biz.google_maps_url) {
      const mapsPhotos = await scrapeGoogleMapsPhotos(browser, biz.google_maps_url, maxPhotos);
      photos.push(...mapsPhotos);
      onProgress({ phase: 'photos', message: `${mapsPhotos.length} fotos encontradas en Google Maps` });
    }

    // Source 2: Business website photos (if they have one)
    if (photos.length < maxPhotos && biz.website && biz.has_website) {
      const webPhotos = await scrapeWebsitePhotos(browser, biz.website, maxPhotos - photos.length);
      photos.push(...webPhotos);
      onProgress({ phase: 'photos', message: `+${webPhotos.length} fotos de su web` });
    }

    // Download all found photos
    const downloaded = [];
    const page = await browser.newPage();

    for (let i = 0; i < Math.min(photos.length, maxPhotos); i++) {
      try {
        const photoUrl = photos[i];
        const response = await page.goto(photoUrl, { waitUntil: 'load', timeout: 10000 });

        if (response && response.ok()) {
          const buffer = await response.buffer();
          const ext = photoUrl.includes('.png') ? 'png' : 'jpg';
          const filename = `photo_${i + 1}.${ext}`;
          const filepath = `${bizPhotoDir}/${filename}`;
          writeFileSync(filepath, buffer);
          downloaded.push({
            filename,
            filepath,
            source: photos[i],
            type: 'scraped',
          });
        }
      } catch (e) {
        // Skip failed downloads
      }
    }

    await page.close();

    // Save photo info to DB
    const photoData = JSON.stringify(downloaded);
    runExec(
      "UPDATE businesses SET updated_at = datetime('now') WHERE id = ?",
      [businessId]
    );

    // Ensure photos table exists and save
    try {
      db.run(`
        CREATE TABLE IF NOT EXISTS business_photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          business_id INTEGER,
          filename TEXT,
          filepath TEXT,
          source_url TEXT,
          type TEXT DEFAULT 'scraped',
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (business_id) REFERENCES businesses(id)
        )
      `);

      for (const photo of downloaded) {
        runExec(
          'INSERT INTO business_photos (business_id, filename, filepath, source_url, type) VALUES (?, ?, ?, ?, ?)',
          [businessId, photo.filename, photo.filepath, photo.source, photo.type]
        );
      }
    } catch (e) {
      // Table might already have these entries
    }

    onProgress({
      phase: 'photos',
      message: `${downloaded.length} fotos descargadas para ${biz.name}`,
    });

    return {
      downloaded: downloaded.length,
      photos: downloaded,
      needsPlaceholder: downloaded.length < 3,
    };
  } catch (error) {
    onProgress({ phase: 'error', message: `Error buscando fotos: ${error.message}` });
    return { downloaded: 0, photos: [], needsPlaceholder: true };
  } finally {
    if (browser) await browser.close();
  }
}

async function scrapeGoogleMapsPhotos(browser, mapsUrl, max) {
  const page = await browser.newPage();
  const photos = [];

  try {
    await page.goto(mapsUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Accept cookies
    try {
      const btn = await page.$('button[aria-label="Aceptar todo"], button[aria-label="Accept all"]');
      if (btn) await btn.click();
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) { /* no cookie banner */ }

    // Try clicking the photos tab/section
    try {
      const photosTab = await page.$('button[data-tab-id="photos"], button[aria-label*="Foto"]');
      if (photosTab) {
        await photosTab.click();
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) { /* no photos tab */ }

    // Extract image URLs from the page
    const imageUrls = await page.evaluate((maxPhotos) => {
      const urls = new Set();

      // Get all images that look like business/review photos
      const imgs = document.querySelectorAll('img[src]');
      for (const img of imgs) {
        const src = img.src;
        // Google Maps photo URLs typically contain these patterns
        if (src.includes('googleusercontent.com') ||
            src.includes('lh3.google') ||
            src.includes('lh4.google') ||
            src.includes('lh5.google') ||
            src.includes('ggpht.com')) {
          // Get higher resolution version
          let highRes = src;
          // Replace size parameters for higher resolution
          highRes = highRes.replace(/=w\d+-h\d+/, '=w800-h600');
          highRes = highRes.replace(/=s\d+/, '=s800');
          urls.add(highRes);
        }
      }

      // Also check background images
      const allEls = document.querySelectorAll('[style*="background-image"]');
      for (const el of allEls) {
        const style = el.getAttribute('style');
        const match = style.match(/url\(['"](.*?)['"]\)/);
        if (match && (match[1].includes('googleusercontent') || match[1].includes('ggpht'))) {
          urls.add(match[1]);
        }
      }

      return Array.from(urls).slice(0, maxPhotos);
    }, max);

    photos.push(...imageUrls);
  } catch (e) {
    // Silent fail
  } finally {
    await page.close();
  }

  return photos;
}

async function scrapeWebsitePhotos(browser, websiteUrl, max) {
  const page = await browser.newPage();
  const photos = [];

  try {
    await page.goto(websiteUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    const imageUrls = await page.evaluate((maxPhotos) => {
      const urls = [];
      const imgs = document.querySelectorAll('img[src]');

      for (const img of imgs) {
        const src = img.src;
        // Skip tiny images (icons, logos, etc.) - check natural dimensions
        if (img.naturalWidth > 200 && img.naturalHeight > 150) {
          urls.push(src);
        } else if (!img.complete) {
          // Image not loaded yet, check by URL patterns
          if (!src.includes('icon') && !src.includes('logo') && !src.includes('favicon') &&
              !src.includes('sprite') && !src.includes('.svg')) {
            urls.push(src);
          }
        }
      }

      return urls.slice(0, maxPhotos);
    }, max);

    photos.push(...imageUrls);
  } catch (e) {
    // Silent fail
  } finally {
    await page.close();
  }

  return photos;
}

/**
 * Get placeholder image URLs for a cuisine type.
 * Uses free, no-attribution-required sources.
 */
export function getPlaceholderImages(cuisineType) {
  // Curated list of Unsplash image IDs by cuisine type (free to use)
  const placeholders = {
    'restaurante japonés': [
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800', // sushi
      'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800', // ramen
      'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800', // japanese interior
    ],
    'restaurante italiano': [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', // pizza
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800', // pasta
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', // italian restaurant
    ],
    'hamburguesería': [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800', // burger
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800', // burger 2
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800', // burger place
    ],
    'bar de tapas': [
      'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800', // tapas
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', // restaurant
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', // food spread
    ],
    'marisquería': [
      'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=800', // seafood
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', // seafood plate
      'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=800', // fish
    ],
    'cafetería': [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800', // cafe
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800', // coffee
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', // cafe interior
    ],
    default: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', // restaurant interior
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', // food
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', // dining
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800', // restaurant exterior
    ],
  };

  return placeholders[cuisineType] || placeholders.default;
}

/**
 * Scrape photos for all prospects that need them.
 */
export async function scrapePhotosForProspects(options = {}) {
  const { onProgress = () => {} } = options;

  const db = await getDb();

  // Get prospects without photos
  const prospects = runQuery(
    `SELECT b.* FROM businesses b
     LEFT JOIN business_photos bp ON bp.business_id = b.id
     WHERE b.status = 'prospect' AND b.website_grade IN ('C', 'D') AND bp.id IS NULL
     ORDER BY b.review_count DESC
     LIMIT ?`,
    [config.pipeline.testMode ? config.pipeline.testBatchSize : 20]
  );

  if (prospects.length === 0) {
    onProgress({ phase: 'done', message: 'No hay prospectos sin fotos' });
    return { processed: 0 };
  }

  let processed = 0;
  for (const biz of prospects) {
    await scrapePhotosForBusiness(biz.id, { onProgress, maxPhotos: 6 });
    processed++;
  }

  onProgress({ phase: 'done', message: `Fotos procesadas para ${processed} negocios` });
  return { processed };
}
