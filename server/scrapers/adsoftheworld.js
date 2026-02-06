import puppeteer from 'puppeteer';

const BASE_URL = 'https://www.adsoftheworld.com';

// Mapeo de categorías de AdsOfTheWorld a nuestros tags
const CATEGORY_MAP = {
  // Industries -> Sector
  'food': 'alimentacion',
  'beverages': 'alimentacion',
  'alcoholic drinks': 'alimentacion',
  'technology': 'tecnologia',
  'electronics': 'tecnologia',
  'telecommunications': 'tecnologia',
  'fashion': 'moda',
  'retail': 'moda',
  'automotive': 'automocion',
  'beauty': 'belleza',
  'cosmetics': 'belleza',
  'personal care': 'belleza',
  'finance': 'finanzas',
  'banking': 'finanzas',
  'insurance': 'finanzas',
  'health': 'salud',
  'pharmaceutical': 'salud',
  'healthcare': 'salud',
  'entertainment': 'entretenimiento',
  'media': 'entretenimiento',
  'gaming': 'entretenimiento',
  'travel': 'viajes',
  'tourism': 'viajes',
  'hospitality': 'viajes',
  'home': 'hogar',
  'household': 'hogar',
  'real estate': 'hogar',
  'sports': 'deportes',
  'fitness': 'deportes',
  'education': 'educacion',

  // Media -> Formato
  'film': 'spot-tv',
  'tv': 'spot-tv',
  'television': 'spot-tv',
  'digital': 'banner',
  'online': 'banner',
  'social': 'reel',
  'social media': 'reel',
  'print': 'print',
  'outdoor': 'outdoor',
  'ooh': 'outdoor',
  'ambient': 'outdoor',
  'radio': 'spot-tv',
  'audio': 'spot-tv',
};

export async function scrapeAdsOfTheWorld(options = {}) {
  const {
    maxPages = 3,
    category = null, // 'film', 'print', 'digital', etc.
    onProgress = () => {},
  } = options;

  const results = [];
  let browser;

  try {
    onProgress({ status: 'starting', message: 'Iniciando navegador...' });

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Construir URL base
    let listUrl = `${BASE_URL}/ads`;
    if (category) {
      listUrl = `${BASE_URL}/media/${category}`;
    }

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const url = pageNum === 1 ? listUrl : `${listUrl}?page=${pageNum}`;
      onProgress({
        status: 'scraping',
        message: `Extrayendo página ${pageNum} de ${maxPages}...`,
        page: pageNum,
      });

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('.card, .ad-card, article', { timeout: 10000 }).catch(() => {});

        // Extraer anuncios de la página
        const ads = await page.evaluate(() => {
          const items = [];

          // Intentar varios selectores posibles
          const cards = document.querySelectorAll('.card, .ad-card, article, [data-ad-id]');

          cards.forEach((card) => {
            try {
              const titleEl = card.querySelector('h2, h3, .card-title, .title, [class*="title"]');
              const linkEl = card.querySelector('a[href*="/ad/"], a[href*="/work/"]');
              const imgEl = card.querySelector('img');
              const brandEl = card.querySelector('.brand, .advertiser, [class*="brand"], [class*="client"]');
              const categoryEl = card.querySelector('.category, .industry, [class*="category"]');
              const mediaEl = card.querySelector('.media, .medium, [class*="media"]');

              if (titleEl || linkEl) {
                items.push({
                  title: titleEl?.textContent?.trim() || 'Sin título',
                  url: linkEl?.href || null,
                  thumbnail: imgEl?.src || imgEl?.dataset?.src || null,
                  brand: brandEl?.textContent?.trim() || null,
                  category: categoryEl?.textContent?.trim()?.toLowerCase() || null,
                  media: mediaEl?.textContent?.trim()?.toLowerCase() || null,
                });
              }
            } catch (e) {
              // Ignorar errores individuales
            }
          });

          return items;
        });

        results.push(...ads);
        onProgress({
          status: 'progress',
          message: `Encontrados ${ads.length} anuncios en página ${pageNum}`,
          total: results.length,
        });

        // Pausa entre páginas para no sobrecargar el servidor
        if (pageNum < maxPages) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (pageError) {
        onProgress({
          status: 'warning',
          message: `Error en página ${pageNum}: ${pageError.message}`,
        });
      }
    }

    onProgress({
      status: 'processing',
      message: 'Procesando y mapeando tags...',
    });

    // Procesar y mapear tags
    const processedResults = results
      .filter((ad) => ad.title && ad.url)
      .map((ad) => {
        const tags = [];

        // Mapear categoría a nuestros tags
        if (ad.category) {
          const mappedTag = CATEGORY_MAP[ad.category];
          if (mappedTag) tags.push(mappedTag);
        }

        // Mapear media/formato
        if (ad.media) {
          const mappedTag = CATEGORY_MAP[ad.media];
          if (mappedTag) tags.push(mappedTag);
        }

        return {
          title: ad.title,
          description: `Importado de Ads of the World`,
          type: ad.media?.includes('film') || ad.media?.includes('video') ? 'video' : 'link',
          url: ad.url,
          thumbnail: ad.thumbnail,
          brand: ad.brand,
          source: 'adsoftheworld',
          tags: [...new Set(tags)], // Eliminar duplicados
        };
      });

    onProgress({
      status: 'complete',
      message: `Completado: ${processedResults.length} referencias encontradas`,
      total: processedResults.length,
    });

    return processedResults;
  } catch (error) {
    onProgress({
      status: 'error',
      message: `Error: ${error.message}`,
    });
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Scraper detallado para obtener más info de un anuncio específico
export async function scrapeAdDetail(adUrl) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(adUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    const details = await page.evaluate(() => {
      const title = document.querySelector('h1, .ad-title, [class*="title"]')?.textContent?.trim();
      const description = document.querySelector('.description, .ad-description, [class*="description"]')?.textContent?.trim();
      const brand = document.querySelector('.brand, .advertiser, .client, [class*="brand"]')?.textContent?.trim();
      const agency = document.querySelector('.agency, [class*="agency"]')?.textContent?.trim();
      const year = document.querySelector('.year, .date, [class*="year"]')?.textContent?.match(/\d{4}/)?.[0];

      // Buscar video embed
      const videoEl = document.querySelector('video source, iframe[src*="youtube"], iframe[src*="vimeo"]');
      const videoUrl = videoEl?.src || videoEl?.getAttribute('src');

      // Buscar imagen principal
      const imgEl = document.querySelector('.ad-image img, .main-image img, [class*="hero"] img');
      const imageUrl = imgEl?.src;

      // Buscar tags/categorías
      const tagEls = document.querySelectorAll('.tag, .category, [class*="tag"]');
      const tags = Array.from(tagEls).map(el => el.textContent?.trim()?.toLowerCase()).filter(Boolean);

      return {
        title,
        description,
        brand,
        agency,
        year: year ? parseInt(year) : null,
        videoUrl,
        imageUrl,
        tags,
      };
    });

    return details;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
