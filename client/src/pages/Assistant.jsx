import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, AlertCircle, ExternalLink, Settings } from 'lucide-react';
import api from '../api';

export default function Assistant() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    api.getAiStatus().then(setAiStatus).catch(console.error);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResults(null);

    try {
      const response = await api.aiSearch(query);
      setResults(response);
    } catch (error) {
      console.error(error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureApi = async (e) => {
    e.preventDefault();
    try {
      await api.configureAi(apiKey);
      setAiStatus({ configured: true });
      setShowConfig(false);
      setApiKey('');
    } catch (error) {
      alert('Error configurando API: ' + error.message);
    }
  };

  const exampleQueries = [
    "Algo emotivo de coches para el día del padre",
    "Anuncios divertidos de comida rápida",
    "Campañas minimalistas de tecnología tipo Apple",
    "Referencias retro de los 80s para una marca de moda",
    "Spots de Nike o Adidas con atletas famosos",
    "Anuncios de Navidad que hagan llorar"
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Asistente Inteligente
        </h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          Describe lo que buscas en lenguaje natural y encontraré las mejores referencias para ti.
        </p>
      </div>

      {/* Status Banner */}
      {aiStatus && !aiStatus.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-800 font-medium">Modo básico activo</p>
            <p className="text-amber-700 text-sm">
              Configura tu API key de Anthropic para búsquedas inteligentes con IA.
              Sin API, las búsquedas son por keywords simples.
            </p>
            <button
              onClick={() => setShowConfig(true)}
              className="mt-2 text-sm text-amber-800 font-medium hover:underline inline-flex items-center gap-1"
            >
              <Settings className="w-4 h-4" />
              Configurar API
            </button>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Configurar Claude AI</h3>
            <form onSubmit={handleConfigureApi}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key de Anthropic
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Consigue tu API key en{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                    console.anthropic.com
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe lo que buscas... ej: 'anuncios emotivos de coches'"
            className="w-full px-6 py-4 pr-14 text-lg border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {/* Example Queries */}
      {!results && !loading && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-medium">Prueba con:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(example);
                  inputRef.current?.focus();
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-purple-100 hover:text-purple-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Interpretation */}
          {results.interpretation && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-purple-900 font-medium">Entendido:</p>
                  <p className="text-purple-800">{results.interpretation}</p>
                  {results.filters && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {results.filters.tags?.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                      {results.filters.brands?.map((brand, i) => (
                        <span key={i} className="px-2 py-0.5 bg-pink-200 text-pink-800 rounded text-xs">
                          {brand}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mode indicator */}
          {results.mode === 'basic' && (
            <p className="text-sm text-gray-500 italic">{results.message}</p>
          )}

          {/* Error */}
          {results.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              Error: {results.error}
            </div>
          )}

          {/* Count */}
          {results.results && (
            <p className="text-gray-600">
              {results.count || results.results.length} referencias encontradas
            </p>
          )}

          {/* Results Grid */}
          {results.results && results.results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {results.results.map((ref) => (
                <a
                  key={ref.id}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:border-purple-400 transition-colors"
                >
                  {ref.thumbnail ? (
                    <img
                      src={ref.thumbnail}
                      alt={ref.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-gray-200 ${ref.thumbnail ? 'hidden' : ''}`}
                  >
                    <span className="text-4xl">
                      {ref.type === 'video' ? '🎬' : ref.type === 'image' ? '🖼️' : '🔗'}
                    </span>
                  </div>

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-white text-sm font-medium line-clamp-2">{ref.title}</p>
                    {ref.brand && (
                      <p className="text-white/70 text-xs">{ref.brand}</p>
                    )}
                    <ExternalLink className="absolute top-2 right-2 w-4 h-4 text-white" />
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* No results */}
          {results.results && results.results.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-gray-600">No encontré referencias que coincidan.</p>
              <p className="text-gray-500 text-sm mt-1">Intenta con otra descripción.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
