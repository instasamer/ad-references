import express from 'express';
import cors from 'cors';
import { existsSync } from 'fs';
import { getDb, runQuery, runExec } from '../db/database.js';
import { scrapeGoogleMaps } from '../scraper/google-maps.js';
import { auditBusinesses } from '../auditor/website-auditor.js';
import { buildSitesForProspects } from '../builder/site-generator.js';
import { sendProspectMessages, getWhatsAppStatus, initWhatsApp } from '../messenger/whatsapp.js';
import config from '../../config.js';

const app = express();
app.use(cors());
app.use(express.json());

// Serve generated sites
app.use('/sites', express.static('./sites'));

// Serve dashboard
app.use('/dashboard', express.static('./src/dashboard'));

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
    const lastRun = runQuery(
      'SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 1'
    );
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
      lastRun: lastRun[0] || null,
      recentMessages,
      whatsapp: getWhatsAppStatus(),
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
    const total = runQuery(
      sql.replace('SELECT *', 'SELECT COUNT(*) as c').replace(/LIMIT.*$/, ''),
      params.slice(0, -2)
    )[0].c;

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

// ========== API: Pipeline Actions ==========

// Track running tasks
const runningTasks = new Map();

function createTask(name, fn) {
  return async (req, res) => {
    if (runningTasks.get(name)) {
      return res.status(409).json({ error: `${name} ya está en ejecución` });
    }

    runningTasks.set(name, true);
    const logs = [];
    const onProgress = (p) => logs.push({ ...p, timestamp: new Date().toISOString() });

    res.json({ status: 'started', message: `${name} iniciado` });

    try {
      await fn({ onProgress, ...req.body });
    } catch (error) {
      logs.push({ phase: 'error', message: error.message, timestamp: new Date().toISOString() });
    } finally {
      runningTasks.set(name, false);
    }
  };
}

app.post('/api/actions/scrape', createTask('scrape', async (opts) => {
  await scrapeGoogleMaps(opts);
}));

app.post('/api/actions/audit', createTask('audit', async (opts) => {
  await auditBusinesses(opts);
}));

app.post('/api/actions/build-sites', createTask('build-sites', async (opts) => {
  await buildSitesForProspects(opts);
}));

app.post('/api/actions/send-messages', createTask('send-messages', async (opts) => {
  await sendProspectMessages(opts);
}));

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

  onProgress({ phase: 'scrape', message: 'Fase 1: Scraping Google Maps...' });
  await scrapeGoogleMaps({ onProgress });

  onProgress({ phase: 'audit', message: 'Fase 2: Auditando webs...' });
  await auditBusinesses({ onProgress });

  onProgress({ phase: 'build', message: 'Fase 3: Generando sitios web...' });
  await buildSitesForProspects({ onProgress });

  onProgress({ phase: 'send', message: 'Fase 4: Enviando mensajes WhatsApp...' });
  await sendProspectMessages({ onProgress });

  onProgress({ phase: 'done', message: 'Pipeline completado.' });
}));

// Task status
app.get('/api/actions/status', (req, res) => {
  const status = {};
  for (const [name, running] of runningTasks) {
    status[name] = running ? 'running' : 'idle';
  }
  res.json(status);
});

// ========== API: Pipeline Logs ==========

app.get('/api/pipeline-runs', async (req, res) => {
  try {
    const db = await getDb();
    const runs = runQuery('SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 20');
    res.json(runs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Start Server ==========

export async function startServer() {
  await getDb();

  app.listen(config.port, () => {
    console.log(`\n🚀 Servidor corriendo en ${config.baseUrl}`);
    console.log(`📊 Dashboard: ${config.baseUrl}/dashboard`);
    console.log(`🌐 Sitios generados: ${config.baseUrl}/sites/\n`);
  });
}

export default app;
