import Anthropic from '@anthropic-ai/sdk';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { getDb, runQuery, runExec } from '../db/database.js';
import config from '../../config.js';

const SITES_DIR = './sites';

/**
 * Generates personalized websites for businesses graded C or D.
 * Uses Claude to create unique HTML based on real business data.
 */
export async function buildSitesForProspects(options = {}) {
  const { onProgress = () => {}, limit = 10 } = options;

  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY requerida para generar sitios');
  }

  const db = await getDb();

  // Get businesses that are prospects (grade C/D) and don't have a generated site yet
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
    onProgress({ phase: 'done', message: 'No hay prospectos sin sitio generado.' });
    return { built: 0 };
  }

  onProgress({
    phase: 'starting',
    message: `Generando sitios para ${prospects.length} negocios...`,
  });

  if (!existsSync(SITES_DIR)) mkdirSync(SITES_DIR, { recursive: true });

  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  let built = 0;

  for (const biz of prospects) {
    try {
      onProgress({
        phase: 'building',
        message: `[${built + 1}/${prospects.length}] Generando sitio para ${biz.name}...`,
      });

      const html = await generateSiteHTML(client, biz);
      const slug = slugify(biz.name);

      // Write the site
      const siteDir = `${SITES_DIR}/${slug}`;
      mkdirSync(siteDir, { recursive: true });
      writeFileSync(`${siteDir}/index.html`, html, 'utf-8');

      // Update business record
      runExec(
        `UPDATE businesses SET
          generated_site_slug = ?, site_built_at = datetime('now'),
          status = 'site_ready', updated_at = datetime('now')
        WHERE id = ?`,
        [slug, biz.id]
      );

      built++;
      onProgress({
        phase: 'building',
        message: `[${built}/${prospects.length}] ✓ ${biz.name} → ${config.baseUrl}/sites/${slug}`,
      });
    } catch (error) {
      onProgress({
        phase: 'error',
        message: `Error generando sitio para ${biz.name}: ${error.message}`,
      });
    }
  }

  onProgress({
    phase: 'done',
    message: `${built} sitios generados de ${prospects.length} prospectos.`,
  });

  return { built, total: prospects.length };
}

async function generateSiteHTML(client, biz) {
  const prompt = buildPrompt(biz);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  let html = response.content[0].text;

  // Extract HTML from markdown code blocks if present
  const htmlMatch = html.match(/```html\n([\s\S]*?)```/);
  if (htmlMatch) {
    html = htmlMatch[1];
  }

  // Ensure it starts with DOCTYPE
  if (!html.trim().startsWith('<!DOCTYPE') && !html.trim().startsWith('<html')) {
    const startIdx = html.indexOf('<!DOCTYPE');
    if (startIdx === -1) {
      const htmlStart = html.indexOf('<html');
      if (htmlStart !== -1) html = html.slice(htmlStart);
    } else {
      html = html.slice(startIdx);
    }
  }

  return html;
}

function buildPrompt(biz) {
  const cuisineType = inferCuisineType(biz);
  const colorScheme = pickColorScheme(cuisineType);

  return `Genera una página web COMPLETA en un solo archivo HTML para este restaurante/negocio local.

== DATOS DEL NEGOCIO ==
Nombre: ${biz.name}
Tipo: ${biz.business_type || 'Restaurante'}
Dirección: ${biz.address || 'Málaga, España'}
Teléfono: ${biz.phone || 'No disponible'}
Rating Google: ${biz.rating ? `${biz.rating}/5 (${biz.review_count} reseñas)` : 'Sin datos'}
Google Maps: ${biz.google_maps_url || ''}

== INSTRUCCIONES ==
1. Crea un sitio web moderno, limpio y profesional en un SOLO archivo HTML con CSS inline/embedded
2. Usa una paleta de colores ${colorScheme} que encaje con un ${cuisineType}
3. El diseño debe ser 100% responsive (mobile-first)
4. Incluye estas secciones:
   - Hero con nombre del negocio y tagline inventado (algo atractivo y local)
   - Sección "Sobre nosotros" con texto inventado pero realista para un ${cuisineType} en ${biz.address || 'Málaga'}
   - Sección de "Especialidades" con 4-6 platos/servicios inventados con precios realistas en euros
   - Sección de horarios (inventa horarios típicos para este tipo de negocio)
   - Sección de contacto con teléfono, dirección y enlace a Google Maps
   - Footer con copyright
5. Usa Google Fonts (Playfair Display para títulos, Inter para body)
6. Añade iconos con emojis o HTML entities (no dependencias externas pesadas)
7. El diseño debe parecer hecho por un profesional, NO una plantilla genérica
8. Adapta el tono y estilo al tipo de negocio (casual vs. elegante)
9. Si hay rating de Google, inclúyelo en el hero con estrellas
10. NO uses placeholder images - usa gradientes, patrones CSS o emojis decorativos

== ESTILO ==
- Tipografía elegante con buena jerarquía visual
- Spacing generoso (padding, margins)
- Sombras sutiles en cards
- Transiciones suaves en hover
- Scroll suave entre secciones
- Colores que inspiren confianza y apetito

IMPORTANTE: Responde SOLO con el HTML completo. Sin explicaciones antes o después.`;
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
