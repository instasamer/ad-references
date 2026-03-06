import Anthropic from '@anthropic-ai/sdk';
import config from '../../config.js';
import { getDb, runQuery, runExec } from '../db/database.js';

/**
 * AI-powered WhatsApp conversation assistant.
 *
 * Handles the full sales flow:
 * 1. Initial pitch (sends preview link)
 * 2. Answer questions about the service
 * 3. Handle objections
 * 4. Close the deal (send proforma)
 * 5. Confirm payment → generate invoice
 * 6. 2 weeks support for tweaks
 */

const SYSTEM_PROMPT = `Eres una asistente de una pequeña empresa de diseño web que está empezando con negocios locales en Málaga. Tu nombre es Sara.

TONO Y ESTILO:
- Escribe como una persona real por WhatsApp, no como un bot
- Sin puntos al final de las frases
- Usa "jaja" o "jeje" ocasionalmente si viene a cuento, pero no en exceso
- Tutea siempre, nunca de usted
- Frases cortas, naturales
- Puedes usar algún emoji pero con moderación (1-2 por mensaje max)
- Nada de texto largo ni párrafos enormes, esto es WhatsApp
- Si te hacen una pregunta directa, responde directo
- Sé cercana pero profesional, no pesada ni insistente

CONTEXTO DE LA EMPRESA:
- Somos una empresa pequeña que está empezando
- Nos estamos especializando en webs para hostelería y negocios locales
- Precios accesibles porque estamos empezando y queremos hacer cartera
- Precio: ${config.pricing.standard}€ por web completa
- Precio especial: ${config.pricing.earlyBird}€ si confirman en las primeras 48h
- Incluye: web profesional + adaptada a móvil + 2 semanas de ajustes
- Después de las 2 semanas la web es suya, les pasamos todos los accesos
- No hay cuotas mensuales obligatorias (aunque podemos ofrecer hosting por 10€/mes si quieren)
- Cobro por transferencia bancaria

QUÉ PUEDES HACER:
- Responder dudas sobre el servicio y el precio
- Explicar qué incluye la web (diseño, responsive, secciones, etc)
- Ofrecer hacer cambios en el preview si quieren ver algo diferente
- Si dicen que sí: pedir datos para la factura proforma y dar los datos de transferencia
- Si dicen que no o no contestan: un solo follow-up a los 2-3 días, si siguen sin interés no insistir más

QUÉ NO PUEDES HACER:
- No prometas cosas que no podemos cumplir (SEO milagroso, posicionamiento en Google garantizado, etc)
- No bajes el precio por debajo de ${config.pricing.earlyBird}€
- No envíes más de un follow-up si no contestan
- No seas agresiva ni insistente en la venta

FLUJO DE LA CONVERSACIÓN:
1. Ya se les ha enviado un mensaje inicial con el preview - tú gestionas las respuestas
2. Si preguntan quién eres: Sara, de [nombre empresa], hacemos webs para negocios locales
3. Si les gusta el preview: ofrece hacer ajustes gratis y cierra el precio
4. Si quieren cambios: anótalos y diles que los hacemos sin problema
5. Si aceptan el precio: pide nombre/NIF para proforma y da datos de transferencia
6. Si pagan: confirma y diles que en 24-48h tienen la web en su dominio (o en el nuestro si no tienen)
7. Si no les interesa: agradece amablemente y cierra

DATOS DE COBRO:
- Transferencia a: ${config.invoice.iban || '[IBAN pendiente de configurar]'}
- Titular: ${config.invoice.businessName || '[Nombre pendiente]'}
- Concepto: "Web [nombre del negocio]"

Responde SOLO con el mensaje de WhatsApp que enviarías. Sin comillas, sin "Mensaje:", nada de eso. Solo el texto tal cual.`;

let client = null;

