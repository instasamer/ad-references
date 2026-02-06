import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Play, Check, AlertCircle, Loader2, Youtube, Trash2, ExternalLink, Save, ChevronDown, ChevronRight } from 'lucide-react';

export default function Brands() {
  const [youtubeStatus, setYoutubeStatus] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [brands, setBrands] = useState([]);
  const [topBrands, setTopBrands] = useState([]);
  const [expandedBrand, setExpandedBrand] = useState(null);
  const [channels, setChannels] = useState({});
  const [videos, setVideos] = useState({});
  const [loading, setLoading] = useState({});
  const [syncing, setSyncing] = useState({});

  useEffect(() => {
    loadYoutubeStatus();
    loadBrands();
    loadTopBrands();
  }, []);

  const loadYoutubeStatus = async () => {
    const res = await fetch('/api/youtube/status');
    const data = await res.json();
    setYoutubeStatus(data);
  };

  const loadBrands = async () => {
    const res = await fetch('/api/brands');
    const data = await res.json();
    setBrands(data);
  };

  const loadTopBrands = async () => {
    const res = await fetch('/api/youtube/top-brands');
    const data = await res.json();
    setTopBrands(data);
  };

  const configureYoutube = async () => {
    if (!apiKey.trim()) return;
    const res = await fetch('/api/youtube/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    const data = await res.json();
    if (data.success) {
      setYoutubeStatus({ configured: true });
      setApiKey('');
    } else {
      alert('Error al configurar: ' + data.message);
    }
  };

  const addTopBrand = async (brandName) => {
    setLoading(prev => ({ ...prev, [brandName]: true }));
    try {
      const res = await fetch('/api/brands/add-top-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName }),
      });
      const data = await res.json();
      if (res.ok) {
        loadBrands();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, [brandName]: false }));
    }
  };

  const deleteBrand = async (brandId) => {
    if (!confirm('¿Eliminar esta marca y todos sus canales?')) return;
    await fetch(`/api/brands/${brandId}`, { method: 'DELETE' });
    loadBrands();
  };

  const loadChannels = async (brandId) => {
    const res = await fetch(`/api/brands/${brandId}/channels`);
    const data = await res.json();
    setChannels(prev => ({ ...prev, [brandId]: data }));
  };

  const syncChannel = async (channelId) => {
    setSyncing(prev => ({ ...prev, [channelId]: true }));
    try {
      const res = await fetch(`/api/channels/${channelId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Sincronizado: ${data.added} nuevos, ${data.skipped} ya existían`);
        loadVideos(channelId);
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setSyncing(prev => ({ ...prev, [channelId]: false }));
    }
  };

  const loadVideos = async (channelId) => {
    const res = await fetch(`/api/channels/${channelId}/videos`);
    const data = await res.json();
    setVideos(prev => ({ ...prev, [channelId]: data }));
  };

  const toggleBrand = async (brandId) => {
    if (expandedBrand === brandId) {
      setExpandedBrand(null);
    } else {
      setExpandedBrand(brandId);
      if (!channels[brandId]) {
        await loadChannels(brandId);
      }
    }
  };

  const toggleAdStatus = async (videoId, isAd) => {
    await fetch(`/api/youtube/videos/${videoId}/is-ad`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAd }),
    });
    // Actualizar localmente
    setVideos(prev => {
      const updated = { ...prev };
      for (const channelId in updated) {
        updated[channelId] = updated[channelId].map(v =>
          v.id === videoId ? { ...v, is_ad: isAd ? 1 : 0 } : v
        );
      }
      return updated;
    });
  };

  const saveToLibrary = async (videoId) => {
    const res = await fetch(`/api/youtube/videos/${videoId}/save-to-library`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      alert('Video añadido a tu biblioteca');
    } else {
      alert(data.error);
    }
  };

  const addedBrandNames = brands.map(b => b.name);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Marcas y YouTube</h1>
        <p className="text-gray-600">
          Sigue las marcas más importantes y descubre sus últimos anuncios
        </p>
      </div>

      {/* YouTube Status */}
      <div className={`p-4 rounded-xl border ${youtubeStatus?.configured ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <Youtube className={`w-6 h-6 ${youtubeStatus?.configured ? 'text-green-600' : 'text-amber-600'}`} />
          <div className="flex-1">
            <p className={`font-medium ${youtubeStatus?.configured ? 'text-green-800' : 'text-amber-800'}`}>
              {youtubeStatus?.configured ? 'YouTube API conectada' : 'YouTube API no configurada'}
            </p>
            {!youtubeStatus?.configured && (
              <p className="text-sm text-amber-700 mt-1">
                Necesitas una API key de Google Cloud para sincronizar videos
              </p>
            )}
          </div>
          {!youtubeStatus?.configured && (
            <div className="flex gap-2">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="YouTube API Key"
                className="px-3 py-1 text-sm border border-amber-300 rounded-lg"
              />
              <button
                onClick={configureYoutube}
                className="px-3 py-1 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
              >
                Conectar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Brands to Add */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Añadir marcas top</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {topBrands.map((brand) => {
            const isAdded = addedBrandNames.includes(brand.name);
            const isLoading = loading[brand.name];
            return (
              <button
                key={brand.name}
                onClick={() => !isAdded && !isLoading && addTopBrand(brand.name)}
                disabled={isAdded || isLoading}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  isAdded
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                } ${isLoading ? 'opacity-50' : ''}`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : isAdded ? (
                  <Check className="w-5 h-5 mx-auto text-green-600" />
                ) : (
                  <Plus className="w-5 h-5 mx-auto text-gray-400" />
                )}
                <div className="font-medium mt-1 text-sm">{brand.name}</div>
                <div className="text-xs text-gray-500">{brand.channels.length} canales</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* My Brands */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mis marcas ({brands.length})</h2>
        </div>

        {brands.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No has añadido ninguna marca todavía.</p>
            <p className="text-sm mt-1">Selecciona alguna de las marcas top de arriba para empezar.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {brands.map((brand) => (
              <div key={brand.id}>
                {/* Brand Header */}
                <div
                  onClick={() => toggleBrand(brand.id)}
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50"
                >
                  {expandedBrand === brand.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{brand.name}</h3>
                    <p className="text-sm text-gray-500">{brand.channel_count || 0} canales</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBrand(brand.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Channels */}
                {expandedBrand === brand.id && (
                  <div className="bg-gray-50 border-t border-gray-200">
                    {channels[brand.id]?.map((channel) => (
                      <div key={channel.id} className="border-b border-gray-200 last:border-b-0">
                        {/* Channel Header */}
                        <div className="flex items-center gap-3 p-4">
                          {channel.thumbnail && (
                            <img src={channel.thumbnail} alt="" className="w-10 h-10 rounded-full" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{channel.name}</h4>
                            <p className="text-sm text-gray-500">
                              {channel.subscriber_count?.toLocaleString() || '?'} subs · {channel.video_count || '?'} videos
                              {channel.last_sync && ` · Sync: ${new Date(channel.last_sync).toLocaleDateString()}`}
                            </p>
                          </div>
                          <a
                            href={`https://youtube.com/channel/${channel.channel_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-gray-600"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => syncChannel(channel.id)}
                            disabled={syncing[channel.id] || !youtubeStatus?.configured}
                            className="flex items-center gap-1 px-3 py-1 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                          >
                            {syncing[channel.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                            Sync
                          </button>
                          <button
                            onClick={() => loadVideos(channel.id)}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-white"
                          >
                            Ver videos
                          </button>
                        </div>

                        {/* Videos */}
                        {videos[channel.id] && (
                          <div className="px-4 pb-4">
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {videos[channel.id].slice(0, 12).map((video) => (
                                <div
                                  key={video.id}
                                  className={`bg-white rounded-lg border overflow-hidden ${
                                    video.is_ad ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200'
                                  }`}
                                >
                                  <div className="relative aspect-video bg-gray-100">
                                    {video.thumbnail && (
                                      <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                                    )}
                                    <a
                                      href={`https://youtube.com/watch?v=${video.video_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                                    >
                                      <Play className="w-12 h-12 text-white" fill="white" />
                                    </a>
                                    {video.is_ad === 1 && (
                                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded">
                                        AD
                                      </span>
                                    )}
                                  </div>
                                  <div className="p-2">
                                    <h5 className="text-sm font-medium text-gray-900 line-clamp-2" title={video.title}>
                                      {video.title}
                                    </h5>
                                    <div className="flex items-center gap-2 mt-2">
                                      <button
                                        onClick={() => toggleAdStatus(video.id, !video.is_ad)}
                                        className={`flex-1 text-xs px-2 py-1 rounded ${
                                          video.is_ad
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                                        }`}
                                      >
                                        {video.is_ad ? 'Es anuncio' : 'Marcar como AD'}
                                      </button>
                                      <button
                                        onClick={() => saveToLibrary(video.id)}
                                        disabled={video.synced_to_library}
                                        className="p-1 text-gray-400 hover:text-primary-600 disabled:opacity-50"
                                        title="Guardar en biblioteca"
                                      >
                                        <Save className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {videos[channel.id].length > 12 && (
                              <p className="text-center text-sm text-gray-500 mt-3">
                                Y {videos[channel.id].length - 12} videos más...
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 rounded-xl p-6 text-sm text-blue-800">
        <h3 className="font-semibold mb-2">Cómo obtener una API Key de YouTube</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Ve a <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
          <li>Crea un proyecto nuevo (o usa uno existente)</li>
          <li>Habilita "YouTube Data API v3"</li>
          <li>Ve a "Credenciales" y crea una API Key</li>
          <li>Copia la key y pégala arriba</li>
        </ol>
        <p className="mt-3 text-blue-700">
          La API gratuita permite ~10,000 peticiones/día, suficiente para uso personal.
        </p>
      </div>
    </div>
  );
}
