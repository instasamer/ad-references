/**
 * Sincronizar videos de marcas top automáticamente
 * Usa la YouTube API para obtener videos de canales oficiales
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../database.sqlite');

// API Key de YouTube
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY) {
  console.error('Error: YOUTUBE_API_KEY no configurada');
  process.exit(1);
}

const youtube = google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY });

// Marcas top con sus canales de YouTube
const TOP_BRANDS = [
  {
    name: 'Nike',
    channels: [
      { id: 'UCDlY2srEVF7i0fLxMNqefpQ', name: 'Nike', region: 'Global' },
      { id: 'UC7McptyU7pPD_HRJMxzTyQQ', name: 'Nike Football', region: 'Global' },
    ]
  },
  {
    name: 'Apple',
    channels: [
      { id: 'UCE_M8A5yxnLfW0KghEeajjw', name: 'Apple', region: 'Global' },
    ]
  },
  {
    name: 'Coca-Cola',
    channels: [
      { id: 'UCfX9prz9A0b7j3mB6VH2LNg', name: 'Coca-Cola', region: 'Global' },
    ]
  },
  {
    name: 'Samsung',
    channels: [
      { id: 'UCWwgaK7x0_FR1goeSRazfsQ', name: 'Samsung', region: 'Global' },
    ]
  },
  {
    name: 'Google',
    channels: [
      { id: 'UCK8sQmJBp8GCxrOtXWBpyEA', name: 'Google', region: 'Global' },
    ]
  },
  {
    name: 'Amazon',
    channels: [
      { id: 'UCiqp4J8aQcKYVhWtbvgVPyw', name: 'Amazon', region: 'Global' },
    ]
  },
  {
    name: 'Mercedes-Benz',
    channels: [
      { id: 'UCG1sZ4jhGqjpZZN85phCqPg', name: 'Mercedes-Benz', region: 'Global' },
    ]
  },
  {
    name: 'BMW',
    channels: [
      { id: 'UC0hREHMQJ4bHqkq4RfSuMYQ', name: 'BMW', region: 'Global' },
    ]
  },
  {
    name: 'Adidas',
    channels: [
      { id: 'UCTgc1e3PaBvPNAh-7m3pXJQ', name: 'Adidas', region: 'Global' },
      { id: 'UCSmhXtp9IVWfSfioYAi3dCw', name: 'Adidas Football', region: 'Global' },
    ]
  },
  {
    name: 'McDonald\'s',
    channels: [
      { id: 'UCRI5ZedBs0_BYY4PlxD6m7w', name: 'McDonald\'s', region: 'Global' },
    ]
  },
  {
    name: 'Pepsi',
    channels: [
      { id: 'UChs0pSaEoNLV4mevBFGaoKA', name: 'Pepsi', region: 'Global' },
    ]
  },
  {
    name: 'Audi',
    channels: [
      { id: 'UCO5A6gCN0V4hoLTm5P8b7Ig', name: 'Audi', region: 'Global' },
    ]
  },
  {
    name: 'Volkswagen',
    channels: [
      { id: 'UCJxMw5AkBM6r3C6eZP4xqmQ', name: 'Volkswagen', region: 'Global' },
    ]
  },
  {
    name: 'Toyota',
    channels: [
      { id: 'UChEvTiZqX2xEIruTlJNbKzw', name: 'Toyota USA', region: 'USA' },
    ]
  },
  {
    name: 'Budweiser',
    channels: [
      { id: 'UC2ZqHEfvfqhCeCwuGpB9TmA', name: 'Budweiser', region: 'Global' },
    ]
  },
];

// Palabras clave que indican que un video es un anuncio
const AD_KEYWORDS = [
  'commercial', 'ad', 'advert', 'spot', 'campaign', 'film',
  'super bowl', 'superbowl', 'world cup', 'olympics',
  'introducing', 'meet the', 'the new', 'all-new',
  'ft.', 'feat.', 'featuring', 'starring',
  'official', 'trailer', 'launch', 'reveal',
];

function isLikelyAd(video) {
  const title = (video.title || '').toLowerCase();
  const description = (video.description || '').toLowerCase();
  const text = title + ' ' + description;

  // Videos muy cortos (menos de 2 min) probablemente son ads
  if (video.duration) {
    const match = video.duration.match(/PT(\d+)M?(\d*)S?/);
    if (match) {
      const minutes = parseInt(match[1]) || 0;
      const seconds = parseInt(match[2]) || 0;
      const totalSeconds = minutes * 60 + seconds;
      if (totalSeconds > 15 && totalSeconds < 180) {
        return true;
      }
    }
  }

  // Buscar keywords
  for (const kw of AD_KEYWORDS) {
    if (text.includes(kw)) return true;
  }

  return false;
}

let db;
let totalAdded = 0;

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    console.log('Error: Base de datos no encontrada.');
    process.exit(1);
  }
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function runQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function runExec(sql, params = []) {
  db.run(sql, params);
}

async function getChannelVideos(channelId, maxResults = 50) {
  try {
    // Obtener uploads playlist
    const channelRes = await youtube.channels.list({
      part: 'contentDetails',
      id: channelId,
    });

    if (!channelRes.data.items?.length) return [];

    const uploadsPlaylistId = channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;

    // Obtener videos de la playlist
    const playlistRes = await youtube.playlistItems.list({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: maxResults,
    });

    const videoIds = playlistRes.data.items.map(item => item.snippet.resourceId.videoId);

    // Obtener detalles de los videos
    const videosRes = await youtube.videos.list({
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(','),
    });

    return videosRes.data.items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
      duration: item.contentDetails.duration,
      viewCount: parseInt(item.statistics.viewCount) || 0,
      likeCount: parseInt(item.statistics.likeCount) || 0,
    }));
  } catch (error) {
    console.log(`    Error: ${error.message}`);
    return [];
  }
}

async function syncBrand(brand) {
  console.log(`\n📦 ${brand.name}`);

  let brandAdded = 0;

  for (const channel of brand.channels) {
    process.stdout.write(`   Canal: ${channel.name}... `);

    const videos = await getChannelVideos(channel.id, 50);

    let channelAdded = 0;
    for (const video of videos) {
      // Solo guardar si parece un anuncio
      if (!isLikelyAd(video)) continue;

      const url = `https://www.youtube.com/watch?v=${video.id}`;

      // Verificar si ya existe
      const existing = runQuery('SELECT id FROM references_ads WHERE url = ?', [url]);
      if (existing.length > 0) continue;

      const id = uuidv4();

      runExec(`
        INSERT INTO references_ads (id, title, description, type, url, thumbnail, brand, source)
        VALUES (?, ?, ?, 'video', ?, ?, ?, 'youtube-sync')
      `, [id, video.title, video.description?.substring(0, 500), url, video.thumbnail, brand.name]);

      // Añadir tags según la marca
      const brandTags = {
        'Nike': ['deportes', 'inspirador'],
        'Adidas': ['deportes', 'juvenil'],
        'Apple': ['tecnologia', 'minimalista'],
        'Samsung': ['tecnologia'],
        'Google': ['tecnologia', 'emocional'],
        'Amazon': ['tecnologia'],
        'Coca-Cola': ['alimentacion', 'emocional'],
        'Pepsi': ['alimentacion', 'juvenil'],
        'McDonald\'s': ['alimentacion', 'humor'],
        'Mercedes-Benz': ['automocion', 'lujoso'],
        'BMW': ['automocion', 'lujoso'],
        'Audi': ['automocion', 'lujoso'],
        'Volkswagen': ['automocion', 'emocional'],
        'Toyota': ['automocion'],
        'Budweiser': ['alimentacion', 'emocional'],
      };

      const tags = brandTags[brand.name] || [];
      tags.push('spot-tv');

      for (const tagName of [...new Set(tags)]) {
        const tagResult = runQuery('SELECT id FROM tags WHERE name = ?', [tagName]);
        if (tagResult.length > 0) {
          runExec('INSERT OR IGNORE INTO reference_tags (reference_id, tag_id) VALUES (?, ?)', [id, tagResult[0].id]);
        }
      }

      channelAdded++;
      totalAdded++;
    }

    console.log(`${channelAdded} anuncios nuevos`);
    brandAdded += channelAdded;

    // Pausa entre canales para no exceder rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  saveDb();
  return brandAdded;
}

async function main() {
  console.log('═'.repeat(50));
  console.log('  SINCRONIZACIÓN DE MARCAS TOP - YouTube');
  console.log('═'.repeat(50));

  await initDb();

  const before = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;
  console.log(`\nReferencias actuales: ${before}`);
  console.log(`Marcas a sincronizar: ${TOP_BRANDS.length}`);

  for (const brand of TOP_BRANDS) {
    await syncBrand(brand);
  }

  saveDb();

  const after = runQuery('SELECT COUNT(*) as count FROM references_ads')[0].count;

  console.log('\n' + '═'.repeat(50));
  console.log('  SINCRONIZACIÓN COMPLETADA');
  console.log('═'.repeat(50));
  console.log(`  Nuevos añadidos: ${totalAdded}`);
  console.log(`  Total en BD: ${after}`);
  console.log('═'.repeat(50));
}

main().catch(err => {
  console.error('Error:', err);
  if (db) saveDb();
  process.exit(1);
});
