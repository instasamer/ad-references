import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Link as LinkIcon, Image, Video, X, Check, Plus } from 'lucide-react';
import api from '../api';

export default function AddReference() {
  const navigate = useNavigate();
  const [tags, setTags] = useState({});
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'image',
    url: '',
    file: null,
    brand: '',
    year: '',
    source: '',
    tags: [],
  });

  const [preview, setPreview] = useState(null);

  useEffect(() => {
    api.getTags().then(setTags).catch(console.error);
  }, []);

  const handleFileChange = (file) => {
    if (!file) return;

    setForm(prev => ({ ...prev, file }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Auto-detect type
    if (file.type.startsWith('video/')) {
      setForm(prev => ({ ...prev, type: 'video' }));
    } else if (file.type.startsWith('image/')) {
      setForm(prev => ({ ...prev, type: 'image' }));
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleTagToggle = (tagName) => {
    setForm(prev => {
      if (prev.tags.includes(tagName)) {
        return { ...prev, tags: prev.tags.filter(t => t !== tagName) };
      }
      return { ...prev, tags: [...prev.tags, tagName] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title) {
      alert('El título es obligatorio');
      return;
    }

    if (form.type === 'link' && !form.url) {
      alert('La URL es obligatoria para tipo link');
      return;
    }

    setLoading(true);

    try {
      await api.createReference(form);
      navigate('/library');
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setForm(prev => ({ ...prev, file: null }));
    setPreview(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Añadir referencia</h1>
      <p className="text-gray-600 mb-8">
        Sube una imagen, video o guarda un link de un anuncio que te guste
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de referencia
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'image', icon: Image, label: 'Imagen' },
              { value: 'video', icon: Video, label: 'Video' },
              { value: 'link', icon: LinkIcon, label: 'Link' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, type: value }))}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  form.type === value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* File upload or URL */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {form.type === 'link' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL del anuncio *
              </label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo {form.type === 'image' ? '(imagen)' : '(video)'}
              </label>

              {preview ? (
                <div className="relative">
                  {form.type === 'video' ? (
                    <video
                      src={preview}
                      controls
                      className="w-full rounded-lg max-h-64 object-contain bg-black"
                    />
                  ) : (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full rounded-lg max-h-64 object-contain bg-gray-100"
                    />
                  )}
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">
                    Arrastra un archivo aquí o{' '}
                    <label className="text-primary-600 hover:text-primary-700 cursor-pointer">
                      selecciona
                      <input
                        type="file"
                        accept={form.type === 'video' ? 'video/*' : 'image/*'}
                        onChange={(e) => handleFileChange(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-sm text-gray-400">
                    {form.type === 'video' ? 'MP4, WebM, etc.' : 'JPG, PNG, GIF, etc.'}
                  </p>
                </div>
              )}

              <p className="mt-3 text-sm text-gray-500">
                O pega una URL del archivo:
              </p>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
                className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="ej: Spot Navidad Coca-Cola 2023"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="¿Qué te gusta de esta referencia? ¿Por qué la guardas?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca
              </label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm(prev => ({ ...prev, brand: e.target.value }))}
                placeholder="ej: Nike"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año
              </label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                placeholder="ej: 2023"
                min="1900"
                max="2100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fuente
              </label>
              <input
                type="text"
                value={form.source}
                onChange={(e) => setForm(prev => ({ ...prev, source: e.target.value }))}
                placeholder="ej: YouTube, Ads of the World"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Etiquetas
          </label>

          {Object.entries(tags).map(([category, categoryTags]) => (
            <div key={category} className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {category}
              </h4>
              <div className="flex flex-wrap gap-2">
                {categoryTags.map(tag => {
                  const isSelected = form.tags.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.name)}
                      className={`tag tag-${category} ${isSelected ? 'tag-selected ring-primary-500' : ''}`}
                    >
                      {isSelected && <Check className="w-3 h-3 mr-1" />}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 gradient-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              'Guardando...'
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Guardar referencia
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
