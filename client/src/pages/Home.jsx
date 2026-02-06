import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Search, PlusCircle, Library, ArrowRight, TrendingUp } from 'lucide-react';
import api from '../api';

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Encuentra la{' '}
          <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
            referencia perfecta
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Explora nuestra biblioteca de anuncios publicitarios.
          Busca por concepto, tono, formato o época para inspirarte.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/search"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <Search className="w-5 h-5" />
            Buscar referencias
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/add"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-semibold hover:border-primary-300 transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            Añadir referencia
          </Link>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid md:grid-cols-3 gap-6">
        <Link
          to="/search"
          className="group p-6 bg-white rounded-2xl border border-gray-200 card-hover"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Search className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Cuestionario de búsqueda
          </h3>
          <p className="text-gray-600">
            Responde unas preguntas sobre tu proyecto y te sugerimos referencias relevantes.
          </p>
        </Link>

        <Link
          to="/add"
          className="group p-6 bg-white rounded-2xl border border-gray-200 card-hover"
        >
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <PlusCircle className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Añadir referencias
          </h3>
          <p className="text-gray-600">
            Sube imágenes, videos o links de anuncios que quieras guardar en tu biblioteca.
          </p>
        </Link>

        <Link
          to="/library"
          className="group p-6 bg-white rounded-2xl border border-gray-200 card-hover"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Library className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ver biblioteca
          </h3>
          <p className="text-gray-600">
            Explora todas las referencias guardadas, filtra y organiza tu colección.
          </p>
        </Link>
      </section>

      {/* Stats Section */}
      {stats && (
        <section className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Tu biblioteca</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-3xl font-bold text-primary-600">
                {stats.totalReferences}
              </div>
              <div className="text-gray-600">Referencias totales</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-3xl font-bold text-green-600">
                {stats.byType?.find(t => t.type === 'image')?.count || 0}
              </div>
              <div className="text-gray-600">Imágenes</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-3xl font-bold text-blue-600">
                {stats.byType?.find(t => t.type === 'video')?.count || 0}
              </div>
              <div className="text-gray-600">Videos</div>
            </div>
          </div>

          {stats.topTags?.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Tags más usados</h3>
              <div className="flex flex-wrap gap-2">
                {stats.topTags.map((tag, i) => (
                  <span
                    key={i}
                    className={`tag tag-${tag.category}`}
                  >
                    {tag.name} ({tag.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Empty State CTA */}
      {stats?.totalReferences === 0 && (
        <section className="text-center py-12 bg-gradient-to-br from-primary-50 to-purple-50 rounded-2xl">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Tu biblioteca está vacía
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Empieza añadiendo algunas referencias de anuncios que te gusten.
            Puedes subir imágenes, videos o guardar links.
          </p>
          <Link
            to="/add"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-semibold"
          >
            <PlusCircle className="w-5 h-5" />
            Añadir mi primera referencia
          </Link>
        </section>
      )}
    </div>
  );
}
