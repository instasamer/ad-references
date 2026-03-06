import express from 'express';
import cors from 'cors';
import { getDb, runQuery, runExec } from '../db/database.js';
import { scrapeGoogleMaps } from '../scraper/google-maps.js';
import { scrapePhotosForProspects } from '../scraper/photo-scraper.js';
import { auditBusinesses } from '../auditor/website-auditor.js';
import { buildSitesForProspects } from '../builder/site-generator.js';
import { sendProspectMessages, sendFollowUps, getWhatsAppStatus, initWhatsApp } from '../messenger/whatsapp.js';
import { generateProforma, confirmPaymentAndInvoice, getPricingBreakdown, initBillingTables } from '../billing/invoice-generator.js';
import { getMode } from '../ai/claude-client.js';
import config from '../../config.js';

const app = express();
app.use(cors());
app.use(express.json());

// Serve generated sites
app.use('/sites', express.static('./sites'));

// Serve dashboard
app.use('/dashboard', express.static('./src/dashboard'));

// Serve invoices
app.use('/invoices', express.static('./data/invoices'));

// ========== API: Stats ==========

app.get('/api/stats', async (req, res) => {
  try {
    const db = await getDb();
    const total = runQuery('SELECT COUNT(*) as c FROM businesses')[0].c;
    const byGrade = runQuery(
      `SELECT website_grade as grade, COUNT(*) as count FROM businesses
       WHERE website_grade IS NOT NULL GROUP BY website_grade ORDER BY grade`
    );
    const byStatus = runQuery(
      `SELECT status, COUNT(*) as count FROM businesses GROUP BY status ORDER BY count DESC`
    );
    const withSite = runQuery(
      "SELECT COUNT(*) as c FROM businesses WHERE generated_site_slug IS NOT NULL"
    )[0].c;
    const contacted = runQuery(
      "SELECT COUNT(*) as c FROM businesses WHERE whatsapp_sent = 1"
    )[0].c;
    const interested = runQuery(
      "SELECT COUNT(*) as c FROM businesses WHERE status IN ('interested', 'deal_pending', 'proforma_sent', 'paid')"
    )[0].c;
    const paid = runQuery(
      "SELECT COUNT(*) as c FROM businesses WHERE status = 'paid'"
    )[0].c;
    const lastRun = runQuery('SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 1');
    const recentMessages = runQuery(
      `SELECT m.*, b.name as business_name FROM messages m
       JOIN businesses b ON b.id = m.business_id
       ORDER BY m.sent_at DESC LIMIT 10`
    );

    res.json({
      total,
      byGrade,
      byStatus,
      withSite,
      contacted,
      interested,
      paid,
      lastRun: lastRun[0] || null,
      recentMessages,
      whatsapp: getWhatsAppStatus(),
      testMode: config.pipeline.testMode,
      batchSize: config.pipeline.testBatchSize,
      aiMode: getMode(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== API: Businesses ==========

app.get('/api/businesses', async (req, res) => {
  try {
    const db = await getDb();
    const { grade, status, search, limit = 100, offset = 0 } = req.query;

    let sql = 'SELECT * FROM businesses WHERE 1=1';
    const params = [];

    if (grade) {
      sql += ' AND website_grade = ?';
      params.push(grade);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (name LIKE ? OR address LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const businesses = runQuery(sql, params);
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as c').replace(/ORDER BY.*$/, '');
    const total = runQuery(countSql, params.slice(0, -2))[0].c;

    res.json({ businesses, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/businesses/:id', async (req, res) => {
  try {
    const db = await getDb();
    const [biz] = runQuery('SELECT * FROM businesses WHERE id = ?', [req.params.id]);
    if (!biz) return res.status(404).json({ error: 'No encontrado' });

    const messages = runQuery(
      'SELECT * FROM messages WHERE business_id = ? ORDER BY sent_at DESC',
      [req.params.id]
    );

    res.json({ ...biz, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== API: Billing ==========

app.get('/api/pricing', (req, res) => {
  res.json({
    standard: getPricingBreakdown(false),
    earlyBird: getPricingBreakdown(true),
    supportWeeks: config.pricing.supportWeeks,
  });
});

app.post('/api/invoices/proforma', async (req, res) => {
  try {
    const { businessId, earlyBird, clientName, clientNif, clientAddress } = req.body;
    const result = await generateProforma(businessId, { earlyBird, clientName, clientNif, clientAddress });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices/confirm-payment', async (req, res) => {
  try {
    const { proformaNumber } = req.body;
    const result = await confirmPaymentAndInvoice(proformaNumber);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    await initBillingTables();
    const invoices = runQuery('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 50');
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== API: Pipeline Actions ==========

const runningTasks = new Map();

function createTask(name, fn) {
  return async (req, res) => {
    if (runningTasks.get(name)) {
      return res.status(409).json({ error: `${name} ya está en ejecución` });
    }

    runningTasks.set(name, true);
    const onProgress = (p) => console.log(`[${name}] ${p.message}`);

    res.json({ status: 'started', message: `${name} iniciado` });

    try {
      await fn({ onProgress, ...req.body });
    } catch (error) {
      console.error(`[${name}] Error:`, error.message);
    } finally {
      runningTasks.set(name, false);
    }
  };
}

app.post('/api/actions/scrape', createTask('scrape', (opts) => scrapeGoogleMaps(opts)));
app.post('/api/actions/audit', createTask('audit', (opts) => auditBusinesses(opts)));
app.post('/api/actions/photos', createTask('photos', (opts) => scrapePhotosForProspects(opts)));
app.post('/api/actions/build-sites', createTask('build-sites', (opts) => buildSitesForProspects(opts)));
app.post('/api/actions/send-messages', createTask('send-messages', (opts) => sendProspectMessages(opts)));
app.post('/api/actions/follow-ups', createTask('follow-ups', (opts) => sendFollowUps(opts)));

app.post('/api/actions/connect-whatsapp', async (req, res) => {
  try {
    await initWhatsApp();
    res.json({ status: 'connected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Full pipeline
app.post('/api/actions/run-pipeline', createTask('pipeline', async (opts) => {
  const { onProgress } = opts;

  onProgress({ phase: 'scrape', message: 'Fase 1/5: Scraping Google Maps...' });
  await scrapeGoogleMaps({ onProgress });

  onProgress({ phase: 'audit', message: 'Fase 2/5: Auditando webs...' });
  await auditBusinesses({ onProgress });

  onProgress({ phase: 'photos', message: 'Fase 3/5: Buscando fotos...' });
  await scrapePhotosForProspects({ onProgress });

  onProgress({ phase: 'build', message: 'Fase 4/5: Generando sitios web...' });
  await buildSitesForProspects({ onProgress });

  onProgress({ phase: 'send', message: 'Fase 5/5: Enviando mensajes WhatsApp...' });
  await sendProspectMessages({ onProgress });

  onProgress({ phase: 'done', message: 'Pipeline completado' });
}));

app.get('/api/actions/status', (req, res) => {
  const status = {};
  for (const [name, running] of runningTasks) {
    status[name] = running ? 'running' : 'idle';
  }
  res.json(status);
});

// ========== Start Server ==========

export async function startServer() {
  await getDb();
  await initBillingTables();

  app.listen(config.port, () => {
    const mode = getMode() === 'cli' ? 'Claude CLI (Pro Max)' : 'Claude API';
    console.log(`\n🚀 Servidor: ${config.baseUrl}`);
    console.log(`📊 Dashboard: ${config.baseUrl}/dashboard`);
    console.log(`🌐 Sitios: ${config.baseUrl}/sites/`);
    console.log(`💰 Facturas: ${config.baseUrl}/invoices/`);
    console.log(`🤖 IA: ${mode}\n`);
  });
}

export default app;
