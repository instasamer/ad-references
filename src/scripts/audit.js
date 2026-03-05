import { auditBusinesses } from '../auditor/website-auditor.js';

console.log('Iniciando auditoría de webs...\n');

auditBusinesses({
  onProgress: (p) => console.log(`[${p.phase}] ${p.message}`),
}).then((result) => {
  console.log('\nResultado:', result);
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
