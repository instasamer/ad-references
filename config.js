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

  // Pricing
  pricing: {
    standard: 200,
    earlyBird: 150,
    earlyBirdHours: 48,
    supportWeeks: 2,
    currency: 'EUR',
  },

  // Invoice data (autónoma)
  invoice: {
    businessName: process.env.INVOICE_BUSINESS_NAME || '',
    nif: process.env.INVOICE_NIF || '',
    address: process.env.INVOICE_ADDRESS || '',
    city: process.env.INVOICE_CITY || '',
    postalCode: process.env.INVOICE_POSTAL_CODE || '',
    email: process.env.INVOICE_EMAIL || '',
    phone: process.env.INVOICE_PHONE || '',
    iban: process.env.INVOICE_IBAN || '',
    bankName: process.env.INVOICE_BANK_NAME || '',
    // IVA 21% standard for services in Spain
    ivaRate: 0.21,
    // IRPF retention for autónomos (first 2 years can be 7%, then 15%)
    irpfRate: parseFloat(process.env.INVOICE_IRPF_RATE || '0.15'),
  },

  // Pipeline control
  pipeline: {
    testMode: process.env.TEST_MODE !== 'false', // true by default
    testBatchSize: parseInt(process.env.TEST_BATCH_SIZE || '5'),
  },
};
