import { CronJob } from 'cron';
import { startServer } from './src/server/index.js';
import { scrapeGoogleMaps } from './src/scraper/google-maps.js';
import { auditBusinesses } from './src/auditor/website-auditor.js';
import { buildSitesForProspects } from './src/builder/site-generator.js';
import { sendProspectMessages } from './src/messenger/whatsapp.js';
import config from './config.js';

const log = (msg) => console.log(`[${new Date().toLocaleTimeString('es-ES')}] ${msg}`);

async function runPipeline() {
  log('=== PIPELINE INICIADO ===');

  try {
    log('Fase 1: Scraping Google Maps...');
    const scrapeResult = await scrapeGoogleMaps({
      onProgress: (p) => log(`  [scrape] ${p.message}`),
    });
    log(`Fase 1 completada: ${scrapeResult.saved} nuevos negocios`);
  } catch (e) {
    log(`Error en scraping: ${e.message}`);
  }

  try {
    log('Fase 2: Auditando webs...');
    const auditResult = await auditBusinesses({
      onProgress: (p) => log(`  [audit] ${p.message}`),
    });
    log(`Fase 2 completada: ${auditResult.audited} auditados`);
  } catch (e) {
    log(`Error en auditoría: ${e.message}`);
  }

  try {
    log('Fase 3: Generando sitios web...');
    const buildResult = await buildSitesForProspects({
      onProgress: (p) => log(`  [build] ${p.message}`),
    });
    log(`Fase 3 completada: ${buildResult.built} sitios generados`);
  } catch (e) {
    log(`Error generando sitios: ${e.message}`);
  }

  try {
    log('Fase 4: Enviando mensajes WhatsApp...');
    const sendResult = await sendProspectMessages({
      onProgress: (p) => log(`  [send] ${p.message}`),
    });
    log(`Fase 4 completada: ${sendResult.sent} enviados, ${sendResult.skipped} omitidos`);
  } catch (e) {
    log(`Error enviando mensajes: ${e.message}`);
  }

  log('=== PIPELINE COMPLETADO ===\n');
}

async function main() {
  console.log(`
  ╔══════════════════════════════════════╗
  ║      Agency Bot - Malaga             ║
  ║      Restaurantes sin web            ║
  ╚══════════════════════════════════════╝
  `);

  // Start the web server (dashboard + site hosting)
  await startServer();

  // Schedule the pipeline
  const job = new CronJob(config.cron.schedule, runPipeline, null, false, 'Europe/Madrid');
  job.start();
  log(`Cron programado: "${config.cron.schedule}" (zona: Europe/Madrid)`);
  log(`Próxima ejecución: ${job.nextDate().toISO()}`);

  // Check for --now flag to run immediately
  if (process.argv.includes('--now')) {
    log('Flag --now detectado, ejecutando pipeline ahora...');
    await runPipeline();
  }

  log('Bot activo. Dashboard disponible en ' + config.baseUrl + '/dashboard');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
