import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { getDb, runQuery, runExec } from '../db/database.js';
import config from '../../config.js';

let whatsappClient = null;
let isReady = false;

/**
 * Initialize WhatsApp Web client.
 * Shows QR code in terminal on first run - scan with your phone.
 * Session persists after first auth.
 */
export async function initWhatsApp() {
  if (whatsappClient && isReady) return whatsappClient;

  return new Promise((resolve, reject) => {
    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        dataPath: config.whatsapp.sessionPath,
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      },
    });

    whatsappClient.on('qr', (qr) => {
      console.log('\n📱 Escanea este QR con WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    });

    whatsappClient.on('ready', () => {
      console.log('✅ WhatsApp conectado y listo');
      isReady = true;
      resolve(whatsappClient);
    });

    whatsappClient.on('auth_failure', (msg) => {
      console.error('❌ Error de autenticación WhatsApp:', msg);
      isReady = false;
      reject(new Error('WhatsApp auth failed'));
    });

    whatsappClient.on('disconnected', (reason) => {
      console.log('📴 WhatsApp desconectado:', reason);
      isReady = false;
    });

    whatsappClient.initialize();

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!isReady) reject(new Error('WhatsApp init timeout - ¿escaneaste el QR?'));
    }, 60000);
  });
}

/**
 * Send WhatsApp messages to prospects with generated sites.
 */
export async function sendProspectMessages(options = {}) {
  const { onProgress = () => {}, limit = 20 } = options;

  const db = await getDb();

  // Get businesses with generated sites that haven't been contacted
  const prospects = runQuery(
    `SELECT * FROM businesses
     WHERE status = 'site_ready'
     AND whatsapp_sent = 0
     AND phone IS NOT NULL AND phone != ''
     ORDER BY review_count DESC
     LIMIT ?`,
    [limit]
  );

  if (prospects.length === 0) {
    onProgress({ phase: 'done', message: 'No hay prospectos listos para contactar.' });
    return { sent: 0, skipped: 0 };
  }

  onProgress({
    phase: 'connecting',
    message: 'Conectando a WhatsApp...',
  });

  await initWhatsApp();

  let sent = 0;
  let skipped = 0;

  for (const biz of prospects) {
    try {
      const phone = normalizeSpanishPhone(biz.phone);
      if (!phone) {
        skipped++;
        onProgress({
          phase: 'sending',
          message: `⚠ ${biz.name}: teléfono inválido "${biz.phone}"`,
        });
        continue;
      }

      // Check if number is on WhatsApp
      const numberId = await whatsappClient.getNumberId(phone);
      if (!numberId) {
        skipped++;
        runExec(
          `UPDATE businesses SET status = 'no_whatsapp', updated_at = datetime('now') WHERE id = ?`,
          [biz.id]
        );
        onProgress({
          phase: 'sending',
          message: `⚠ ${biz.name}: no tiene WhatsApp`,
        });
        continue;
      }

      const siteUrl = `${config.baseUrl}/sites/${biz.generated_site_slug}`;
      const message = buildMessage(biz, siteUrl);

      await whatsappClient.sendMessage(numberId._serialized, message);

      // Log message
      runExec(
        `INSERT INTO messages (business_id, channel, direction, message) VALUES (?, 'whatsapp', 'outbound', ?)`,
        [biz.id, message]
      );

      // Update status
      runExec(
        `UPDATE businesses SET
          whatsapp_sent = 1, whatsapp_sent_at = datetime('now'),
          status = 'contacted', updated_at = datetime('now')
        WHERE id = ?`,
        [biz.id]
      );

      sent++;
      onProgress({
        phase: 'sending',
        message: `✓ [${sent}] Mensaje enviado a ${biz.name}`,
      });

      // Wait between messages to avoid being flagged
      const delay = 30000 + Math.random() * 30000; // 30-60 seconds
      await new Promise(r => setTimeout(r, delay));
    } catch (error) {
      skipped++;
      onProgress({
        phase: 'error',
        message: `✗ ${biz.name}: ${error.message}`,
      });
    }
  }

  onProgress({
    phase: 'done',
    message: `Mensajes enviados: ${sent}, omitidos: ${skipped}`,
  });

  return { sent, skipped };
}

function buildMessage(biz, siteUrl) {
  const templates = [
    `¡Hola! 👋

He visto que *${biz.name}* ${biz.rating ? `tiene una valoración de ${biz.rating}⭐ en Google` : 'está en Google Maps'} pero no tiene página web propia.

He diseñado una propuesta de web para vosotros. Échale un vistazo:
${siteUrl}

Es solo un ejemplo de lo que podríamos hacer. Si os gusta, hablamos sin compromiso.

¡Un saludo!`,

    `Buenos días 👋

Soy diseñador web y estoy trabajando con negocios de hostelería en Málaga.

He preparado un borrador de página web para *${biz.name}*:
${siteUrl}

${biz.rating ? `Con vuestras ${biz.review_count} reseñas y ${biz.rating}⭐ en Google, una buena web os ayudaría mucho a captar más clientes.` : 'Una web profesional os ayudaría mucho a captar más clientes.'}

¿Qué os parece? Sin compromiso 🙂`,

    `¡Hola! 🙌

He visto *${biz.name}* en Google Maps y me ha llamado la atención que no tengáis web.

Me he tomado la libertad de diseñar una propuesta:
${siteUrl}

Está adaptada a móvil y lista para usar. Si os interesa, podemos hablar.

¡Saludos!`,
  ];

  // Pick template based on business id for consistency
  const idx = (biz.id || 0) % templates.length;
  return templates[idx];
}

function normalizeSpanishPhone(phone) {
  if (!phone) return null;

  // Remove spaces, dashes, dots, parentheses
  let clean = phone.replace(/[\s\-\.\(\)]/g, '');

  // Remove + prefix
  if (clean.startsWith('+')) clean = clean.slice(1);

  // Spanish numbers
  if (clean.startsWith('34')) {
    // Already has country code
  } else if (clean.startsWith('0034')) {
    clean = clean.slice(2);
  } else if (clean.length === 9 && /^[6-9]/.test(clean)) {
    clean = '34' + clean;
  } else {
    return null; // Can't normalize
  }

  // Validate: 34 + 9 digits
  if (!/^34\d{9}$/.test(clean)) return null;

  return clean;
}

export function getWhatsAppStatus() {
  return { connected: isReady };
}

export async function disconnectWhatsApp() {
  if (whatsappClient) {
    await whatsappClient.destroy();
    isReady = false;
    whatsappClient = null;
  }
}
