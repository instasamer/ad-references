import puppeteer from 'puppeteer';
import Anthropic from '@anthropic-ai/sdk';
import { getDb, runQuery, runExec } from '../db/database.js';
import config from '../../config.js';

/**
 * Audits businesses' websites with restaurant-specific benchmarking.
 *
 * Grading (from best prospect to skip):
 * D = No website / broken / placeholder → TOP PROSPECT
 * C = Has website but terrible (no menu, not mobile, ugly, outdated) → GOOD PROSPECT
 * B = Has website, mediocre (missing key sections, basic design) → MAYBE
 * A = Has website and it's decent/good → SKIP
 *
 * Restaurant-specific criteria (what a GOOD restaurant website needs):
 * - Menu/carta with prices
 * - Photos of food/venue
 * - Hours of operation (horarios)
 * - Location/directions (with map)
 * - Reservation system or phone for reservations
 * - Mobile-friendly (most people search on phone)
 * - Google Maps embed or link
 * - Social media links
 * - Reviews/testimonials
 * - Contact info prominently displayed
 */

// Key terms that indicate important restaurant website sections
const RESTAURANT_SIGNALS = {
  hasMenu: ['carta', 'menú', 'menu', 'platos', 'entrantes', 'postres', 'bebidas', 'vinos', 'precios', '€'],
  hasHours: ['horario', 'abierto', 'cerrado', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo', 'l-v', 'l-d'],
  hasReservation: ['reserva', 'reservar', 'booking', 'mesa', 'eltenedor', 'thefork'],
  hasContact: ['teléfono', 'tfno', 'tel.', 'tel:', 'email', 'contacto', 'llámanos', 'whatsapp'],
  hasLocation: ['dirección', 'cómo llegar', 'ubicación', 'mapa', 'google maps', 'dónde estamos'],
  hasSocial: ['instagram', 'facebook', 'tiktok', 'twitter', '@'],
  hasPhotos: [],  // checked via image count
  isOutdated: ['copyright 201', 'copyright 202[0-2]', '© 201', '© 202[0-2]'],
};

export async function auditBusinesses(options = {}) {
  const { onProgress = () => {}, limit } = options;

  const db = await getDb();

  const maxAudit = limit || (config.pipeline.testMode ? config.pipeline.testBatchSize * 3 : 200);

  const businesses = runQuery(
    `SELECT * FROM businesses WHERE audited_at IS NULL ORDER BY created_at DESC LIMIT ?`,
    [maxAudit]
  );

  if (businesses.length === 0) {
    onProgress({ phase: 'done', message: 'No hay negocios pendientes de auditar' });
    return { audited: 0, summary: {} };
  }

  onProgress({ phase: 'starting', message: `Auditando ${businesses.length} negocios...` });

  let browser;
  const summary = { A: 0, B: 0, C: 0, D: 0 };

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    let audited = 0;

    for (const biz of businesses) {
      const result = await auditSingle(browser, biz);
      summary[result.grade] = (summary[result.grade] || 0) + 1;

      // Store detailed audit data as JSON
      const auditData = JSON.stringify({
        grade: result.grade,
        score: result.score,
        hasWebsite: result.hasWebsite,
        sections: result.sections || {},
        issues: result.issues || [],
        strengths: result.strengths || [],
      });

      runExec(
        `UPDATE businesses SET
          has_website = ?, website_grade = ?, audit_notes = ?,
          audited_at = datetime('now'), updated_at = datetime('now'),
          status = CASE WHEN ? IN ('C', 'D') THEN 'prospect' ELSE 'skipped' END
        WHERE id = ?`,
        [result.hasWebsite ? 1 : 0, result.grade, auditData, result.grade, biz.id]
      );

      audited++;
      onProgress({
        phase: 'auditing',
        message: `[${audited}/${businesses.length}] ${biz.name}: Grado ${result.grade} (${result.score}/100) - ${(result.issues || []).slice(0, 3).join(', ') || 'OK'}`,
      });
    }

    onProgress({
      phase: 'done',
      message: `Auditoría completada: ${audited} negocios | A:${summary.A} B:${summary.B} C:${summary.C} D:${summary.D}`,
    });

    return { audited, summary };
  } finally {
    if (browser) await browser.close();
  }
}

