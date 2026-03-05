import { buildSitesForProspects } from '../builder/site-generator.js';

console.log('Generando sitios web para prospectos...\n');

buildSitesForProspects({
  onProgress: (p) => console.log(`[${p.phase}] ${p.message}`),
}).then((result) => {
  console.log('\nResultado:', result);
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
