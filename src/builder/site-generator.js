import Anthropic from '@anthropic-ai/sdk';
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'fs';
import { getDb, runQuery, runExec } from '../db/database.js';
import { getPlaceholderImages } from '../scraper/photo-scraper.js';
import config from '../../config.js';

const SITES_DIR = './sites';

/**
 * Generates personalized websites for businesses graded C or D.
 * Uses Claude to create unique HTML with real photos when available.
 */
export async function buildSitesForProspects(options = {}) {
  const { onProgress = () => {} } = options;

  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY requerida para generar sitios');
  }

  const db = await getDb();
  const limit = config.pipeline.testMode ? config.pipeline.testBatchSize : 10;

  const prospects = runQuery(
    `SELECT * FROM businesses
     WHERE status = 'prospect'
     AND website_grade IN ('C', 'D')
     AND generated_site_slug IS NULL
     ORDER BY website_grade DESC, review_count DESC
     LIMIT ?`,
    [limit]
  );

  if (prospects.length === 0) {
    onProgress({ phase: 'done', message: 'No hay prospectos sin sitio generado' });
    return { built: 0 };
  }

  onProgress({ phase: 'starting', message: `Generando sitios para ${prospects.length} negocios...` });

  if (!existsSync(SITES_DIR)) mkdirSync(SITES_DIR, { recursive: true });

  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  let built = 0;

  for (const biz of prospects) {
    try {
      onProgress({ phase: 'building', message: `[${built + 1}/${prospects.length}] Generando sitio para ${biz.name}...` });

      // Get photos for this business
      const photos = getBusinessPhotos(biz);

      const html = await generateSiteHTML(client, biz, photos);
      const slug = slugify(biz.name);

      const siteDir = `${SITES_DIR}/${slug}`;
      mkdirSync(siteDir, { recursive: true });
      writeFileSync(`${siteDir}/index.html`, html, 'utf-8');

      // Copy photos to site directory if they're local
      for (const photo of photos.local) {
        try {
          const src = photo.filepath;
          const dest = `${siteDir}/${photo.filename}`;
          if (existsSync(src)) {
            const data = readFileSync(src);
            writeFileSync(dest, data);
          }
        } catch (e) { /* skip */ }
      }

      runExec(
        `UPDATE businesses SET
          generated_site_slug = ?, site_built_at = datetime('now'),
          status = 'site_ready', updated_at = datetime('now')
        WHERE id = ?`,
        [slug, biz.id]
      );

      built++;
      onProgress({ phase: 'building', message: `[${built}/${prospects.length}] ✓ ${biz.name} → /sites/${slug}` });
    } catch (error) {
      onProgress({ phase: 'error', message: `Error: ${biz.name}: ${error.message}` });
    }
  }

  onProgress({ phase: 'done', message: `${built} sitios generados` });
  return { built, total: prospects.length };
}

/**
 * Get available photos for a business (scraped or placeholder).
 */
function getBusinessPhotos(biz) {
  const local = [];
  const urls = [];

  // Check for scraped photos
  const photoDir = `./sites/photos/${biz.id}`;
  if (existsSync(photoDir)) {
    const files = readdirSync(photoDir).filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i));
    for (const file of files) {
      local.push({ filename: file, filepath: `${photoDir}/${file}` });
      // Relative URL from the site directory
      urls.push(`../photos/${biz.id}/${file}`);
    }
  }

  // If not enough photos, add placeholders
  if (urls.length < 3) {
    const cuisineType = inferCuisineType(biz);
    const placeholders = getPlaceholderImages(cuisineType);
    for (const url of placeholders) {
      if (urls.length >= 6) break;
      urls.push(url);
    }
  }

  return { local, urls, hasRealPhotos: local.length > 0 };
}

async function generateSiteHTML(client, biz, photos) {
  const prompt = buildPrompt(biz, photos);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  let html = response.content[0].text;

  // Extract HTML from markdown code blocks if present
  const htmlMatch = html.match(/```html\n([\s\S]*?)```/);
  if (htmlMatch) html = htmlMatch[1];

  // Ensure it starts with valid HTML
  if (!html.trim().startsWith('<!DOCTYPE') && !html.trim().startsWith('<html')) {
    const startIdx = html.indexOf('<!DOCTYPE');
    if (startIdx !== -1) html = html.slice(startIdx);
    else {
      const htmlStart = html.indexOf('<html');
      if (htmlStart !== -1) html = html.slice(htmlStart);
    }
  }

  return html;
}