async function auditSingle(browser, biz) {
  // Grade D: No website at all
  if (!biz.website) {
    return {
      hasWebsite: false,
      grade: 'D',
      score: 0,
      issues: ['sin página web'],
      strengths: [],
      sections: {},
    };
  }

  // Skip social media pages - they're not real websites
  const url = biz.website.toLowerCase();
  if (url.includes('facebook.com') || url.includes('instagram.com') || url.includes('tiktok.com')) {
    return {
      hasWebsite: false,
      grade: 'D',
      score: 5,
      issues: ['solo tiene perfil en red social, no web propia'],
      strengths: [],
      sections: {},
    };
  }

  // Skip delivery platform pages (Just Eat, Uber Eats, etc.)
  if (url.includes('just-eat') || url.includes('ubereats') || url.includes('deliveroo') || url.includes('glovo')) {
    return {
      hasWebsite: false,
      grade: 'D',
      score: 5,
      issues: ['solo está en plataforma de delivery, no web propia'],
      strengths: [],
      sections: {},
    };
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    const startTime = Date.now();
    const response = await page.goto(biz.website, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    const loadTime = Date.now() - startTime;

    if (!response || response.status() >= 400) {
      await page.close();
      return {
        hasWebsite: false,
        grade: 'D',
        score: 0,
        issues: [`web no accesible (HTTP ${response?.status() || 'timeout'})`],
        strengths: [],
        sections: {},
      };
    }

    // Collect comprehensive metrics
    const metrics = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      const bodyText = (document.body?.innerText || '').toLowerCase();
      const title = document.title;
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';

      return {
        title,
        metaDesc,
        bodyText: bodyText.slice(0, 10000),
        htmlLength: html.length,
        images: document.querySelectorAll('img').length,
        links: document.querySelectorAll('a[href]').length,
        externalLinks: Array.from(document.querySelectorAll('a[href]'))
          .filter(a => a.href && !a.href.includes(window.location.hostname))
          .map(a => a.href).slice(0, 20),
        hasViewport: !!document.querySelector('meta[name="viewport"]'),
        hasFavicon: !!document.querySelector('link[rel*="icon"]'),
        hasOpenGraph: !!document.querySelector('meta[property="og:title"]'),
        isHttps: window.location.protocol === 'https:',
        wordCount: bodyText.split(/\s+/).filter(Boolean).length,
        hasIframes: document.querySelectorAll('iframe').length,
        hasForms: document.querySelectorAll('form').length,
        hasGoogleMaps: html.includes('maps.google') || html.includes('google.com/maps') || html.includes('maps.googleapis'),
        // Placeholder detection
        isPlaceholder:
          bodyText.includes('en construcción') ||
          bodyText.includes('under construction') ||
          bodyText.includes('coming soon') ||
          bodyText.includes('próximamente') ||
          bodyText.includes('parked domain') ||
          bodyText.includes('this domain') ||
          bodyText.includes('buy this domain'),
        // Builder detection
        builder:
          html.includes('wix.com') ? 'Wix' :
          html.includes('squarespace.com') ? 'Squarespace' :
          html.includes('wordpress') || html.includes('wp-content') ? 'WordPress' :
          html.includes('shopify') ? 'Shopify' :
          html.includes('weebly') ? 'Weebly' :
          html.includes('jimdo') ? 'Jimdo' :
          null,
      };
    });

    // Check mobile
    await page.setViewport({ width: 375, height: 812 });
    await new Promise(r => setTimeout(r, 500));
    const mobileMetrics = await page.evaluate(() => ({
      hasHorizontalScroll: document.body.scrollWidth > window.innerWidth + 10,
      textTooSmall: false, // would need font-size check
    }));

    await page.close();

    // Placeholder = effectively no website
    if (metrics.isPlaceholder) {
      return {
        hasWebsite: false,
        grade: 'D',
        score: 0,
        issues: ['página placeholder o en construcción'],
        strengths: [],
        sections: {},
      };
    }

    // Restaurant-specific analysis
    return gradeRestaurantWebsite(biz, metrics, mobileMetrics, loadTime);
  } catch (error) {
    try { await page.close(); } catch (e) { /* */ }

    if (error.message.includes('timeout') || error.message.includes('net::')) {
      return {
        hasWebsite: false,
        grade: 'D',
        score: 0,
        issues: [`web inaccesible: ${error.message.slice(0, 60)}`],
        strengths: [],
        sections: {},
      };
    }

    return {
      hasWebsite: true,
      grade: 'C',
      score: 20,
      issues: [`error al auditar: ${error.message.slice(0, 60)}`],
      strengths: [],
      sections: {},
    };
  }
}

