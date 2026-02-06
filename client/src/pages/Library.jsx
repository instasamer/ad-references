import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Image, Video, Link as LinkIcon, Grid, List, Plus } from 'lucide-react';
import api from '../api';

export default function Library() {
  const [references, setReferences] = useState([]);
  const [filteredRefs, setFilteredRefs] = useState([]);
  const [tags, setTags] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([api.getReferences(), api.getTags()])
      .then(([refs, t]) => {
        setReferences(refs);
        setFilteredRefs(refs);
        setTags(t);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let filtered = [...references];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        ref =>
          ref.title.toLowerCase().includes(term) ||
          ref.description?.toLowerCase().includes(term) ||
          ref.brand?.toLowerCase().includes(term)
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(ref => ref.type === selectedType);
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(ref =>
        selectedTags.some(tag => ref.tags.includes(tag))
      );
    }

    setFilteredRefs(filtered);
  }, [references, searchTerm, selectedType, selectedTags]);

  const toggleTag = (tagName) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedTags([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biblioteca</h1>
          <p className="text-gray-600">
            {filteredRefs.length} de {references.length} referencia{references.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/add"
          className="inline-flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-lg hover:opacity-90"
        >
          <Plus className="w-5 h-5" />
          Añadir nueva
        </Link>
      </div>

      {/* Search and filters bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, marca..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'image', label: 'Imágenes', icon: Image },
              { value: 'video', label: 'Videos', icon: Video },
              { value: 'link', label: 'Links', icon: LinkIcon },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setSelectedType(value)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === value
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Toggle filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters || selectedTags.length > 0
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
          </button>

          {/* View mode */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <Grid className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <List className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tags filter panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Filtrar por tags</span>
              {selectedTags.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="space-y-3">
              {Object.entries(tags).map(([category, categoryTags]) => (
                <div key={category}>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {category}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {categoryTags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.name)}
                        className={`tag tag-${category} ${
                          selectedTags.includes(tag.name) ? 'tag-selected ring-primary-500' : ''
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {filteredRefs.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRefs.map(ref => (
              <Link
                key={ref.id}
                to={`/reference/${ref.id}`}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden card-hover"
              >
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {ref.file_path ? (
                    ref.type === 'video' ? (
                      <video src={ref.file_path} className="w-full h-full object-cover" />
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
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                    {ref.title}
                  </h3>
                  {ref.brand && (
                    <p className="text-sm text-gray-500">{ref.brand}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
            {filteredRefs.map(ref => (
              <Link
                key={ref.id}
                to={`/reference/${ref.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-20 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {ref.file_path ? (
                    ref.type === 'video' ? (
                      <video src={ref.file_path} className="w-full h-full object-cover" />
                    ) : (
                      <img src={ref.file_path} alt={ref.title} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {ref.type === 'video' ? <Video className="w-6 h-6 text-gray-300" /> :
                       ref.type === 'link' ? <LinkIcon className="w-6 h-6 text-gray-300" /> :
                       <Image className="w-6 h-6 text-gray-300" />}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{ref.title}</h3>
                  <p className="text-sm text-gray-500">
                    {[ref.brand, ref.year].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {ref.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  ref.type === 'video' ? 'bg-blue-100 text-blue-700' :
                  ref.type === 'image' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {ref.type}
                </span>
              </Link>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {references.length === 0 ? 'Tu biblioteca está vacía' : 'No hay resultados'}
          </h3>
          <p className="text-gray-600 mb-6">
            {references.length === 0
              ? 'Empieza añadiendo algunas referencias de anuncios'
              : 'Prueba a ajustar los filtros de búsqueda'}
          </p>
          {references.length === 0 ? (
            <Link
              to="/add"
              className="inline-flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Añadir referencia
            </Link>
          ) : (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