function getClient() {
  if (!client) {
    if (!config.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY requerida');
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

/**
 * Process an incoming WhatsApp message and generate a response.
 */
export async function handleIncomingMessage(businessId, incomingMessage) {
  const db = await getDb();
  const [biz] = runQuery('SELECT * FROM businesses WHERE id = ?', [businessId]);
  if (!biz) throw new Error(`Negocio ${businessId} no encontrado`);

  // Get conversation history
  const history = runQuery(
    'SELECT * FROM messages WHERE business_id = ? ORDER BY sent_at ASC',
    [businessId]
  );

  // Build messages array for Claude
  const messages = [];

  for (const msg of history) {
    messages.push({
      role: msg.direction === 'outbound' ? 'assistant' : 'user',
      content: msg.message,
    });
  }

  // Add the new incoming message
  messages.push({ role: 'user', content: incomingMessage });

  // Log incoming message
  runExec(
    `INSERT INTO messages (business_id, channel, direction, message, status)
     VALUES (?, 'whatsapp', 'inbound', ?, 'received')`,
    [businessId, incomingMessage]
  );

  // Build context about the business
  const bizContext = `
NEGOCIO ACTUAL:
- Nombre: ${biz.name}
- Tipo: ${biz.business_type || 'Restaurante/hostelería'}
- Dirección: ${biz.address || 'Málaga'}
- Rating Google: ${biz.rating ? `${biz.rating}/5 (${biz.review_count} reseñas)` : 'sin datos'}
- Tiene web actual: ${biz.has_website ? 'Sí (grado ' + biz.website_grade + ': ' + (biz.audit_notes || '') + ')' : 'No'}
- Preview generado: ${biz.generated_site_slug ? config.baseUrl + '/sites/' + biz.generated_site_slug : 'no'}
- Estado: ${biz.status}
`;

  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: SYSTEM_PROMPT + '\n\n' + bizContext,
    messages,
  });

  const reply = response.content[0].text.trim();

  // Log outgoing message
  runExec(
    `INSERT INTO messages (business_id, channel, direction, message, status)
     VALUES (?, 'whatsapp', 'outbound', ?, 'pending')`,
    [businessId, reply]
  );

  // Detect deal stages from the conversation
  await detectStageChange(businessId, incomingMessage, reply);

  return reply;
}

/**
 * Detect if the conversation has moved to a new sales stage.
 */
async function detectStageChange(businessId, incoming, reply) {
  const text = (incoming + ' ' + reply).toLowerCase();

  // Detect interest
  if (text.includes('me gusta') || text.includes('mola') || text.includes('interesa') || text.includes('quiero')) {
    runExec(
      "UPDATE businesses SET status = 'interested', updated_at = datetime('now') WHERE id = ? AND status = 'contacted'",
      [businessId]
    );
  }

  // Detect deal acceptance (mentions of payment, transfer, factura)
  if (text.includes('transferencia') || text.includes('factura') || text.includes('paso el dinero') || text.includes('pago')) {
    runExec(
      "UPDATE businesses SET status = 'deal_pending', updated_at = datetime('now') WHERE id = ? AND status IN ('interested', 'contacted')",
      [businessId]
    );
  }

  // Detect rejection
  if (text.includes('no me interesa') || text.includes('no gracias') || text.includes('no necesito')) {
    runExec(
      "UPDATE businesses SET status = 'rejected', updated_at = datetime('now') WHERE id = ?",
      [businessId]
    );
  }
}

/**
 * Generate the initial outreach message for a business.
 * This is NOT AI-generated - it's a direct, human-feeling first message.
 */
export function buildFirstMessage(biz, siteUrl) {
  const hasRating = biz.rating && biz.review_count > 0;

  const templates = [
    // Template 1: Direct and casual
    `Ey buenas! 👋

He visto ${biz.name} en Google Maps${hasRating ? ` y vuestras ${biz.review_count} reseñas` : ''} y me he fijado en que no tenéis web propia

Estoy empezando con una empresa de diseño web para hostelería y me he tomado la libertad de hacer un borrador para vosotros, mira:
${siteUrl}

Es gratis verlo eh, sin compromiso ninguno. Si os gusta hablamos 🙂`,

    // Template 2: Slightly more professional
    `Hola buenas! 👋

Soy Sara, estoy montando una empresa de diseño web para negocios locales en Málaga

He visto que ${biz.name} no tiene página web y he preparado un ejemplo de cómo podría quedar:
${siteUrl}

${hasRating ? `Con vuestro ${biz.rating} en Google y ${biz.review_count} reseñas se merecéis una web en condiciones jaja` : 'Una web profesional os puede ayudar bastante a captar clientes nuevos'}

Si os interesa me decís, cero presión`,

    // Template 3: Short and sweet
    `Buenas! Me llamo Sara 👋

He diseñado una web de ejemplo para ${biz.name}:
${siteUrl}

Estoy empezando con webs para hostelería en Málaga a precios muy bajos. Si os mola hablamos, y si no pues nada!`,
  ];

  const idx = (biz.id || 0) % templates.length;
  return templates[idx];
}

/**
 * Build a follow-up message (sent 2-3 days after no response).
 */
export function buildFollowUpMessage(biz) {
  return `Ey! Solo quería saber si habéis podido echar un ojo a la web que os envié 🙂 Si no os interesa me lo decís y sin problema, no quiero ser pesada jaja`;
}