function gradeRestaurantWebsite(biz, metrics, mobileMetrics, loadTime) {
  let score = 0;
  const issues = [];
  const strengths = [];
  const sections = {};
  const text = metrics.bodyText;

  // === CONTENT SECTIONS (what a restaurant website MUST have) ===

  // Menu / Carta (most important for restaurants - 20 pts)
  const hasMenu = RESTAURANT_SIGNALS.hasMenu.some(term => text.includes(term));
  sections.menu = hasMenu;
  if (hasMenu) {
    score += 20;
    strengths.push('tiene carta/menú');
  } else {
    issues.push('sin carta ni menú online');
  }

  // Hours / Horarios (15 pts)
  const hasHours = RESTAURANT_SIGNALS.hasHours.some(term => text.includes(term));
  sections.hours = hasHours;
  if (hasHours) {
    score += 15;
    strengths.push('muestra horarios');
  } else {
    issues.push('no muestra horarios');
  }

  // Contact info (10 pts)
  const hasContact = RESTAURANT_SIGNALS.hasContact.some(term => text.includes(term));
  sections.contact = hasContact;
  if (hasContact) {
    score += 10;
    strengths.push('info de contacto visible');
  } else {
    issues.push('sin información de contacto');
  }

  // Location / Directions (10 pts)
  const hasLocation = RESTAURANT_SIGNALS.hasLocation.some(term => text.includes(term)) || metrics.hasGoogleMaps;
  sections.location = hasLocation;
  if (hasLocation) {
    score += 10;
    strengths.push('tiene ubicación/mapa');
  } else {
    issues.push('sin ubicación ni mapa');
  }

  // Reservation system (5 pts)
  const hasReservation = RESTAURANT_SIGNALS.hasReservation.some(term => text.includes(term));
  sections.reservation = hasReservation;
  if (hasReservation) {
    score += 5;
    strengths.push('sistema de reservas');
  }

  // Photos (10 pts - restaurants need good photos)
  sections.photos = metrics.images;
  if (metrics.images >= 8) {
    score += 10;
    strengths.push(`${metrics.images} imágenes`);
  } else if (metrics.images >= 3) {
    score += 5;
    issues.push('pocas fotos');
  } else {
    issues.push('casi sin fotos');
  }

  // Social media (5 pts)
  const hasSocial = RESTAURANT_SIGNALS.hasSocial.some(term => text.includes(term));
  sections.social = hasSocial;
  if (hasSocial) {
    score += 5;
    strengths.push('tiene redes sociales');
  }

  // === TECHNICAL QUALITY ===

  // Mobile-friendly (10 pts - critical, most searches are mobile)
  sections.mobile = metrics.hasViewport && !mobileMetrics.hasHorizontalScroll;
  if (!metrics.hasViewport) {
    issues.push('NO es mobile-friendly');
  } else if (mobileMetrics.hasHorizontalScroll) {
    score += 3;
    issues.push('problemas en móvil (scroll horizontal)');
  } else {
    score += 10;
    strengths.push('mobile-friendly');
  }

  // HTTPS (5 pts)
  sections.https = metrics.isHttps;
  if (metrics.isHttps) {
    score += 5;
  } else {
    issues.push('sin HTTPS (no segura)');
  }

  // Load time (5 pts)
  sections.loadTime = loadTime;
  if (loadTime < 3000) {
    score += 5;
    strengths.push(`carga rápida (${(loadTime / 1000).toFixed(1)}s)`);
  } else if (loadTime < 6000) {
    score += 2;
  } else {
    issues.push(`carga lenta (${(loadTime / 1000).toFixed(1)}s)`);
  }

  // Content volume (5 pts)
  if (metrics.wordCount < 50) {
    issues.push('prácticamente sin contenido');
  } else if (metrics.wordCount < 150) {
    score += 2;
    issues.push('poco contenido');
  } else {
    score += 5;
  }

  // Builder detected (informational)
  if (metrics.builder) {
    sections.builder = metrics.builder;
    // Builders usually mean a decent base, slight bonus
    score += 2;
  }

  // === DETERMINE GRADE ===
  // Score range: 0-100
  // A: 65+ (solid restaurant website)
  // B: 40-64 (has a website but missing important stuff)
  // C: 15-39 (website exists but it's bad)
  // D: 0-14 (effectively useless)

  let grade;
  if (score >= 65) {
    grade = 'A';
  } else if (score >= 40) {
    grade = 'B';
  } else if (score >= 15) {
    grade = 'C';
  } else {
    grade = 'D';
  }

  return {
    hasWebsite: true,
    grade,
    score,
    issues,
    strengths,
    sections,
  };
}

/**
 * Deep audit with Claude AI for detailed analysis.
 */
export async function deepAuditWithAI(businessId) {
  if (!config.anthropicApiKey) return null;

  const db = await getDb();
  const [biz] = runQuery('SELECT * FROM businesses WHERE id = ?', [businessId]);
  if (!biz || !biz.website) return null;

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto(biz.website, { waitUntil: 'networkidle2', timeout: 15000 });
    const content = await page.evaluate(() => document.body?.innerText?.slice(0, 4000) || '');
    await page.close();

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Analiza esta web de un restaurante/bar en Málaga. Evalúa como experto en marketing digital para hostelería.

Negocio: ${biz.name}
Tipo: ${biz.business_type || 'restaurante'}
URL: ${biz.website}
Rating Google: ${biz.rating || 'N/A'} (${biz.review_count || 0} reseñas)

Contenido de la web:
${content}

Evalúa estas áreas (1-10 cada una):
1. Primera impresión / diseño
2. Información del menú / carta
3. Facilidad para contactar / reservar
4. Optimización móvil (por el contenido/estructura que ves)
5. SEO básico
6. Llamadas a la acción

Responde en JSON:
{
  "grade": "A/B/C/D",
  "overallScore": 0-100,
  "areas": { "diseño": 0-10, "menu": 0-10, "contacto": 0-10, "mobile": 0-10, "seo": 0-10, "cta": 0-10 },
  "summary": "resumen en 1 frase",
  "topIssues": ["issue1", "issue2", "issue3"],
  "sellingPoints": ["lo que les diríamos para convencerles de que necesitan web nueva"]
}`
      }],
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (e) {
    return null;
  } finally {
    await browser.close();
  }
}
