import { CronJob } from 'cron';
import { startServer } from './src/server/index.js';
import { scrapeGoogleMaps } from './src/scraper/google-maps.js';
import { scrapePhotosForProspects } from './src/scraper/photo-scraper.js';
import { auditBusinesses } from './src/auditor/website-auditor.js';
import { buildSitesForProspects } from './src/builder/site-generator.js';
import { sendProspectMessages, sendFollowUps } from './src/messenger/whatsapp.js';
import config from './config.js';

const log = (msg) => console.log(`[${new Date().toLocaleTimeString('es-ES')}] ${msg}`);

async function runPipeline() {
  const mode = config.pipeline.testMode ? `TEST (${config.pipeline.testBatchSize} negocios)` : 'PRODUCCIÓN';
  log(`=== PIPELINE INICIADO [${mode}] ===`);

  try {
    log('Fase 1/5: Scraping Google Maps...');
    const scrapeResult = await scrapeGoogleMaps({
      maxResults: config.pipeline.testMode ? config.pipeline.testBatchSize * 3 : config.search.maxResults,
      onProgress: (p) => log(`  [scrape] ${p.message}`),
    });
    log(`Fase 1 completada: ${scrapeResult.saved} nuevos negocios`);
  } catch (e) {
    log(`Error en scraping: ${e.message}`);
  }

  try {
    log('Fase 2/5: Auditando webs...');
    const auditResult = await auditBusinesses({
      onProgress: (p) => log(`  [audit] ${p.message}`),
    });
    log(`Fase 2 completada: ${auditResult.audited} auditados | ${JSON.stringify(auditResult.summary)}`);
  } catch (e) {
    log(`Error en auditoría: ${e.message}`);
  }

  try {
    log('Fase 3/5: Buscando fotos...');
    const photoResult = await scrapePhotosForProspects({
      onProgress: (p) => log(`  [photos] ${p.message}`),
    });
    log(`Fase 3 completada: ${photoResult.processed} negocios con fotos`);
  } catch (e) {
    log(`Error buscando fotos: ${e.message}`);
  }

  try {
    log('Fase 4/5: Generando sitios web...');
    const buildResult = await buildSitesForProspects({
      onProgress: (p) => log(`  [build] ${p.message}`),
    });
    log(`Fase 4 completada: ${buildResult.built} sitios generados`);
  } catch (e) {
    log(`Error generando sitios: ${e.message}`);
  }

  try {
    log('Fase 5/5: Enviando mensajes WhatsApp...');
    const sendResult = await sendProspectMessages({
      onProgress: (p) => log(`  [send] ${p.message}`),
    });
    log(`Fase 5 completada: ${sendResult.sent} enviados, ${sendResult.skipped} omitidos`);
  } catch (e) {
    log(`Error enviando mensajes: ${e.message}`);
  }

  // Also send follow-ups
  try {
    const followResult = await sendFollowUps({
      onProgress: (p) => log(`  [follow-up] ${p.message}`),
    });
    if (followResult.sent > 0) log(`Follow-ups: ${followResult.sent} enviados`);
  } catch (e) {
    // Silent - follow-ups are not critical
  }

  log('=== PIPELINE COMPLETADO ===\n');
}

async function main() {
  const mode = config.pipeline.testMode ? 'TEST' : 'PRODUCCIÓN';
  console.log(`
  ╔══════════════════════════════════════╗
  ║      Agency Bot - Málaga             ║
  ║      Restaurantes · ${mode.padEnd(13)}║
  ╚══════════════════════════════════════╝
  `);

  // Start the web server
  await startServer();

  // Schedule the pipeline
  const job = new CronJob(config.cron.schedule, runPipeline, null, false, 'Europe/Madrid');
  job.start();
  log(`Cron programado: "${config.cron.schedule}" (Europe/Madrid)`);
  log(`Próxima ejecución: ${job.nextDate().toISO()}`);

  if (config.pipeline.testMode) {
    log(`⚠ MODO TEST activo: procesando máximo ${config.pipeline.testBatchSize} negocios por fase`);
    log(`Para desactivar: TEST_MODE=false en .env`);
  }

  // Run immediately if --now flag
  if (process.argv.includes('--now')) {
    log('Flag --now detectado, ejecutando pipeline...');
    await runPipeline();
  }

  log('Bot activo → ' + config.baseUrl + '/dashboard');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
