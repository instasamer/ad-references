import { scrapeAdsOfTheWorld } from './adsoftheworld.js';
import { scrapeLoveTheWorkMore } from './lovetheworkmore.js';

export const SOURCES = {
  adsoftheworld: {
    name: 'Ads of the World',
    description: 'La biblioteca más grande de anuncios creativos del mundo',
    url: 'https://adsoftheworld.com',
    scraper: scrapeAdsOfTheWorld,
    categories: ['film', 'print', 'digital', 'outdoor', 'audio'],
  },
  lovetheworkmore: {
    name: 'Love The Work More',
    description: 'Todos los trabajos ganadores de Cannes Lions desde 1954',
    url: 'https://lovetheworkmore.com',
    scraper: scrapeLoveTheWorkMore,
    categories: ['film', 'print', 'outdoor', 'digital', 'design'],
    years: Array.from({ length: 2025 - 1954 + 1 }, (_, i) => 2025 - i), // 2025 hasta 1954
  },
};

// Estado de las importaciones en curso
const importStatus = new Map();

export function getImportStatus(importId) {
  return importStatus.get(importId) || null;
}

export function getAllImportStatuses() {
  return Object.fromEntries(importStatus);
}

export async function runImport(source, options = {}) {
  const sourceConfig = SOURCES[source];
  if (!sourceConfig) {
    throw new Error(`Fuente desconocida: ${source}`);
  }

  const importId = `${source}-${Date.now()}`;

  // Inicializar estado
  importStatus.set(importId, {
    id: importId,
    source,
    sourceName: sourceConfig.name,
    status: 'running',
    startedAt: new Date().toISOString(),
    progress: [],
    results: [],
    error: null,
  });

  // Función para actualizar progreso
  const onProgress = (update) => {
    const current = importStatus.get(importId);
    if (current) {
      current.progress.push({
        ...update,
        timestamp: new Date().toISOString(),
      });
      current.currentStatus = update.status;
      current.currentMessage = update.message;

      if (update.total !== undefined) {
        current.totalFound = update.total;
      }
    }
  };

  try {
    const results = await sourceConfig.scraper({
      ...options,
      onProgress,
    });

    const current = importStatus.get(importId);
    if (current) {
      current.status = 'completed';
      current.completedAt = new Date().toISOString();
      current.results = results;
      current.totalFound = results.length;
    }

    return { importId, results };
  } catch (error) {
    const current = importStatus.get(importId);
    if (current) {
      current.status = 'failed';
      current.error = error.message;
      current.completedAt = new Date().toISOString();
    }
    throw error;
  }
}

// Limpiar importaciones antiguas (más de 1 hora)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, status] of importStatus.entries()) {
    if (new Date(status.startedAt).getTime() < oneHourAgo) {
      importStatus.delete(id);
    }
  }
}, 10 * 60 * 1000); // Cada 10 minutos