function buildPrompt(biz, photos) {
  const cuisineType = inferCuisineType(biz);
  const colorScheme = pickColorScheme(cuisineType);
  const photoSection = photos.urls.length > 0
    ? `\nFOTOS DISPONIBLES (úsalas en el HTML):\n${photos.urls.map((u, i) => `${i + 1}. ${u}`).join('\n')}\n${photos.hasRealPhotos ? '(Son fotos reales del negocio - úsalas destacadas)' : '(Son fotos de stock - úsalas como ambiente/decoración)'}`
    : '\nNo hay fotos disponibles - usa gradientes, patrones CSS y emojis decorativos como imágenes.';

  return `Genera una página web COMPLETA en un solo archivo HTML para este restaurante/negocio local.

== DATOS DEL NEGOCIO ==
Nombre: ${biz.name}
Tipo: ${biz.business_type || 'Restaurante'}
Dirección: ${biz.address || 'Málaga, España'}
Teléfono: ${biz.phone || 'No disponible'}
Rating Google: ${biz.rating ? `${biz.rating}/5 (${biz.review_count} reseñas)` : 'Sin datos'}
Google Maps: ${biz.google_maps_url || ''}
${photoSection}

== INSTRUCCIONES ==
1. Un SOLO archivo HTML con CSS embedded y todo inline - nada de archivos externos excepto Google Fonts
2. Paleta de colores ${colorScheme} que encaje con un ${cuisineType}
3. 100% responsive (mobile-first, esto es CRÍTICO - la mayoría lo verán en el móvil)
4. Secciones obligatorias:
   - Hero grande con nombre del negocio, tagline atractivo y foto principal${photos.hasRealPhotos ? ' (usa la primera foto real)' : ''}
   - Galería de fotos (grid con las fotos disponibles)
   - "Sobre nosotros" - texto inventado pero realista para un ${cuisineType} en ${biz.address || 'Málaga'}
   - "Nuestra carta" - 6-8 platos/servicios inventados con precios realistas en euros
   - Horarios - inventa horarios típicos
   - Contacto - teléfono, dirección, enlace a Google Maps, botón de WhatsApp
   - Footer
5. Google Fonts: Playfair Display para títulos, Inter para body
6. El diseño debe ser PROFESIONAL y MODERNO - que parezca hecho por una agencia de verdad
7. Usa el rating de Google con estrellas visuales si está disponible
8. Botón de WhatsApp flotante en esquina inferior derecha (enlaza a wa.me/${biz.phone ? biz.phone.replace(/[^0-9]/g, '') : ''})
9. Incluye un banner sutil arriba que diga "Vista previa - ¿Te gusta? Contacta con nosotros" con link a WhatsApp
10. Animaciones suaves: fade-in al scroll, hover en cards, transiciones

== ESTILO ==
- Tipografía elegante con buena jerarquía
- Spacing generoso
- Sombras sutiles
- Bordes redondeados
- Que inspire confianza y ganas de ir al restaurante
- Las fotos deben verse con object-fit: cover y aspect ratios bonitos

IMPORTANTE: Responde SOLO con el HTML completo. Sin explicaciones.`;
}

function inferCuisineType(biz) {
  const name = (biz.name + ' ' + (biz.business_type || '')).toLowerCase();

  if (name.includes('sushi') || name.includes('japon') || name.includes('ramen')) return 'restaurante japonés';
  if (name.includes('pizza') || name.includes('italian') || name.includes('pasta')) return 'restaurante italiano';
  if (name.includes('taco') || name.includes('mexic')) return 'restaurante mexicano';
  if (name.includes('chino') || name.includes('china') || name.includes('wok')) return 'restaurante chino';
  if (name.includes('indio') || name.includes('india') || name.includes('curry')) return 'restaurante indio';
  if (name.includes('kebab') || name.includes('turco') || name.includes('döner')) return 'kebab/comida turca';
  if (name.includes('burger') || name.includes('hambur')) return 'hamburguesería';
  if (name.includes('marisq') || name.includes('pescad') || name.includes('chiringuito')) return 'marisquería';
  if (name.includes('bar') || name.includes('tapas') || name.includes('taberna')) return 'bar de tapas';
  if (name.includes('café') || name.includes('cafe') || name.includes('coffee')) return 'cafetería';
  if (name.includes('panadería') || name.includes('pastel') || name.includes('bakery')) return 'panadería/pastelería';
  if (name.includes('vegan') || name.includes('vegano') || name.includes('healthy')) return 'restaurante vegano/saludable';

  return 'restaurante local';
}

function pickColorScheme(cuisineType) {
  const schemes = {
    'restaurante japonés': 'rojo oscuro y negro con acentos dorados',
    'restaurante italiano': 'verde oliva, rojo tomate y crema',
    'restaurante mexicano': 'amarillo cálido, naranja y verde',
    'restaurante chino': 'rojo y dorado con negro',
    'restaurante indio': 'naranja especiado, dorado y burdeos',
    'kebab/comida turca': 'rojo turco, crema y verde oliva',
    'hamburguesería': 'rojo vibrante, amarillo y negro',
    'marisquería': 'azul marino, blanco y arena',
    'bar de tapas': 'terracota, verde oliva y blanco roto',
    'cafetería': 'marrón café, crema y verde sage',
    'panadería/pastelería': 'rosa suave, crema y dorado',
    'restaurante vegano/saludable': 'verde natural, blanco y madera clara',
    'restaurante local': 'azul mediterráneo, blanco y terracota',
  };
  return schemes[cuisineType] || schemes['restaurante local'];
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

