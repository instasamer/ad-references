import { google } from 'googleapis';

// Inicializar cliente de YouTube
let youtube = null;

export function initYouTube(apiKey) {
  if (!apiKey) {
    console.warn('YouTube API key no configurada');
    return false;
  }
  youtube = google.youtube({
    version: 'v3',
    auth: apiKey,
  });
  return true;
}

export function isYouTubeConfigured() {
  return youtube !== null;
}

// Buscar canales por nombre de marca
export async function searchChannels(query, maxResults = 10) {
  if (!youtube) throw new Error('YouTube API no configurada');

  const response = await youtube.search.list({
    part: 'snippet',
    q: query,
    type: 'channel',
    maxResults,
  });

  return response.data.items.map(item => ({
    id: item.id.channelId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    publishedAt: item.snippet.publishedAt,
  }));
}

// Obtener información detallada de un canal
export async function getChannelInfo(channelId) {
  if (!youtube) throw new Error('YouTube API no configurada');

  const response = await youtube.channels.list({
    part: 'snippet,statistics,brandingSettings',
    id: channelId,
  });

  if (!response.data.items?.length) {
    return null;
  }

  const channel = response.data.items[0];
  return {
    id: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    customUrl: channel.snippet.customUrl,
    thumbnail: channel.snippet.thumbnails.medium?.url,
    banner: channel.brandingSettings?.image?.bannerExternalUrl,
    subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
    videoCount: parseInt(channel.statistics.videoCount) || 0,
    viewCount: parseInt(channel.statistics.viewCount) || 0,
    country: channel.snippet.country,
    publishedAt: channel.snippet.publishedAt,
  };
}

// Obtener videos recientes de un canal
export async function getChannelVideos(channelId, maxResults = 20) {
  if (!youtube) throw new Error('YouTube API no configurada');

  // Primero obtener el upload playlist del canal
  const channelResponse = await youtube.channels.list({
    part: 'contentDetails',
    id: channelId,
  });

  if (!channelResponse.data.items?.length) {
    return [];
  }

  const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

  // Obtener videos del playlist
  const playlistResponse = await youtube.playlistItems.list({
    part: 'snippet,contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults,
  });

  return playlistResponse.data.items.map(item => ({
    id: item.contentDetails.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.maxres?.url ||
               item.snippet.thumbnails.high?.url ||
               item.snippet.thumbnails.medium?.url,
    publishedAt: item.snippet.publishedAt,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
  }));
}

// Obtener detalles de un video específico
export async function getVideoDetails(videoId) {
  if (!youtube) throw new Error('YouTube API no configurada');

  const response = await youtube.videos.list({
    part: 'snippet,statistics,contentDetails',
    id: videoId,
  });

  if (!response.data.items?.length) {
    return null;
  }

  const video = response.data.items[0];
  return {
    id: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    thumbnail: video.snippet.thumbnails.maxres?.url ||
               video.snippet.thumbnails.high?.url,
    publishedAt: video.snippet.publishedAt,
    channelId: video.snippet.channelId,
    channelTitle: video.snippet.channelTitle,
    duration: video.contentDetails.duration,
    viewCount: parseInt(video.statistics.viewCount) || 0,
    likeCount: parseInt(video.statistics.likeCount) || 0,
    commentCount: parseInt(video.statistics.commentCount) || 0,
    tags: video.snippet.tags || [],
    categoryId: video.snippet.categoryId,
    url: `https://www.youtube.com/watch?v=${video.id}`,
  };
}

