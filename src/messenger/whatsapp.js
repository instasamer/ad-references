import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { getDb, runQuery, runExec } from '../db/database.js';
import { handleIncomingMessage, buildFirstMessage, buildFollowUpMessage } from './ai-assistant.js';
import config from '../../config.js';

let whatsappClient = null;
let isReady = false;

/**
 * Initialize WhatsApp Web client.
 * Shows QR code in terminal on first run - scan with your phone.
 * Session persists after first auth.
 * Auto-replies to incoming messages using AI assistant.
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

    // Handle incoming messages - AI auto-reply
    whatsappClient.on('message', async (message) => {
      try {
        await handleIncoming(message);
      } catch (err) {
        console.error('Error procesando mensaje entrante:', err.message);
      }
    });

    whatsappClient.initialize();

    setTimeout(() => {
      if (!isReady) reject(new Error('WhatsApp init timeout - ¿escaneaste el QR?'));
    }, 60000);
  });
}

/**
 * Handle an incoming WhatsApp message.
 * Matches the sender to a business in the DB and uses AI to respond.
 */
async function handleIncoming(message) {
  // Skip group messages and our own messages
  if (message.isGroupMsg || message.fromMe) return;

  const senderPhone = message.from.replace('@c.us', '');
  const db = await getDb();

  // Find the business by phone number
  const businesses = runQuery(
    `SELECT * FROM businesses WHERE phone IS NOT NULL AND status IN ('contacted', 'interested', 'deal_pending', 'proforma_sent')`,
  );

  // Match by phone (fuzzy - last 9 digits)
  const last9 = senderPhone.slice(-9);
  const matchedBiz = businesses.find(b => {
    const bizPhone = (b.phone || '').replace(/[\s\-\.\(\)+]/g, '');
    return bizPhone.endsWith(last9);
  });

  if (!matchedBiz) {
    console.log(`📨 Mensaje de número desconocido: ${senderPhone}`);
    return;
  }

  console.log(`📨 Mensaje de ${matchedBiz.name}: ${message.body.slice(0, 80)}`);

  // Generate AI response
  const reply = await handleIncomingMessage(matchedBiz.id, message.body);

  // Send reply with a human-like delay (3-8 seconds)
  const delay = 3000 + Math.random() * 5000;
  await new Promise(r => setTimeout(r, delay));

  await message.reply(reply);
  console.log(`📤 Respuesta a ${matchedBiz.name}: ${reply.slice(0, 80)}`);

  // Mark the outbound message as sent
  runExec(
    "UPDATE messages SET status = 'sent' WHERE business_id = ? AND direction = 'outbound' AND status = 'pending' ORDER BY sent_at DESC LIMIT 1",
    [matchedBiz.id]
  );
}

/**
 * Send initial outreach messages to prospects with generated sites.
 * Respects test mode batch size.
 */
export async function sendProspectMessages(options = {}) {
  const { onProgress = () => {} } = options;

  const db = await getDb();
  const limit = config.pipeline.testMode ? config.pipeline.testBatchSize : 20;

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
    onProgress({ phase: 'done', message: 'No hay prospectos listos para contactar' });
    return { sent: 0, skipped: 0 };
  }

  onProgress({ phase: 'connecting', message: 'Conectando a WhatsApp...' });
  await initWhatsApp();

  let sent = 0;
  let skipped = 0;

  for (const biz of prospects) {
    try {
      const phone = normalizeSpanishPhone(biz.phone);
      if (!phone) {
        skipped++;
        onProgress({ phase: 'sending', message: `⚠ ${biz.name}: teléfono inválido "${biz.phone}"` });
        continue;
      }

      // Check if number is on WhatsApp
      const numberId = await whatsappClient.getNumberId(phone);
      if (!numberId) {
        skipped++;
        runExec("UPDATE businesses SET status = 'no_whatsapp', updated_at = datetime('now') WHERE id = ?", [biz.id]);
        onProgress({ phase: 'sending', message: `⚠ ${biz.name}: no tiene WhatsApp` });
        continue;
      }

      const siteUrl = `${config.baseUrl}/sites/${biz.generated_site_slug}`;
      const message = buildFirstMessage(biz, siteUrl);

      await whatsappClient.sendMessage(numberId._serialized, message);

      // Log message
      runExec(
        "INSERT INTO messages (business_id, channel, direction, message, status) VALUES (?, 'whatsapp', 'outbound', ?, 'sent')",
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
      onProgress({ phase: 'sending', message: `✓ [${sent}] Mensaje enviado a ${biz.name}` });

      // Wait 45-90 seconds between messages (more natural)
      const delay = 45000 + Math.random() * 45000;
      await new Promise(r => setTimeout(r, delay));
    } catch (error) {
      skipped++;
      onProgress({ phase: 'error', message: `✗ ${biz.name}: ${error.message}` });
    }
  }

  onProgress({ phase: 'done', message: `Enviados: ${sent}, omitidos: ${skipped}` });
  return { sent, skipped };
}

/**
 * Send follow-up to businesses contacted 2+ days ago with no response.
 */
export async function sendFollowUps(options = {}) {
  const { onProgress = () => {} } = options;

  const db = await getDb();

  // Businesses contacted 2+ days ago, still in 'contacted' status (no response)
  const stale = runQuery(
    `SELECT * FROM businesses
     WHERE status = 'contacted'
     AND whatsapp_sent_at < datetime('now', '-2 days')
     AND phone IS NOT NULL
     LIMIT 10`
  );

  if (stale.length === 0) {
    onProgress({ phase: 'done', message: 'No hay follow-ups pendientes' });
    return { sent: 0 };
  }

  await initWhatsApp();
  let sent = 0;

  for (const biz of stale) {
    // Check if we already sent a follow-up
    const followUps = runQuery(
      "SELECT COUNT(*) as c FROM messages WHERE business_id = ? AND direction = 'outbound'",
      [biz.id]
    );
    if (followUps[0].c >= 2) {
      // Already sent 2 messages (initial + 1 follow-up), mark as no_response
      runExec("UPDATE businesses SET status = 'no_response', updated_at = datetime('now') WHERE id = ?", [biz.id]);
      continue;
    }

    try {
      const phone = normalizeSpanishPhone(biz.phone);
      if (!phone) continue;

      const numberId = await whatsappClient.getNumberId(phone);
      if (!numberId) continue;

      const message = buildFollowUpMessage(biz);
      await whatsappClient.sendMessage(numberId._serialized, message);

      runExec(
        "INSERT INTO messages (business_id, channel, direction, message, status) VALUES (?, 'whatsapp', 'outbound', ?, 'sent')",
        [biz.id, message]
      );

      sent++;
      onProgress({ phase: 'follow-up', message: `Follow-up enviado a ${biz.name}` });

      await new Promise(r => setTimeout(r, 30000 + Math.random() * 30000));
    } catch (e) {
      onProgress({ phase: 'error', message: `Error follow-up ${biz.name}: ${e.message}` });
    }
  }

  onProgress({ phase: 'done', message: `Follow-ups enviados: ${sent}` });
  return { sent };
}

function normalizeSpanishPhone(phone) {
  if (!phone) return null;
  let clean = phone.replace(/[\s\-\.\(\)]/g, '');
  if (clean.startsWith('+')) clean = clean.slice(1);

  if (clean.startsWith('0034')) {
    clean = clean.slice(2);
  } else if (clean.length === 9 && /^[6-9]/.test(clean)) {
    clean = '34' + clean;
  } else if (!clean.startsWith('34')) {
    return null;
  }

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
