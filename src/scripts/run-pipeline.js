import { scrapeGoogleMaps } from '../scraper/google-maps.js';
import { auditBusinesses } from '../auditor/website-auditor.js';
import { buildSitesForProspects } from '../builder/site-generator.js';
import { sendProspectMessages } from '../messenger/whatsapp.js';

const log = (msg) => console.log(`[${new Date().toLocaleTimeString('es-ES')}] ${msg}`);

async function pipeline() {
  log('=== PIPELINE MANUAL ===\n');

  log('Fase 1: Scraping...');
  const s = await scrapeGoogleMaps({ onProgress: (p) => log(`  ${p.message}`) });
  log(`  -> ${s.saved} nuevos\n`);

  log('Fase 2: Auditoría...');
  const a = await auditBusinesses({ onProgress: (p) => log(`  ${p.message}`) });
  log(`  -> ${a.audited} auditados\n`);

  log('Fase 3: Generando sitios...');
  const b = await buildSitesForProspects({ onProgress: (p) => log(`  ${p.message}`) });
  log(`  -> ${b.built} sitios\n`);

  log('Fase 4: WhatsApp...');
  const m = await sendProspectMessages({ onProgress: (p) => log(`  ${p.message}`) });
  log(`  -> ${m.sent} enviados\n`);

  log('=== PIPELINE COMPLETADO ===');
}

pipeline().then(() => process.exit(0)).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
