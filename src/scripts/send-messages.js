import { sendProspectMessages } from '../messenger/whatsapp.js';

console.log('Enviando mensajes a prospectos...\n');

sendProspectMessages({
  onProgress: (p) => console.log(`[${p.phase}] ${p.message}`),
}).then((result) => {
  console.log('\nResultado:', result);
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
