import puppeteer from 'puppeteer';

const BASE_URL = 'https://lovetheworkmore.com';

// Mapeo de categorías de Cannes Lions a nuestros tags
const LIONS_CATEGORY_MAP = {
  // Lions categories -> nuestros tags
  'film': 'spot-tv',
  'film lions': 'spot-tv',
  'film craft': 'spot-tv',
  'digital craft': 'banner',
  'digital': 'banner',
  'social & influencer': 'influencer',
  'social': 'reel',
  'outdoor': 'outdoor',
  'print & publishing': 'print',
  'print': 'print',
  'design': 'print',
  'brand experience': 'branding',
  'creative effectiveness': 'performance',
  'entertainment': 'entretenimiento',
  'entertainment lions': 'entretenimiento',
  'music': 'entretenimiento',
  'audio & radio': 'spot-tv',
  'direct': 'conversion',
  'media': 'awareness',
  'pr': 'awareness',
  'health & wellness': 'salud',
  'pharma': 'salud',

  // Técnicas
  'animation': 'animacion',
  'vfx': 'animacion',
  'craft': 'live-action',

  // Tonos (inferidos de categorías)
  'titanium': 'provocador',
  'glass': 'emocional',
  'grand prix': 'inspirador',
};

export async function scrapeLoveTheWorkMore(options = {}) {
  const {
    maxPages = 3,
    year = null, // Filtrar por año (ej: 2023)
    category = null, // Filtrar por categoría de Lions
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
    let listUrl = BASE_URL;
    const params = [];
    if (year) params.push(`year=${year}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (params.length > 0) {
      listUrl += `?${params.join('&')}`;
    }

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const url = pageNum === 1 ? listUrl : `${listUrl}${listUrl.includes('?') ? '&' : '?'}page=${pageNum}`;
      onProgress({
        status: 'scraping',
        message: `Extrayendo página ${pageNum} de ${maxPages}...`,
        page: pageNum,
      });

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Esperar a que cargue el contenido
        await page.waitForSelector('.work-item, .card, article, [class*="work"]', { timeout: 10000 }).catch(() => {});

        // Scroll para cargar más contenido si es lazy loading
        await autoScroll(page);

        // Extraer trabajos de la página
        const works = await page.evaluate(() => {
          const items = [];

          // Intentar varios selectores
          const cards = document.querySelectorAll('.work-item, .card, article, [class*="work-card"], [class*="campaign"]');

          cards.forEach((card) => {
            try {
              const titleEl = card.querySelector('h2, h3, h4, .title, [class*="title"], [class*="name"]');
              const linkEl = card.querySelector('a');
              const imgEl = card.querySelector('img');
              const brandEl = card.querySelector('.brand, .client, .advertiser, [class*="brand"], [class*="client"]');
              const agencyEl = card.querySelector('.agency, [class*="agency"]');
              const yearEl = card.querySelector('.year, [class*="year"]');
              const categoryEl = card.querySelector('.category, .lion, [class*="category"], [class*="lion"]');
              const awardEl = card.querySelector('.award, .medal, [class*="award"], [class*="lion-type"]');

              if (titleEl || linkEl) {
                items.push({
                  title: titleEl?.textContent?.trim() || 'Sin título',
                  url: linkEl?.href || null,
                  thumbnail: imgEl?.src || imgEl?.dataset?.src || null,
                  brand: brandEl?.textContent?.trim() || null,
                  agency: agencyEl?.textContent?.trim() || null,
                  year: yearEl?.textContent?.match(/\d{4}/)?.[0] || null,
                  category: categoryEl?.textContent?.trim()?.toLowerCase() || null,
                  award: awardEl?.textContent?.trim()?.toLowerCase() || null,
                });
              }
            } catch (e) {
              // Ignorar errores individuales
            }
          });

          return items;
        });

        results.push(...works);
        onProgress({
          status: 'progress',
          message: `Encontrados ${works.length} trabajos en página ${pageNum}`,
          total: results.length,
        });

        // Pausa entre páginas
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
      .filter((work) => work.title && work.url)
      .map((work) => {
        const tags = [];

        // Todos los trabajos son de Cannes, agregar tag inspirador por defecto
        tags.push('inspirador');

        // Mapear categoría
        if (work.category) {
          const mappedTag = LIONS_CATEGORY_MAP[work.category];
          if (mappedTag) tags.push(mappedTag);
        }

        // Mapear award type
        if (work.award) {
          if (work.award.includes('grand prix')) tags.push('inspirador');
          if (work.award.includes('gold')) tags.push('branding');
          if (work.award.includes('titanium')) tags.push('provocador');
        }

        // Determinar tipo basado en categoría
        let type = 'link';
        if (work.category) {
          if (work.category.includes('film') || work.category.includes('video')) {
            type = 'video';
          } else if (work.category.includes('print') || work.category.includes('outdoor') || work.category.includes('design')) {
            type = 'image';
          }
        }

        return {
          title: work.title,
          description: work.agency ? `Agencia: ${work.agency}. Premiado en Cannes Lions.` : 'Premiado en Cannes Lions.',
          type,
          url: work.url,
          thumbnail: work.thumbnail,
          brand: work.brand,
          year: work.year ? parseInt(work.year) : null,
          source: 'lovetheworkmore',
          tags: [...new Set(tags)],
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

// Helper para scroll automático
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight || totalHeight > 5000) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}
