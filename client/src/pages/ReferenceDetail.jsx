import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Building2,
  Trash2,
  Edit,
  Image,
  Video,
  Link as LinkIcon,
} from 'lucide-react';
import api from '../api';

export default function ReferenceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reference, setReference] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    api
      .getReference(id)
      .then(setReference)
      .catch((err) => {
        console.error(err);
        navigate('/library');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteReference(id);
      navigate('/library');
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!reference) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Referencia no encontrada</p>
        <Link to="/library" className="text-primary-600 hover:underline">
          Volver a la biblioteca
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Media */}
        <div className="aspect-video bg-gray-900 relative">
          {reference.file_path ? (
            reference.type === 'video' ? (
              <video
                src={reference.file_path}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={reference.file_path}
                alt={reference.title}
                className="w-full h-full object-contain"
              />
            )
          ) : reference.url ? (
            <div className="w-full h-full flex items-center justify-center">
              <a
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-4 text-white hover:text-primary-300"
              >
                <ExternalLink className="w-16 h-16" />
                <span className="text-lg">Ver enlace externo</span>
              </a>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {reference.type === 'video' ? (
                <Video className="w-20 h-20 text-gray-600" />
              ) : reference.type === 'link' ? (
                <LinkIcon className="w-20 h-20 text-gray-600" />
              ) : (
                <Image className="w-20 h-20 text-gray-600" />
              )}
            </div>
          )}

          {/* Type badge */}
          <div className="absolute top-4 left-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                reference.type === 'video'
                  ? 'bg-blue-500 text-white'
                  : reference.type === 'image'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-500 text-white'
              }`}
            >
              {reference.type}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Title and actions */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {reference.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-500">
                {reference.brand && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {reference.brand}
                  </span>
                )}
                {reference.year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {reference.year}
                  </span>
                )}
                {reference.source && (
                  <span className="text-sm">Fuente: {reference.source}</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Description */}
          {reference.description && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Descripción
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {reference.description}
              </p>
            </div>
          )}

          {/* URL */}
          {reference.url && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Enlace
              </h2>
              <a
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                {reference.url}
              </a>
            </div>
          )}

          {/* Tags */}
          {reference.tags.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Etiquetas
              </h2>
              <div className="flex flex-wrap gap-2">
                {reference.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Eliminar referencia?
            </h3>
            <p className="text-gray-600 mb-6">
              Esta acción no se puede deshacer. Se eliminará permanentemente esta
              referencia de tu biblioteca.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
