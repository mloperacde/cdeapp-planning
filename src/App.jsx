import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import { base44 } from './api/base44Client';

// Importaciones de páginas (pueden ser lazy para mejor rendimiento)
import Dashboard from './pages/Dashboard';
import AdvancedHRDashboard from './pages/AdvancedHRDashboard';
import MasterEmployeeDatabase from './pages/MasterEmployeeDatabase';
import Timeline from './pages/Timeline';
import MachineManagement from './pages/MachineManagement';

// Placeholder para páginas que aún no existen
const PlaceholderPage = ({ title }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <p className="text-gray-600">Esta página está en construcción.</p>
  </div>
);

// Componente de carga
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

// Componente de autenticación
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(null);

  React.useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await base44.auth.me();
      setIsAuthenticated(!!user);
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  if (isAuthenticated === null) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Página de login simple
const LoginPage = () => {
  const handleLogin = () => {
    // Base44 maneja la autenticación automáticamente
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            CDE App Planning
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inicia sesión para continuar
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <button
            onClick={handleLogin}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Iniciar sesión con Base44
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente principal de la app
function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Ruta de login */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Rutas protegidas con Layout */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="hr-dashboard" element={<AdvancedHRDashboard />} />
            <Route path="employees" element={<MasterEmployeeDatabase />} />
            <Route path="timeline" element={<Timeline />} />
            <Route path="machines" element={<MachineManagement />} />
            
            {/* Placeholders para otras rutas */}
            <Route path="absences" element={<PlaceholderPage title="Gestión de Ausencias" />} />
            <Route path="planning" element={<PlaceholderPage title="Planificación" />} />
            <Route path="production" element={<PlaceholderPage title="Producción" />} />
            <Route path="maintenance" element={<PlaceholderPage title="Mantenimiento" />} />
            <Route path="quality" element={<PlaceholderPage title="Calidad" />} />
            <Route path="reports" element={<PlaceholderPage title="Informes" />} />
            <Route path="settings" element={<PlaceholderPage title="Configuración" />} />
          </Route>
          
          {/* Ruta 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900">404</h1>
                <p className="mt-4 text-gray-600">Página no encontrada</p>
              </div>
            </div>
          } />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
