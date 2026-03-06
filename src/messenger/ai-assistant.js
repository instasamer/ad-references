import Anthropic from '@anthropic-ai/sdk';
import config from '../../config.js';
import { getDb, runQuery, runExec } from '../db/database.js';

/**
 * AI-powered WhatsApp conversation assistant.
 * Persona: Sara, estudiante cofundadora de Websites Paco.
 */

const SYSTEM_PROMPT = `Eres Sara, cofundadora de Websites Paco. Websites Paco es un pequeño estudio de diseño web montado por dos estudiantes (Paco y tú, Sara) que estáis haciendo webs para negocios locales en Málaga como proyecto para ir pagando la uni y pillar experiencia

TONO Y ESTILO:
- Escribe como una persona joven real por WhatsApp, no como un bot ni como una empresa
- Sin puntos al final de las frases
- Usa "jaja" o "jeje" de vez en cuando si viene bien pero sin pasarte
- Tutea siempre
- Frases cortas y naturales, como hablas por WhatsApp con alguien que conoces del barrio
- Algún emoji suelto (1-2 por mensaje máximo), no abuses
- Mensajes cortos, esto es WhatsApp no un email
- Si preguntan algo directo, responde directo
- Cercana y natural, nunca pesada ni insistente
- Puedes usar expresiones coloquiales españolas naturales

TU HISTORIA / CONTEXTO:
- Paco y tú sois estudiantes en Málaga
- Habéis montado Websites Paco como proyecto para hacer webs a negocios locales
- Estáis empezando y queréis hacer cartera, por eso los precios son muy bajos
- No sois una agencia grande ni pretendéis serlo, sois dos personas normales
- Sabéis lo que hacéis con las webs, pero no os dais aires
- Si preguntan: Paco se encarga más de lo técnico y tú más de diseño y contactar gente

PRECIOS Y SERVICIO:
- ${config.pricing.standard}€ por web completa (diseño + responsive + todo montado)
- ${config.pricing.earlyBird}€ si confirman en 48h (porque nos ayuda a planificar)
- Incluye 2 semanas de cambios y ajustes gratis después de entregar
- Después de esas 2 semanas les pasamos todos los accesos y la web es suya
- No hay cuotas mensuales (opcionalmente 10€/mes si quieren que les llevemos el hosting)
- Cobro por transferencia bancaria

QUÉ PUEDES HACER:
- Responder dudas sobre el servicio y precio
- Explicar qué incluye la web
- Ofrecer hacer cambios en el preview gratis
- Si dicen que sí: pedir nombre/NIF para proforma y dar datos de transferencia
- Si dicen que no: agradecer y no insistir más

QUÉ NO PUEDES HACER:
- No prometas SEO milagroso ni posicionamiento garantizado
- No bajes de ${config.pricing.earlyBird}€
- No insistas si dicen que no
- Máximo un follow-up si no contestan

FLUJO:
1. Ya se les envió un mensaje con el preview - tú gestionas las respuestas
2. Si preguntan quién eres: Sara, de Websites Paco, hacemos webs para negocios locales
3. Si les gusta: ofrece ajustes gratis y comenta el precio
4. Si quieren cambios: diles que sin problema, lo hacéis
5. Si aceptan: pide datos para proforma y da los de transferencia
6. Si pagan: confirma y diles que en 24-48h está lista
7. Si no les interesa: agradece y cierra

DATOS DE COBRO:
- Transferencia a: ${config.invoice.iban || '[IBAN pendiente]'}
- Titular: ${config.invoice.businessName || '[Nombre pendiente]'}
- Concepto: "Web [nombre del negocio]"

Responde SOLO con el mensaje de WhatsApp. Sin comillas, sin "Mensaje:", solo el texto.`;

let client = null;

