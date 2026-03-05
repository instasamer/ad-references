import { scrapeGoogleMaps } from '../scraper/google-maps.js';

console.log('Iniciando scraping de Google Maps...\n');

scrapeGoogleMaps({
  onProgress: (p) => console.log(`[${p.phase}] ${p.message}`),
}).then((result) => {
  console.log('\nResultado:', result);
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
