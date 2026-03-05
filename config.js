import { readFileSync, existsSync } from 'fs';

// Load .env manually (no dotenv dependency)
function loadEnv() {
  const envPath = '.env';
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

export default {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  port: parseInt(process.env.PORT || '3000'),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  search: {
    location: process.env.SEARCH_LOCATION || 'Málaga, España',
    query: process.env.SEARCH_QUERY || 'restaurantes',
    radiusKm: parseInt(process.env.SEARCH_RADIUS_KM || '10'),
    maxResults: parseInt(process.env.MAX_RESULTS_PER_RUN || '50'),
  },

  whatsapp: {
    sessionPath: process.env.WHATSAPP_SESSION_PATH || './data/whatsapp-session',
  },

  cron: {
    schedule: process.env.CRON_SCHEDULE || '0 9 * * *',
  },
};
