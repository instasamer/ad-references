import { Link, useLocation } from 'react-router-dom';
import { Search, PlusCircle, Library, Home, Sparkles, Download, Youtube, MessageCircle } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Inicio' },
  { path: '/assistant', icon: MessageCircle, label: 'Asistente', highlight: true },
  { path: '/search', icon: Search, label: 'Buscar' },
  { path: '/brands', icon: Youtube, label: 'Marcas' },
  { path: '/import', icon: Download, label: 'Importar' },
  { path: '/library', icon: Library, label: 'Biblioteca' },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                AdRef
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map(({ path, icon: Icon, label, highlight }) => {
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? highlight
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'bg-primary-100 text-primary-700'
                        : highlight
                          ? 'text-purple-600 hover:bg-purple-50 border border-purple-200'
                          : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden sm:inline font-medium">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            AdRef - Tu biblioteca de referencias publicitarias
          </p>
        </div>
      </footer>
    </div>
  );
}
