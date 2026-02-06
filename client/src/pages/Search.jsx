import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, ChevronRight, ChevronLeft, RotateCcw, Image, Video, Link as LinkIcon } from 'lucide-react';
import api from '../api';

const STEPS = [
  {
    key: 'sector',
    question: '¿De qué sector es el proyecto?',
    description: 'Selecciona el sector o industria principal',
    category: 'sector',
  },
  {
    key: 'tono',
    question: '¿Qué tono buscas?',
    description: 'El estilo emocional o comunicativo de la pieza',
    category: 'tono',
  },
  {
    key: 'formato',
    question: '¿Qué formato necesitas?',
    description: 'El tipo de pieza publicitaria',
    category: 'formato',
  },
  {
    key: 'epoca',
    question: '¿De qué época?',
    description: 'Vintage, retro o actual',
    category: 'epoca',
  },
  {
    key: 'tecnica',
    question: '¿Qué técnica te interesa?',
    description: 'El estilo visual o de producción',
    category: 'tecnica',
  },
  {
    key: 'objetivo',
    question: '¿Cuál es el objetivo?',
    description: 'La meta principal de la campaña',
    category: 'objetivo',
  },
];

export default function Search() {
  const [tags, setTags] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState({});
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    api.getTags().then(setTags).catch(console.error);
  }, []);

  const currentStepData = STEPS[currentStep];
  const currentTags = tags[currentStepData?.category] || [];

  const handleTagSelect = (tagName) => {
    setSelections(prev => {
      const current = prev[currentStepData.key] || [];
      if (current.includes(tagName)) {
        return { ...prev, [currentStepData.key]: current.filter(t => t !== tagName) };
      }
      return { ...prev, [currentStepData.key]: [...current, tagName] };
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const query = {
        ...Object.fromEntries(
          Object.entries(selections).map(([k, v]) => [k, v.length > 0 ? v : null])
        ),
        keywords: keywords || null,
      };
      const data = await api.search(query);
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Error en búsqueda:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelections({});
    setKeywords('');
    setCurrentStep(0);
    setResults(null);
    setShowResults(false);
  };

  const totalSelections = Object.values(selections).flat().length;

  if (showResults && results) {
    return (
      <div className="space-y-6">
        {/* Results Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Resultados de búsqueda
            </h1>
            <p className="text-gray-600">
              {results.count} referencia{results.count !== 1 ? 's' : ''} encontrada{results.count !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Nueva búsqueda
          </button>
        </div>

        {/* Selected filters */}
        {totalSelections > 0 && (
          <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-xl">
            <span className="text-sm text-gray-500 mr-2">Filtros:</span>
            {Object.entries(selections).map(([category, values]) =>
              values.map(value => (
                <span key={`${category}-${value}`} className={`tag tag-${category}`}>
                  {value}
                </span>
              ))
            )}
            {keywords && (
              <span className="tag bg-gray-200 text-gray-700">
                "{keywords}"
              </span>
            )}
          </div>
        )}

        {/* Results Grid */}
        {results.results.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.results.map(ref => (
              <Link
                key={ref.id}
                to={`/reference/${ref.id}`}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden card-hover"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {ref.file_path ? (
                    ref.type === 'video' ? (
                      <video
                        src={ref.file_path}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={ref.file_path}
                        alt={ref.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {ref.type === 'video' ? (
                        <Video className="w-12 h-12 text-gray-300" />
                      ) : ref.type === 'link' ? (
                        <LinkIcon className="w-12 h-12 text-gray-300" />
                      ) : (
                        <Image className="w-12 h-12 text-gray-300" />
                      )}
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      ref.type === 'video' ? 'bg-blue-500 text-white' :
                      ref.type === 'image' ? 'bg-green-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {ref.type}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                    {ref.title}
                  </h3>
                  {ref.brand && (
                    <p className="text-sm text-gray-500 mb-2">{ref.brand}</p>
                  )}
                  {ref.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ref.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {tag}
                        </span>
                      ))}
                      {ref.tags.length > 3 && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          +{ref.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron referencias
            </h3>
            <p className="text-gray-600 mb-6">
              Prueba a ajustar los filtros o añade nuevas referencias a tu biblioteca
            </p>
            <Link
              to="/add"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Añadir referencia
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Paso {currentStep + 1} de {STEPS.length}</span>
          <span>{totalSelections} seleccionado{totalSelections !== 1 ? 's' : ''}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full gradient-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {currentStepData.question}
        </h2>
        <p className="text-gray-600 mb-6">{currentStepData.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {currentTags.map(tag => {
            const isSelected = (selections[currentStepData.key] || []).includes(tag.name);
            return (
              <button
                key={tag.id}
                onClick={() => handleTagSelect(tag.name)}
                className={`tag tag-${tag.category} ${isSelected ? 'tag-selected ring-primary-500' : ''}`}
              >
                {tag.name}
              </button>
            );
          })}
        </div>

        {/* Skip hint */}
        <p className="text-sm text-gray-400">
          Puedes seleccionar varios o saltar este paso
        </p>
      </div>

      {/* Keywords (on last step) */}
      {currentStep === STEPS.length - 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Palabras clave adicionales (opcional)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="ej: coca-cola, navidad, familia..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            currentStep === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          Anterior
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 gradient-primary text-white rounded-lg hover:opacity-90"
          >
            Siguiente
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <>Buscando...</>
            ) : (
              <>
                <SearchIcon className="w-5 h-5" />
                Buscar referencias
              </>
            )}
          </button>
        )}
      </div>

      {/* Quick search option */}
      <div className="mt-8 text-center">
        <button
          onClick={handleSearch}
          className="text-sm text-gray-500 hover:text-primary-600"
        >
          O buscar directamente con los filtros actuales
        </button>
      </div>
    </div>
  );
}
