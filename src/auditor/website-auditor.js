import puppeteer from 'puppeteer';
import Anthropic from '@anthropic-ai/sdk';
import { getDb, runQuery, runExec } from '../db/database.js';
import config from '../../config.js';

/**
 * Audits businesses' websites and grades them A-D.
 *
 * Grade D = No website at all (best prospect!)
 * Grade C = Website exists but is terrible (broken, placeholder, very outdated)
 * Grade B = Website exists but mediocre (basic, not mobile-friendly, slow)
 * Grade A = Website is good (skip these)
 */
export async function auditBusinesses(options = {}) {
  const { onProgress = () => {} } = options;

  const db = await getDb();
  const businesses = runQuery(
    "SELECT * FROM businesses WHERE audited_at IS NULL ORDER BY created_at DESC"
  );

  if (businesses.length === 0) {
    onProgress({ phase: 'done', message: 'No hay negocios pendientes de auditar.' });
    return { audited: 0 };
  }

  onProgress({
    phase: 'starting',
    message: `Auditando ${businesses.length} negocios...`,
  });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    let audited = 0;

    for (const biz of businesses) {
      const result = await auditSingle(browser, biz, onProgress);

      runExec(
        `UPDATE businesses SET
          has_website = ?, website_grade = ?, audit_notes = ?,
          audited_at = datetime('now'), updated_at = datetime('now'),
          status = CASE WHEN ? IN ('C', 'D') THEN 'prospect' ELSE 'skipped' END
        WHERE id = ?`,
        [result.hasWebsite ? 1 : 0, result.grade, result.notes, result.grade, biz.id]
      );

      audited++;
      onProgress({
        phase: 'auditing',
        message: `[${audited}/${businesses.length}] ${biz.name}: Grado ${result.grade} - ${result.notes}`,
      });
    }

    onProgress({
      phase: 'done',
      message: `Auditoría completada: ${audited} negocios evaluados.`,
    });

    return { audited };
  } finally {
    if (browser) await browser.close();
  }
}

async function auditSingle(browser, biz, onProgress) {
  // Grade D: No website
  if (!biz.website) {
    return {
      hasWebsite: false,
      grade: 'D',
      notes: 'Sin página web - máxima oportunidad',
    };
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // Try loading the website
    const response = await page.goto(biz.website, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });

    // Check if page loaded at all
    if (!response || response.status() >= 400) {
      await page.close();
      return {
        hasWebsite: false,
        grade: 'D',
        notes: `Web no accesible (HTTP ${response?.status() || 'timeout'})`,
      };
    }

    // Collect page metrics
    const metrics = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      const title = document.title;
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
      const h1 = document.querySelector('h1')?.innerText || '';
      const images = document.querySelectorAll('img').length;
      const links = document.querySelectorAll('a').length;
      const hasViewport = !!document.querySelector('meta[name="viewport"]');
      const textContent = document.body?.innerText || '';
      const wordCount = textContent.split(/\s+/).filter(Boolean).length;

      // Check for common "under construction" or placeholder patterns
      const bodyText = textContent.toLowerCase();
      const isPlaceholder =
        bodyText.includes('en construcción') ||
        bodyText.includes('under construction') ||
        bodyText.includes('coming soon') ||
        bodyText.includes('próximamente') ||
        bodyText.includes('parked domain') ||
        bodyText.includes('this domain');

      // Check for common website builders
      const isBuilder =
        html.includes('wix.com') ||
        html.includes('squarespace.com') ||
        html.includes('wordpress') ||
        html.includes('shopify');

      // Check HTTPS
      const isHttps = window.location.protocol === 'https:';

      return {
        title,
        metaDesc,
        h1,
        images,
        links,
        hasViewport,
        wordCount,
        isPlaceholder,
        isBuilder,
        isHttps,
        htmlLength: html.length,
      };
    });

    // Check mobile responsiveness
    await page.setViewport({ width: 375, height: 812 }); // iPhone X
    const mobileMetrics = await page.evaluate(() => {
      const body = document.body;
      return {
        hasHorizontalScroll: body.scrollWidth > window.innerWidth + 10,
      };
    });

    await page.close();

    // Grade the website
    return gradeWebsite(biz, metrics, mobileMetrics);
  } catch (error) {
    try { await page.close(); } catch (e) { /* ignore */ }

    if (error.message.includes('timeout') || error.message.includes('net::')) {
      return {
        hasWebsite: false,
        grade: 'D',
        notes: `Web inaccesible: ${error.message.slice(0, 80)}`,
      };
    }

    return {
      hasWebsite: true,
      grade: 'C',
      notes: `Error al auditar: ${error.message.slice(0, 80)}`,
    };
  }
}

function gradeWebsite(biz, metrics, mobileMetrics) {
  let score = 100;
  const issues = [];

  // Placeholder / parked domain = basically no website
  if (metrics.isPlaceholder) {
    return {
      hasWebsite: false,
      grade: 'D',
      notes: 'Página placeholder o en construcción',
    };
  }

  // Very little content
  if (metrics.wordCount < 50) {
    score -= 40;
    issues.push('casi sin contenido');
  } else if (metrics.wordCount < 150) {
    score -= 20;
    issues.push('poco contenido');
  }

  // No title
  if (!metrics.title || metrics.title.length < 3) {
    score -= 15;
    issues.push('sin título');
  }

  // No meta description
  if (!metrics.metaDesc) {
    score -= 10;
    issues.push('sin meta description');
  }

  // Not mobile-friendly
  if (!metrics.hasViewport) {
    score -= 25;
    issues.push('no es mobile-friendly');
  } else if (mobileMetrics.hasHorizontalScroll) {
    score -= 15;
    issues.push('scroll horizontal en móvil');
  }

  // No HTTPS
  if (!metrics.isHttps) {
    score -= 15;
    issues.push('sin HTTPS');
  }

  // Very few images
  if (metrics.images < 2) {
    score -= 10;
    issues.push('pocas imágenes');
  }

  // Very small HTML (bare bones site)
  if (metrics.htmlLength < 5000) {
    score -= 20;
    issues.push('HTML muy básico');
  }

  // Determine grade
  let grade;
  if (score >= 70) {
    grade = 'A';
  } else if (score >= 50) {
    grade = 'B';
  } else {
    grade = 'C';
  }

  return {
    hasWebsite: true,
    grade,
    notes: issues.length > 0 ? issues.join(', ') : 'Web aceptable',
  };
}

/**
 * Optional: Use Claude to do a deeper audit of the website content
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
    const content = await page.evaluate(() => document.body?.innerText?.slice(0, 3000) || '');
    await page.close();

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Analiza esta página web de un restaurante/negocio local y dame una evaluación breve.

Negocio: ${biz.name}
URL: ${biz.website}
Contenido de la web:
${content}

Responde en JSON con este formato:
{
  "grade": "A/B/C/D",
  "summary": "resumen en 1 frase",
  "issues": ["issue1", "issue2"],
  "opportunities": ["mejora1", "mejora2"]
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
