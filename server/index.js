import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import initSqlJs from 'sql.js';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { SOURCES, runImport, getImportStatus, getAllImportStatuses } from './scrapers/index.js';
import {
  initYouTube,
  isYouTubeConfigured,
  searchChannels,
  getChannelInfo,
  getChannelVideos,
  getVideoDetails,
  searchVideos,
  TOP_BRANDS,
  YOUTUBE_CATEGORY_MAP,
  isLikelyAd,
} from './scrapers/youtube.js';

// Inicializar YouTube API si hay API key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || null;
if (YOUTUBE_API_KEY) {
  initYouTube(YOUTUBE_API_KEY);
  console.log('YouTube API configurada');
} else {
  console.log('YouTube API no configurada (set YOUTUBE_API_KEY)');
}

// Inicializar Claude AI para asistente inteligente
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || null;
let anthropic = null;
if (ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  console.log('Claude AI configurado');
} else {
  console.log('Claude AI no configurado (set ANTHROPIC_API_KEY)');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Crear carpeta uploads si no existe
const uploadsDir = join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${uuidv4()}.${ext}`);
  }
});
const upload = multer({ storage });

// Base de datos SQLite
const dbPath = join(__dirname, '../database.sqlite');
let db;

async function initDatabase() {
  const SQL = await initSqlJs();

  // Cargar base de datos existente o crear nueva
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Inicializar tablas
  db.run(`
    CREATE TABLE IF NOT EXISTS references_ads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT CHECK(type IN ('image', 'video', 'link')) NOT NULL,
      url TEXT,
      file_path TEXT,
      thumbnail TEXT,
      brand TEXT,
      year INTEGER,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reference_tags (
      reference_id TEXT,
      tag_id TEXT,
      PRIMARY KEY (reference_id, tag_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS searches (
      id TEXT PRIMARY KEY,
      query_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tablas para marcas y canales de YouTube
  db.run(`
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo TEXT,
      website TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS youtube_channels (
      id TEXT PRIMARY KEY,
      brand_id TEXT,
      channel_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      thumbnail TEXT,
      subscriber_count INTEGER,
      video_count INTEGER,
      region TEXT,
      last_sync DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS youtube_videos (
      id TEXT PRIMARY KEY,
      channel_id TEXT,
      video_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      thumbnail TEXT,
      published_at DATETIME,
      duration TEXT,
      view_count INTEGER,
      like_count INTEGER,
      is_ad INTEGER DEFAULT 0,
      synced_to_library INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES youtube_channels(id) ON DELETE CASCADE
    )
  `);

  // Insertar tags predefinidos
  const predefinedTags = [
    // Sectores
    { name: 'alimentacion', category: 'sector' },
    { name: 'tecnologia', category: 'sector' },
    { name: 'moda', category: 'sector' },
    { name: 'automocion', category: 'sector' },
    { name: 'belleza', category: 'sector' },
    { name: 'finanzas', category: 'sector' },
    { name: 'salud', category: 'sector' },
    { name: 'entretenimiento', category: 'sector' },
    { name: 'viajes', category: 'sector' },
    { name: 'hogar', category: 'sector' },
    { name: 'deportes', category: 'sector' },
    { name: 'educacion', category: 'sector' },

    // Tonos
    { name: 'humor', category: 'tono' },
    { name: 'emocional', category: 'tono' },
    { name: 'serio', category: 'tono' },
    { name: 'inspirador', category: 'tono' },
    { name: 'provocador', category: 'tono' },
    { name: 'minimalista', category: 'tono' },
    { name: 'lujoso', category: 'tono' },
    { name: 'juvenil', category: 'tono' },
    { name: 'nostalgico', category: 'tono' },
    { name: 'irreverente', category: 'tono' },

    // Formatos
    { name: 'spot-tv', category: 'formato' },
    { name: 'reel', category: 'formato' },
    { name: 'story', category: 'formato' },
    { name: 'carousel', category: 'formato' },
    { name: 'print', category: 'formato' },
    { name: 'outdoor', category: 'formato' },
    { name: 'banner', category: 'formato' },
    { name: 'video-largo', category: 'formato' },
    { name: 'video-corto', category: 'formato' },

    // Época
    { name: 'vintage', category: 'epoca' },
    { name: 'retro-80s', category: 'epoca' },
    { name: 'retro-90s', category: 'epoca' },
    { name: '2000s', category: 'epoca' },
    { name: '2010s', category: 'epoca' },
    { name: 'actual', category: 'epoca' },

    // Técnicas
    { name: 'animacion', category: 'tecnica' },
    { name: 'live-action', category: 'tecnica' },
    { name: 'stop-motion', category: 'tecnica' },
    { name: 'mixed-media', category: 'tecnica' },
    { name: 'ugc', category: 'tecnica' },
    { name: 'influencer', category: 'tecnica' },
    { name: 'celebrity', category: 'tecnica' },
    { name: 'ilustracion', category: 'tecnica' },
    { name: 'fotografia', category: 'tecnica' },

    // Objetivos
    { name: 'branding', category: 'objetivo' },
    { name: 'performance', category: 'objetivo' },
    { name: 'lanzamiento', category: 'objetivo' },
    { name: 'awareness', category: 'objetivo' },
    { name: 'conversion', category: 'objetivo' },
    { name: 'engagement', category: 'objetivo' }
  ];

  for (const tag of predefinedTags) {
    try {
      db.run('INSERT OR IGNORE INTO tags (id, name, category) VALUES (?, ?, ?)', [uuidv4(), tag.name, tag.category]);
    } catch (e) {
      // Ignore duplicates
    }
  }

  saveDatabase();
  console.log('Base de datos inicializada');
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Helper function to run queries
function runQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function runExec(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

// ============ RUTAS API ============

// Obtener todas las referencias
app.get('/api/references', (req, res) => {
  try {
    const references = runQuery(`
      SELECT r.*, GROUP_CONCAT(t.name) as tags
      FROM references_ads r
      LEFT JOIN reference_tags rt ON r.id = rt.reference_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);

    const result = references.map(ref => ({
      ...ref,
      tags: ref.tags ? ref.tags.split(',') : []
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener una referencia por ID
app.get('/api/references/:id', (req, res) => {
  try {
    const references = runQuery(`
      SELECT r.*, GROUP_CONCAT(t.name) as tags
      FROM references_ads r
      LEFT JOIN reference_tags rt ON r.id = rt.reference_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE r.id = ?
      GROUP BY r.id
    `, [req.params.id]);

    if (references.length === 0) {
      return res.status(404).json({ error: 'Referencia no encontrada' });
    }

    const reference = references[0];
    res.json({
      ...reference,
      tags: reference.tags ? reference.tags.split(',') : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva referencia
app.post('/api/references', upload.single('file'), (req, res) => {
  try {
    const { title, description, type, url, brand, year, source, tags } = req.body;
    const id = uuidv4();
    const filePath = req.file ? `/uploads/${req.file.filename}` : null;

    runExec(`
      INSERT INTO references_ads (id, title, description, type, url, file_path, brand, year, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, title, description || null, type, url || null, filePath, brand || null, year || null, source || null]);

    // Añadir tags
    if (tags) {
      const tagList = typeof tags === 'string' ? JSON.parse(tags) : tags;

      for (const tagName of tagList) {
        const tagResults = runQuery('SELECT id FROM tags WHERE name = ?', [tagName.toLowerCase()]);
        if (tagResults.length > 0) {
          runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [id, tagResults[0].id]);
        }
      }
    }

    res.status(201).json({ id, message: 'Referencia creada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar referencia
app.put('/api/references/:id', (req, res) => {
  try {
    const { title, description, type, url, brand, year, source, tags } = req.body;

    runExec(`
      UPDATE references_ads
      SET title = ?, description = ?, type = ?, url = ?, brand = ?, year = ?, source = ?
      WHERE id = ?
    `, [title, description, type, url, brand, year, source, req.params.id]);

    // Actualizar tags
    if (tags) {
      runExec('DELETE FROM reference_tags WHERE reference_id = ?', [req.params.id]);

      for (const tagName of tags) {
        const tagResults = runQuery('SELECT id FROM tags WHERE name = ?', [tagName.toLowerCase()]);
        if (tagResults.length > 0) {
          runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [req.params.id, tagResults[0].id]);
        }
      }
    }

    res.json({ message: 'Referencia actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar referencia
app.delete('/api/references/:id', (req, res) => {
  try {
    const refs = runQuery('SELECT file_path FROM references_ads WHERE id = ?', [req.params.id]);

    if (refs.length > 0 && refs[0].file_path) {
      const fullPath = join(__dirname, '..', refs[0].file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    runExec('DELETE FROM reference_tags WHERE reference_id = ?', [req.params.id]);
    runExec('DELETE FROM references_ads WHERE id = ?', [req.params.id]);
    res.json({ message: 'Referencia eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los tags
app.get('/api/tags', (req, res) => {
  try {
    const tags = runQuery('SELECT * FROM tags ORDER BY category, name');

    // Agrupar por categoría
    const grouped = tags.reduce((acc, tag) => {
      if (!acc[tag.category]) {
        acc[tag.category] = [];
      }
      acc[tag.category].push(tag);
      return acc;
    }, {});

    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo tag
app.post('/api/tags', (req, res) => {
  try {
    const { name, category } = req.body;
    const id = uuidv4();

    runExec('INSERT INTO tags (id, name, category) VALUES (?, ?, ?)', [id, name.toLowerCase(), category]);
    res.status(201).json({ id, name, category });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'El tag ya existe' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Búsqueda avanzada con cuestionario
app.post('/api/search', (req, res) => {
  try {
    const { sector, tono, formato, epoca, tecnica, objetivo, keywords } = req.body;

    // Guardar búsqueda
    const searchId = uuidv4();
    runExec('INSERT INTO searches (id, query_data) VALUES (?, ?)', [searchId, JSON.stringify(req.body)]);

    // Construir query dinámica
    let query = `
      SELECT DISTINCT r.*,
        GROUP_CONCAT(DISTINCT t.name) as tags
      FROM references_ads r
      LEFT JOIN reference_tags rt ON r.id = rt.reference_id
      LEFT JOIN tags t ON rt.tag_id = t.id
    `;

    const conditions = [];
    const params = [];

    // Filtrar por tags seleccionados
    const selectedTags = [sector, tono, formato, epoca, tecnica, objetivo].filter(Boolean).flat();

    if (selectedTags.length > 0) {
      const tagPlaceholders = selectedTags.map(() => '?').join(',');
      conditions.push(`r.id IN (
        SELECT reference_id FROM reference_tags rt2
        JOIN tags t2 ON rt2.tag_id = t2.id
        WHERE t2.name IN (${tagPlaceholders})
      )`);
      params.push(...selectedTags.map(t => t.toLowerCase()));
    }

    // Búsqueda por keywords en título y descripción
    if (keywords) {
      conditions.push('(r.title LIKE ? OR r.description LIKE ? OR r.brand LIKE ?)');
      const keywordPattern = `%${keywords}%`;
      params.push(keywordPattern, keywordPattern, keywordPattern);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY r.id ORDER BY r.created_at DESC';

    const results = runQuery(query, params);

    const formattedResults = results.map(ref => ({
      ...ref,
      tags: ref.tags ? ref.tags.split(',') : []
    }));

    res.json({
      searchId,
      count: formattedResults.length,
      results: formattedResults
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ASISTENTE IA ============

// Buscar con lenguaje natural usando Claude
app.post('/api/ai/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query requerida' });
    }

    // Obtener todos los tags disponibles
    const allTags = runQuery('SELECT name, category FROM tags');
    const tagsByCategory = allTags.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t.name);
      return acc;
    }, {});

    // Obtener algunas marcas populares
    const topBrands = runQuery(`
      SELECT brand, COUNT(*) as count FROM references_ads
      WHERE brand IS NOT NULL
      GROUP BY brand ORDER BY count DESC LIMIT 30
    `).map(b => b.brand);

    // Si no hay API de Claude, hacer búsqueda básica
    if (!anthropic) {
      // Búsqueda simple por keywords
      const keywords = query.toLowerCase().split(/\s+/);
      let searchQuery = `
        SELECT DISTINCT r.*, GROUP_CONCAT(DISTINCT t.name) as tags
        FROM references_ads r
        LEFT JOIN reference_tags rt ON r.id = rt.reference_id
        LEFT JOIN tags t ON rt.tag_id = t.id
        WHERE 1=1
      `;
      const conditions = [];
      const params = [];

      for (const kw of keywords) {
        if (kw.length > 2) {
          conditions.push('(LOWER(r.title) LIKE ? OR LOWER(r.description) LIKE ? OR LOWER(r.brand) LIKE ? OR LOWER(t.name) LIKE ?)');
          const pattern = `%${kw}%`;
          params.push(pattern, pattern, pattern, pattern);
        }
      }

      if (conditions.length > 0) {
        searchQuery += ' AND (' + conditions.join(' OR ') + ')';
      }
      searchQuery += ' GROUP BY r.id ORDER BY RANDOM() LIMIT 20';

      const results = runQuery(searchQuery, params);

      return res.json({
        mode: 'basic',
        message: 'Búsqueda básica (configura ANTHROPIC_API_KEY para búsqueda inteligente)',
        interpretation: null,
        results: results.map(r => ({ ...r, tags: r.tags ? r.tags.split(',') : [] }))
      });
    }

    // Usar Claude para interpretar la búsqueda
    const systemPrompt = `Eres un experto en publicidad y creatividad que ayuda a encontrar referencias de anuncios.

El usuario tiene una base de datos de anuncios con estos filtros disponibles:

SECTORES: ${tagsByCategory.sector?.join(', ') || 'alimentacion, tecnologia, moda, automocion, belleza, finanzas, salud, entretenimiento, viajes, hogar, deportes, educacion'}

TONOS: ${tagsByCategory.tono?.join(', ') || 'humor, emocional, serio, inspirador, provocador, minimalista, lujoso, juvenil, nostalgico, irreverente'}

FORMATOS: ${tagsByCategory.formato?.join(', ') || 'spot-tv, reel, story, carousel, print, outdoor, banner, video-largo, video-corto'}

ÉPOCAS: ${tagsByCategory.epoca?.join(', ') || 'vintage, retro-80s, retro-90s, 2000s, 2010s, actual'}

TÉCNICAS: ${tagsByCategory.tecnica?.join(', ') || 'animacion, live-action, stop-motion, mixed-media, ugc, influencer, celebrity, ilustracion, fotografia'}

OBJETIVOS: ${tagsByCategory.objetivo?.join(', ') || 'branding, performance, lanzamiento, awareness, conversion, engagement'}

MARCAS DISPONIBLES: ${topBrands.join(', ')}

Analiza lo que el usuario busca y responde ÚNICAMENTE con un JSON válido (sin texto adicional):
{
  "interpretation": "explicación corta de lo que entendiste que busca",
  "tags": ["tag1", "tag2"],
  "brands": ["marca1"],
  "keywords": ["palabra1", "palabra2"],
  "type": "video" | "image" | null
}

Usa SOLO tags que existan en las listas anteriores. Si no hay coincidencia exacta, elige los más cercanos.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: query }]
    });

    let parsed;
    try {
      const content = response.content[0].text.trim();
      // Extraer JSON si viene con texto adicional
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      // Si falla el parsing, hacer búsqueda básica
      return res.json({
        mode: 'fallback',
        message: 'No se pudo interpretar, búsqueda por keywords',
        results: []
      });
    }

    // Construir query SQL basada en la interpretación
    let searchQuery = `
      SELECT DISTINCT r.*, GROUP_CONCAT(DISTINCT t.name) as tags
      FROM references_ads r
      LEFT JOIN reference_tags rt ON r.id = rt.reference_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE 1=1
    `;
    const params = [];

    // Filtrar por tags
    if (parsed.tags && parsed.tags.length > 0) {
      const tagPlaceholders = parsed.tags.map(() => '?').join(',');
      searchQuery += ` AND r.id IN (
        SELECT reference_id FROM reference_tags rt2
        JOIN tags t2 ON rt2.tag_id = t2.id
        WHERE LOWER(t2.name) IN (${tagPlaceholders})
      )`;
      params.push(...parsed.tags.map(t => t.toLowerCase()));
    }

    // Filtrar por marcas
    if (parsed.brands && parsed.brands.length > 0) {
      const brandConditions = parsed.brands.map(() => 'LOWER(r.brand) LIKE ?').join(' OR ');
      searchQuery += ` AND (${brandConditions})`;
      params.push(...parsed.brands.map(b => `%${b.toLowerCase()}%`));
    }

    // Filtrar por tipo
    if (parsed.type) {
      searchQuery += ' AND r.type = ?';
      params.push(parsed.type);
    }

    // Filtrar por keywords en título/descripción
    if (parsed.keywords && parsed.keywords.length > 0) {
      const kwConditions = parsed.keywords.map(() => '(LOWER(r.title) LIKE ? OR LOWER(r.description) LIKE ?)').join(' OR ');
      searchQuery += ` AND (${kwConditions})`;
      for (const kw of parsed.keywords) {
        params.push(`%${kw.toLowerCase()}%`, `%${kw.toLowerCase()}%`);
      }
    }

    searchQuery += ' GROUP BY r.id ORDER BY RANDOM() LIMIT 24';

    const results = runQuery(searchQuery, params);

    res.json({
      mode: 'ai',
      interpretation: parsed.interpretation,
      filters: {
        tags: parsed.tags,
        brands: parsed.brands,
        keywords: parsed.keywords,
        type: parsed.type
      },
      count: results.length,
      results: results.map(r => ({ ...r, tags: r.tags ? r.tags.split(',') : [] }))
    });

  } catch (error) {
    console.error('Error en búsqueda AI:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configurar API key de Claude
app.post('/api/ai/configure', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ error: 'API key requerida' });
  }
  try {
    anthropic = new Anthropic({ apiKey });
    res.json({ success: true, message: 'Claude AI configurado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estado de configuración de Claude
app.get('/api/ai/status', (req, res) => {
  res.json({
    configured: anthropic !== null,
    message: anthropic
      ? 'Asistente IA activo'
      : 'Configura ANTHROPIC_API_KEY para búsqueda inteligente'
  });
});

// Estadísticas
app.get('/api/stats', (req, res) => {
  try {
    const totalRefs = runQuery('SELECT COUNT(*) as count FROM references_ads')[0];
    const byType = runQuery('SELECT type, COUNT(*) as count FROM references_ads GROUP BY type');
    const topTags = runQuery(`
      SELECT t.name, t.category, COUNT(*) as count
      FROM reference_tags rt
      JOIN tags t ON rt.tag_id = t.id
      GROUP BY t.id
      ORDER BY count DESC
      LIMIT 10
    `);
    const recentSearches = runQuery('SELECT * FROM searches ORDER BY created_at DESC LIMIT 5');

    res.json({
      totalReferences: totalRefs.count,
      byType,
      topTags,
      recentSearches: recentSearches.map(s => ({
        ...s,
        query_data: JSON.parse(s.query_data)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ RUTAS DE IMPORTACIÓN ============

// Obtener fuentes disponibles para importar
app.get('/api/import/sources', (req, res) => {
  const sources = Object.entries(SOURCES).map(([key, config]) => ({
    id: key,
    name: config.name,
    description: config.description,
    url: config.url,
    categories: config.categories || [],
    years: config.years || [],
  }));
  res.json(sources);
});

// Iniciar importación desde una fuente
app.post('/api/import/start', async (req, res) => {
  try {
    const { source, maxPages = 3, category = null, year = null } = req.body;

    if (!SOURCES[source]) {
      return res.status(400).json({ error: `Fuente desconocida: ${source}` });
    }

    // Iniciar importación en background
    const { importId } = await runImport(source, { maxPages, category, year });

    res.json({
      importId,
      message: `Importación iniciada desde ${SOURCES[source].name}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estado de una importación
app.get('/api/import/status/:importId', (req, res) => {
  const status = getImportStatus(req.params.importId);
  if (!status) {
    return res.status(404).json({ error: 'Importación no encontrada' });
  }
  res.json(status);
});

// Obtener todas las importaciones activas
app.get('/api/import/status', (req, res) => {
  res.json(getAllImportStatuses());
});

// Guardar resultados de importación en la base de datos
app.post('/api/import/save', async (req, res) => {
  try {
    const { importId, selectedIds = null } = req.body;

    const status = getImportStatus(importId);
    if (!status) {
      return res.status(404).json({ error: 'Importación no encontrada' });
    }

    if (status.status !== 'completed') {
      return res.status(400).json({ error: 'La importación aún no ha terminado' });
    }

    let toSave = status.results;

    // Si se especificaron IDs, filtrar solo esos
    if (selectedIds && Array.isArray(selectedIds)) {
      toSave = toSave.filter((_, index) => selectedIds.includes(index));
    }

    let saved = 0;
    let skipped = 0;

    for (const item of toSave) {
      // Verificar si ya existe (por URL)
      const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [item.url]);
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const id = uuidv4();

      runExec(`
        INSERT INTO references_ads (id, title, description, type, url, thumbnail, brand, year, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        item.title,
        item.description || null,
        item.type || 'link',
        item.url,
        item.thumbnail || null,
        item.brand || null,
        item.year || null,
        item.source || null,
      ]);

      // Añadir tags
      if (item.tags && item.tags.length > 0) {
        for (const tagName of item.tags) {
          const tagResults = runQuery('SELECT id FROM tags WHERE name = ?', [tagName.toLowerCase()]);
          if (tagResults.length > 0) {
            runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [id, tagResults[0].id]);
          }
        }
      }

      saved++;
    }

    res.json({
      message: `Importación completada`,
      saved,
      skipped,
      total: toSave.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ RUTAS DE YOUTUBE / MARCAS ============

// Estado de configuración de YouTube
app.get('/api/youtube/status', (req, res) => {
  res.json({
    configured: isYouTubeConfigured(),
    message: isYouTubeConfigured()
      ? 'YouTube API configurada'
      : 'Configura YOUTUBE_API_KEY en las variables de entorno',
  });
});

// Configurar API key de YouTube
app.post('/api/youtube/configure', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ error: 'API key requerida' });
  }
  const success = initYouTube(apiKey);
  res.json({ success, message: success ? 'YouTube API configurada' : 'Error al configurar' });
});

// Obtener marcas predefinidas
app.get('/api/youtube/top-brands', (req, res) => {
  res.json(TOP_BRANDS);
});

// Listar marcas guardadas
app.get('/api/brands', (req, res) => {
  try {
    const brands = runQuery(`
      SELECT b.*, COUNT(yc.id) as channel_count
      FROM brands b
      LEFT JOIN youtube_channels yc ON b.id = yc.brand_id
      GROUP BY b.id
      ORDER BY b.name
    `);
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear marca
app.post('/api/brands', (req, res) => {
  try {
    const { name, logo, website } = req.body;
    const id = uuidv4();
    runExec('INSERT INTO brands (id, name, logo, website) VALUES (?, ?, ?, ?)', [id, name, logo, website]);
    res.status(201).json({ id, name, logo, website });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar marca
app.delete('/api/brands/:id', (req, res) => {
  try {
    runExec('DELETE FROM brands WHERE id = ?', [req.params.id]);
    res.json({ message: 'Marca eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar canales de YouTube
app.get('/api/youtube/search/channels', async (req, res) => {
  if (!isYouTubeConfigured()) {
    return res.status(400).json({ error: 'YouTube API no configurada' });
  }
  try {
    const { q, maxResults = 10 } = req.query;
    const channels = await searchChannels(q, parseInt(maxResults));
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Añadir canal a una marca
app.post('/api/brands/:brandId/channels', async (req, res) => {
  try {
    const { channelId, name, region } = req.body;
    const id = uuidv4();

    // Si YouTube está configurado, obtener info del canal
    let channelInfo = { name, region };
    if (isYouTubeConfigured()) {
      try {
        const info = await getChannelInfo(channelId);
        if (info) {
          channelInfo = {
            name: info.title,
            description: info.description,
            thumbnail: info.thumbnail,
            subscriber_count: info.subscriberCount,
            video_count: info.videoCount,
          };
        }
      } catch (e) {
        console.error('Error obteniendo info del canal:', e.message);
      }
    }

    runExec(`
      INSERT INTO youtube_channels (id, brand_id, channel_id, name, description, thumbnail, subscriber_count, video_count, region)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, req.params.brandId, channelId, channelInfo.name, channelInfo.description, channelInfo.thumbnail, channelInfo.subscriber_count, channelInfo.video_count, region]);

    res.status(201).json({ id, channelId, ...channelInfo });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'Este canal ya está añadido' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Listar canales de una marca
app.get('/api/brands/:brandId/channels', (req, res) => {
  try {
    const channels = runQuery(`
      SELECT * FROM youtube_channels WHERE brand_id = ? ORDER BY name
    `, [req.params.brandId]);
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar canal
app.delete('/api/channels/:id', (req, res) => {
  try {
    runExec('DELETE FROM youtube_channels WHERE id = ?', [req.params.id]);
    res.json({ message: 'Canal eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sincronizar videos de un canal
app.post('/api/channels/:id/sync', async (req, res) => {
  if (!isYouTubeConfigured()) {
    return res.status(400).json({ error: 'YouTube API no configurada' });
  }

  try {
    const channel = runQuery('SELECT * FROM youtube_channels WHERE id = ?', [req.params.id])[0];
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }

    const videos = await getChannelVideos(channel.channel_id, 50);

    let added = 0;
    let skipped = 0;

    for (const video of videos) {
      // Verificar si ya existe
      const existing = runQuery('SELECT id FROM youtube_videos WHERE video_id = ?', [video.id]);
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Obtener detalles del video
      let details = video;
      try {
        const fullDetails = await getVideoDetails(video.id);
        if (fullDetails) {
          details = { ...video, ...fullDetails };
        }
      } catch (e) {
        // Usar info básica si falla
      }

      const id = uuidv4();
      const isAd = isLikelyAd(details) ? 1 : 0;

      runExec(`
        INSERT INTO youtube_videos (id, channel_id, video_id, title, description, thumbnail, published_at, duration, view_count, like_count, is_ad)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        req.params.id,
        details.id,
        details.title,
        details.description?.substring(0, 1000),
        details.thumbnail,
        details.publishedAt,
        details.duration,
        details.viewCount || 0,
        details.likeCount || 0,
        isAd,
      ]);

      added++;
    }

    // Actualizar fecha de sincronización
    runExec('UPDATE youtube_channels SET last_sync = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);

    res.json({ added, skipped, total: videos.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener videos de un canal
app.get('/api/channels/:id/videos', (req, res) => {
  try {
    const { adsOnly } = req.query;
    let query = 'SELECT * FROM youtube_videos WHERE channel_id = ?';
    if (adsOnly === 'true') {
      query += ' AND is_ad = 1';
    }
    query += ' ORDER BY published_at DESC';

    const videos = runQuery(query, [req.params.id]);
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los videos (de todas las marcas)
app.get('/api/youtube/videos', (req, res) => {
  try {
    const { adsOnly, limit = 50 } = req.query;
    let query = `
      SELECT yv.*, yc.name as channel_name, b.name as brand_name
      FROM youtube_videos yv
      JOIN youtube_channels yc ON yv.channel_id = yc.id
      JOIN brands b ON yc.brand_id = b.id
    `;
    if (adsOnly === 'true') {
      query += ' WHERE yv.is_ad = 1';
    }
    query += ` ORDER BY yv.published_at DESC LIMIT ${parseInt(limit)}`;

    const videos = runQuery(query);
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar video como anuncio o no
app.patch('/api/youtube/videos/:id/is-ad', (req, res) => {
  try {
    const { isAd } = req.body;
    runExec('UPDATE youtube_videos SET is_ad = ? WHERE id = ?', [isAd ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Añadir video de YouTube a la biblioteca principal
app.post('/api/youtube/videos/:id/save-to-library', (req, res) => {
  try {
    const video = runQuery('SELECT yv.*, yc.name as channel_name, b.name as brand_name FROM youtube_videos yv JOIN youtube_channels yc ON yv.channel_id = yc.id JOIN brands b ON yc.brand_id = b.id WHERE yv.id = ?', [req.params.id])[0];

    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }

    // Verificar si ya existe en la biblioteca
    const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [`https://www.youtube.com/watch?v=${video.video_id}`]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Este video ya está en tu biblioteca' });
    }

    const id = uuidv4();
    runExec(`
      INSERT INTO references_ads (id, title, description, type, url, thumbnail, brand, source)
      VALUES (?, ?, ?, 'video', ?, ?, ?, 'youtube')
    `, [
      id,
      video.title,
      video.description?.substring(0, 500),
      `https://www.youtube.com/watch?v=${video.video_id}`,
      video.thumbnail,
      video.brand_name,
    ]);

    // Marcar como sincronizado
    runExec('UPDATE youtube_videos SET synced_to_library = 1 WHERE id = ?', [req.params.id]);

    res.json({ id, message: 'Video añadido a la biblioteca' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Añadir marca con canales predefinidos
app.post('/api/brands/add-top-brand', async (req, res) => {
  try {
    const { brandName } = req.body;
    const topBrand = TOP_BRANDS.find(b => b.name === brandName);

    if (!topBrand) {
      return res.status(404).json({ error: 'Marca no encontrada en la lista' });
    }

    // Crear marca
    const brandId = uuidv4();
    runExec('INSERT INTO brands (id, name) VALUES (?, ?)', [brandId, topBrand.name]);

    // Añadir canales
    for (const channel of topBrand.channels) {
      const channelDbId = uuidv4();

      let channelInfo = { name: channel.name };
      if (isYouTubeConfigured()) {
        try {
          const info = await getChannelInfo(channel.id);
          if (info) {
            channelInfo = {
              name: info.title,
              description: info.description,
              thumbnail: info.thumbnail,
              subscriber_count: info.subscriberCount,
              video_count: info.videoCount,
            };
          }
        } catch (e) {
          // Usar info básica
        }
      }

      runExec(`
        INSERT OR IGNORE INTO youtube_channels (id, brand_id, channel_id, name, description, thumbnail, subscriber_count, video_count, region)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [channelDbId, brandId, channel.id, channelInfo.name, channelInfo.description, channelInfo.thumbnail, channelInfo.subscriber_count, channelInfo.video_count, channel.region]);
    }

    res.status(201).json({ brandId, name: topBrand.name, channelsAdded: topBrand.channels.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Servir frontend en producción
app.use(express.static(join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  const indexPath = join(__dirname, '../client/dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend not built. Run npm run build in client folder.' });
  }
});

// Iniciar servidor
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Base de datos en ${dbPath}`);
  });
});