// Buscar videos por query
export async function searchVideos(query, options = {}) {
  if (!youtube) throw new Error('YouTube API no configurada');

  const { maxResults = 20, publishedAfter, channelId } = options;

  const params = {
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults,
    order: 'relevance',
    videoDuration: 'any',
  };

  if (publishedAfter) {
    params.publishedAfter = publishedAfter;
  }

  if (channelId) {
    params.channelId = channelId;
  }

  const response = await youtube.search.list(params);

  return response.data.items.map(item => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
    publishedAt: item.snippet.publishedAt,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
}

// Lista de marcas top con sus canales conocidos de YouTube
export const TOP_BRANDS = [
  {
    name: 'Nike',
    channels: [
      { id: 'UCKiU2zFg0sYWm1u2koLBwCQ', name: 'Nike', region: 'Global' },
      { id: 'UC9-y-6csu5WGm29I7JiwpnA', name: 'Nike Football', region: 'Global' },
      { id: 'UCiRvSq-YXbwXQAhx7QjpZQA', name: 'Nike Running', region: 'Global' },
    ],
  },
  {
    name: 'Coca-Cola',
    channels: [
      { id: 'UCPlNyoFOxmC0e_9lVIlH9Kg', name: 'Coca-Cola', region: 'Global' },
    ],
  },
  {
    name: 'Apple',
    channels: [
      { id: 'UCE_M8A5yxnLfW0KghEeajjw', name: 'Apple', region: 'Global' },
    ],
  },
  {
    name: 'McDonald\'s',
    channels: [
      { id: 'UCRI1iaLmVbXzJHLZSI4mc_A', name: 'McDonald\'s', region: 'Global' },
    ],
  },
  {
    name: 'Samsung',
    channels: [
      { id: 'UCWwgaK7x0_FR1goeSRazfsQ', name: 'Samsung', region: 'Global' },
    ],
  },
  {
    name: 'Google',
    channels: [
      { id: 'UCK8sQmJBp8GCxrOtXWBpyEA', name: 'Google', region: 'Global' },
    ],
  },
  {
    name: 'Amazon',
    channels: [
      { id: 'UC2HS_6m6yDvECmFYMEzVkjA', name: 'Amazon', region: 'Global' },
    ],
  },
  {
    name: 'Mercedes-Benz',
    channels: [
      { id: 'UCl9hMiCxQqdUKCa0PhJR54w', name: 'Mercedes-Benz', region: 'Global' },
    ],
  },
  {
    name: 'BMW',
    channels: [
      { id: 'UC_G2HqXWVMzK8N1gIXqoZSg', name: 'BMW', region: 'Global' },
    ],
  },
  {
    name: 'Adidas',
    channels: [
      { id: 'UC14UlmYlSNiQCBe9Eookf_A', name: 'adidas', region: 'Global' },
      { id: 'UCNe7ASF2b8SWTuCvY6r8OmQ', name: 'adidas Football', region: 'Global' },
    ],
  },
];

// Mapeo de categorías de YouTube a nuestros tags
export const YOUTUBE_CATEGORY_MAP = {
  // Ads suelen estar en estas categorías
  '1': 'entretenimiento', // Film & Animation
  '2': 'automocion', // Autos & Vehicles
  '10': 'entretenimiento', // Music
  '17': 'deportes', // Sports
  '19': 'viajes', // Travel & Events
  '20': 'entretenimiento', // Gaming
  '22': 'entretenimiento', // People & Blogs
  '23': 'entretenimiento', // Comedy
  '24': 'entretenimiento', // Entertainment
  '25': 'educacion', // News & Politics
  '26': 'moda', // Howto & Style
  '28': 'tecnologia', // Science & Technology
};

// Detectar si un video es probablemente un anuncio
export function isLikelyAd(video) {
  const title = video.title.toLowerCase();
  const description = (video.description || '').toLowerCase();

  const adKeywords = [
    'commercial', 'ad', 'advertisement', 'spot', 'campaign',
    'anuncio', 'comercial', 'campaña', 'publicidad',
    'super bowl', 'superbowl', 'halftime',
    'launch', 'lanzamiento', 'introducing', 'presentamos',
    'new', 'nuevo', 'the new', 'el nuevo',
  ];

  const nonAdKeywords = [
    'behind the scenes', 'making of', 'tutorial', 'how to',
    'unboxing', 'review', 'reaction', 'interview',
  ];

  // Excluir si tiene keywords de no-anuncio
  for (const keyword of nonAdKeywords) {
    if (title.includes(keyword) || description.includes(keyword)) {
      return false;
    }
  }

  // Incluir si tiene keywords de anuncio
  for (const keyword of adKeywords) {
    if (title.includes(keyword) || description.includes(keyword)) {
      return true;
    }
  }

  // Por defecto, incluir videos cortos de marcas (< 5 min suelen ser ads)
  // La duración viene en formato ISO 8601 (PT1M30S = 1:30)
  if (video.duration) {
    const match = video.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1]) || 0;
      const minutes = parseInt(match[2]) || 0;
      if (hours === 0 && minutes < 5) {
        return true;
      }
    }
  }

  return false;
}
