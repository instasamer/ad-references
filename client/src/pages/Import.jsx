import { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, Check, AlertCircle, Loader2, ExternalLink, Save } from 'lucide-react';
import api from '../api';

export default function Import() {
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [options, setOptions] = useState({
    maxPages: 3,
    category: null,
    year: null,
  });
  const [importStatus, setImportStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedResults, setSelectedResults] = useState(new Set());
  const pollInterval = useRef(null);

  useEffect(() => {
    // Cargar fuentes disponibles
    fetch('/api/import/sources')
      .then((res) => res.json())
      .then(setSources)
      .catch(console.error);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  const handleStartImport = async () => {
    if (!selectedSource) return;

    setLoading(true);
    setImportStatus(null);

    try {
      const res = await fetch('/api/import/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: selectedSource.id,
          maxPages: options.maxPages,
          category: options.category,
          year: options.year,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      // Iniciar polling para obtener estado
      pollInterval.current = setInterval(async () => {
        const statusRes = await fetch(`/api/import/status/${data.importId}`);
        const status = await statusRes.json();
        setImportStatus(status);

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
          setLoading(false);

          // Seleccionar todos por defecto
          if (status.results) {
            setSelectedResults(new Set(status.results.map((_, i) => i)));
          }
        }
      }, 1000);
    } catch (error) {
      alert('Error: ' + error.message);
      setLoading(false);
    }
  };

  const handleSaveSelected = async () => {
    if (!importStatus || selectedResults.size === 0) return;

    setSaving(true);

    try {
      const res = await fetch('/api/import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importId: importStatus.id,
          selectedIds: Array.from(selectedResults),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      alert(`Guardadas ${data.saved} referencias (${data.skipped} ya existían)`);

      // Limpiar estado
      setImportStatus(null);
      setSelectedResults(new Set());
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleResult = (index) => {
    setSelectedResults((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (importStatus?.results) {
      if (selectedResults.size === importStatus.results.length) {
        setSelectedResults(new Set());
      } else {
        setSelectedResults(new Set(importStatus.results.map((_, i) => i)));
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Importar referencias</h1>
        <p className="text-gray-600">
          Importa referencias automáticamente desde las mejores fuentes de publicidad
        </p>
      </div>

      {/* Selección de fuente */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Selecciona una fuente</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => setSelectedSource(source)}
              disabled={loading}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedSource?.id === source.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{source.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{source.description}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Opciones de importación */}
      {selectedSource && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Configura la importación</h2>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Páginas a importar
              </label>
              <select
                value={options.maxPages}
                onChange={(e) => setOptions({ ...options, maxPages: parseInt(e.target.value) })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value={1}>1 página (~20 refs)</option>
                <option value={3}>3 páginas (~60 refs)</option>
                <option value={5}>5 páginas (~100 refs)</option>
                <option value={10}>10 páginas (~200 refs)</option>
              </select>
            </div>

            {selectedSource.categories?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría (opcional)
                </label>
                <select
                  value={options.category || ''}
                  onChange={(e) => setOptions({ ...options, category: e.target.value || null })}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Todas</option>
                  {selectedSource.categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedSource.years?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Año (opcional)
                </label>
                <select
                  value={options.year || ''}
                  onChange={(e) => setOptions({ ...options, year: e.target.value || null })}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Todos</option>
                  {selectedSource.years.slice(0, 20).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={handleStartImport}
            disabled={loading}
            className="mt-6 flex items-center gap-2 px-6 py-2 gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Iniciar importación
              </>
            )}
          </button>
        </div>
      )}

      {/* Estado de importación */}
      {importStatus && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {importStatus.status === 'completed' ? '3. Selecciona qué guardar' : 'Progreso'}
            </h2>
            <div className="flex items-center gap-2">
              {importStatus.status === 'running' && (
                <span className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  En progreso
                </span>
              )}
              {importStatus.status === 'completed' && (
                <span className="flex items-center gap-2 text-green-600">
                  <Check className="w-4 h-4" />
                  Completado
                </span>
              )}
              {importStatus.status === 'failed' && (
                <span className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  Error
                </span>
              )}
            </div>
          </div>

          {/* Log de progreso */}
          {importStatus.progress?.length > 0 && (
            <div className="mb-4 max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3 text-sm font-mono">
              {importStatus.progress.slice(-5).map((p, i) => (
                <div
                  key={i}
                  className={`${
                    p.status === 'error' ? 'text-red-600' :
                    p.status === 'warning' ? 'text-amber-600' :
                    p.status === 'complete' ? 'text-green-600' :
                    'text-gray-600'
                  }`}
                >
                  {p.message}
                </div>
              ))}
            </div>
          )}

          {/* Resultados */}
          {importStatus.status === 'completed' && importStatus.results?.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={toggleAll}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {selectedResults.size === importStatus.results.length
                    ? 'Deseleccionar todo'
                    : 'Seleccionar todo'}
                </button>
                <span className="text-sm text-gray-500">
                  {selectedResults.size} de {importStatus.results.length} seleccionadas
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
                {importStatus.results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedResults.has(index) ? 'bg-primary-50' : ''
                    }`}
                    onClick={() => toggleResult(index)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedResults.has(index)}
                      onChange={() => {}}
                      className="w-4 h-4 text-primary-600 rounded"
                    />

                    {result.thumbnail && (
                      <img
                        src={result.thumbnail}
                        alt=""
                        className="w-16 h-10 object-cover rounded bg-gray-100"
                        onError={(e) => (e.target.style.display = 'none')}
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {result.title}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {[result.brand, result.year].filter(Boolean).join(' · ')}
                      </div>
                    </div>

                    {result.tags?.length > 0 && (
                      <div className="flex gap-1">
                        {result.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveSelected}
                disabled={saving || selectedResults.size === 0}
                className="mt-4 flex items-center gap-2 px-6 py-2 gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Guardar {selectedResults.size} seleccionadas
                  </>
                )}
              </button>
            </>
          )}

          {importStatus.status === 'completed' && importStatus.results?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron referencias. Prueba con otra configuración.
            </div>
          )}

          {importStatus.error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              Error: {importStatus.error}
            </div>
          )}
        </div>
      )}

      {/* Información */}
      <div className="bg-gray-50 rounded-xl p-6 text-sm text-gray-600">
        <h3 className="font-semibold text-gray-900 mb-2">Sobre la importación</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Las referencias se extraen automáticamente de sitios públicos de publicidad</li>
          <li>Puedes filtrar por categoría y año antes de importar</li>
          <li>Las referencias duplicadas (mismo URL) se ignoran automáticamente</li>
          <li>Los tags se asignan automáticamente según la categoría del anuncio</li>
        </ul>
      </div>
    </div>
  );
}