function getClient() {
  if (!client) {
    if (!config.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY requerida');
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

export async function handleIncomingMessage(businessId, incomingMessage) {
  const db = await getDb();
  const [biz] = runQuery('SELECT * FROM businesses WHERE id = ?', [businessId]);
  if (!biz) throw new Error(`Negocio ${businessId} no encontrado`);

  const history = runQuery(
    'SELECT * FROM messages WHERE business_id = ? ORDER BY sent_at ASC',
    [businessId]
  );

  const messages = [];
  for (const msg of history) {
    messages.push({
      role: msg.direction === 'outbound' ? 'assistant' : 'user',
      content: msg.message,
    });
  }
  messages.push({ role: 'user', content: incomingMessage });

  runExec(
    `INSERT INTO messages (business_id, channel, direction, message, status)
     VALUES (?, 'whatsapp', 'inbound', ?, 'received')`,
    [businessId, incomingMessage]
  );

  const bizContext = `
NEGOCIO ACTUAL:
- Nombre: ${biz.name}
- Tipo: ${biz.business_type || 'Restaurante/hostelería'}
- Dirección: ${biz.address || 'Málaga'}
- Rating Google: ${biz.rating ? `${biz.rating}/5 (${biz.review_count} reseñas)` : 'sin datos'}
- Tiene web actual: ${biz.has_website ? 'Sí (grado ' + biz.website_grade + ')' : 'No'}
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

  runExec(
    `INSERT INTO messages (business_id, channel, direction, message, status)
     VALUES (?, 'whatsapp', 'outbound', ?, 'pending')`,
    [businessId, reply]
  );

  await detectStageChange(businessId, incomingMessage, reply);
  return reply;
}

async function detectStageChange(businessId, incoming, reply) {
  const text = (incoming + ' ' + reply).toLowerCase();

  if (text.includes('me gusta') || text.includes('mola') || text.includes('interesa') || text.includes('quiero')) {
    runExec(
      "UPDATE businesses SET status = 'interested', updated_at = datetime('now') WHERE id = ? AND status = 'contacted'",
      [businessId]
    );
  }

  if (text.includes('transferencia') || text.includes('factura') || text.includes('paso el dinero') || text.includes('pago')) {
    runExec(
      "UPDATE businesses SET status = 'deal_pending', updated_at = datetime('now') WHERE id = ? AND status IN ('interested', 'contacted')",
      [businessId]
    );
  }

  if (text.includes('no me interesa') || text.includes('no gracias') || text.includes('no necesito')) {
    runExec(
      "UPDATE businesses SET status = 'rejected', updated_at = datetime('now') WHERE id = ?",
      [businessId]
    );
  }
}

/**
 * Initial outreach messages - human-written, not AI.
 */
export function buildFirstMessage(biz, siteUrl) {
  const hasRating = biz.rating && biz.review_count > 0;

  const templates = [
    `Ey buenas! 👋

Soy Sara de Websites Paco, somos dos estudiantes haciendo webs para negocios locales en Málaga

He visto ${biz.name} en Google Maps${hasRating ? ` y vuestras ${biz.review_count} reseñas` : ''} y me he fijado en que no tenéis web propia

Me he tomado la libertad de hacer un borrador para vosotros, echadle un ojo:
${siteUrl}

Es gratis verlo eh, sin compromiso. Si os mola hablamos 🙂`,

    `Hola buenas! 👋

Me llamo Sara, estudio en Málaga y con mi compañero Paco hemos montado un proyecto de diseño web para negocios locales

He visto que ${biz.name} no tiene web y os he preparado un ejemplo de cómo podría quedar:
${siteUrl}

${hasRating ? `Con vuestro ${biz.rating} en Google y ${biz.review_count} reseñas os merecéis una web en condiciones jaja` : 'Una web os puede ayudar bastante a que os encuentren clientes nuevos'}

Si os interesa me decís, cero presión`,

    `Buenas! 👋

Soy Sara, de Websites Paco. Estamos empezando con un proyecto de webs para hostelería aquí en Málaga

He diseñado esto para ${biz.name}:
${siteUrl}

Somos estudiantes y lo hacemos a buen precio para ir cogiendo experiencia. Si os gusta hablamos, y si no pues nada!`,
  ];

  const idx = (biz.id || 0) % templates.length;
  return templates[idx];
}

export function buildFollowUpMessage(biz) {
  return `Ey! Solo quería saber si habéis podido ver la web que os mandé 🙂 Si no os interesa me lo decís y sin problema ninguno, no quiero ser pesada jaja`;
}
