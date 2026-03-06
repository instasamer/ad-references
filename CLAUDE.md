# Ad References — Agencia Automatizada de Venta de Webs

Sistema automatizado que busca negocios locales sin web (o con web mala), les genera una web demo con IA, y les contacta por WhatsApp para venderles el servicio.

## Arquitectura

```
src/
├── ai/            → Cliente unificado Claude (API o CLI Pro Max)
├── scraper/       → Scraping Google Maps + fotos de negocios
├── auditor/       → Auditoría automática de webs existentes (grades A-F)
├── builder/       → Genera sitios HTML con IA para negocios sin web
├── messenger/     → WhatsApp (envío + asistente IA para respuestas)
├── billing/       → Facturación: proformas, facturas, precios
├── dashboard/     → Panel web (HTML/JS estático)
├── server/        → Express API + servidor estático
├── db/            → SQLite (better-sqlite3)
└── scripts/       → Scripts auxiliares
```

## Pipeline (5 fases)

1. **Scrape**: Busca negocios en Google Maps por zona/categoría
2. **Audit**: Evalúa la web de cada negocio (A=buena → F=no tiene)
3. **Photos**: Descarga fotos del negocio para usarlas en la web demo
4. **Build**: Genera sitio HTML con Claude para negocios con grade D/F
5. **Send**: Envía WhatsApp con enlace a la web demo

## IA: Dos modos

El sistema puede usar Claude de dos formas (configurado automáticamente):

- **API mode**: Si `ANTHROPIC_API_KEY` está en `.env` → usa la API (rápido, cuesta tokens)
- **CLI mode**: Si NO hay API key → usa `claude -p` del CLI (Pro Max, gratis)

El cliente unificado está en `src/ai/claude-client.js`. Importar siempre:
```js
import { claudeChat } from '../ai/claude-client.js';
const response = await claudeChat({ system, messages, maxTokens });
```

## Comandos

```bash
npm start          # Arranca servidor en puerto 3000
npm run dev        # Modo desarrollo (nodemon)
```

## Configuración (.env)

```
# IA (opcional — sin esto usa CLI Pro Max)
ANTHROPIC_API_KEY=

# Servidor
PORT=3000
BASE_URL=http://localhost:3000

# Búsqueda
SEARCH_LOCATION=Málaga, España
SEARCH_QUERY=restaurantes
SEARCH_RADIUS_KM=10
MAX_RESULTS_PER_RUN=50

# Pipeline
TEST_MODE=true          # true = modo test (pocos resultados)
TEST_BATCH_SIZE=5

# WhatsApp
WHATSAPP_SESSION_PATH=./data/whatsapp-session

# Facturación (datos de autónoma)
INVOICE_BUSINESS_NAME=
INVOICE_NIF=
INVOICE_ADDRESS=
INVOICE_CITY=
INVOICE_POSTAL_CODE=
INVOICE_EMAIL=
INVOICE_PHONE=
INVOICE_IBAN=
INVOICE_BANK_NAME=
INVOICE_IRPF_RATE=0.15
```

## Base de datos

SQLite en `./data/ad-references.db`. Tablas principales:
- `businesses` — negocios scrapeados (nombre, teléfono, web, grade, status, etc.)
- `messages` — historial de mensajes WhatsApp enviados/recibidos
- `scrape_runs` — registro de ejecuciones del scraper
- `invoices` — facturas generadas

## API endpoints principales

- `GET /api/stats` — estadísticas generales
- `GET /api/businesses` — listado con filtros (?grade=F&status=new)
- `POST /api/actions/run-pipeline` — ejecuta pipeline completo
- `POST /api/actions/scrape|audit|photos|build-sites|send-messages` — fases individuales
- `GET /api/pricing` — precios actuales
- `POST /api/invoices/proforma` — genera proforma
- `POST /api/invoices/confirm-payment` — confirma pago y genera factura

## Precios

- Estándar: 200€ + IVA
- Early bird (48h): 150€ + IVA
- Incluye 2 semanas de soporte

## Notas importantes

- Siempre usar `claudeChat()` de `src/ai/claude-client.js` para cualquier llamada a Claude
- La DB es síncrona (better-sqlite3), las funciones `runQuery`/`runExec` de `src/db/database.js`
- WhatsApp usa whatsapp-web.js con sesión persistente
- Todo el dashboard es HTML/JS estático servido por Express
- El pipeline tiene modo test por defecto (TEST_MODE=true) para no hacer scraping masivo accidentalmente
