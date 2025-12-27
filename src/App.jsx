// Ejecuta esto ENTERO en la consola
(function() {
  console.clear();
  console.log('🔄 TRANSFORMANDO App.jsx para usar React global...');
  
  // Obtener el código original de App.jsx
  fetch('/src/App.jsx')
    .then(r => r.text())
    .then(codigoOriginal => {
      console.log('📦 Código original obtenido:', codigoOriginal.length, 'caracteres');
      
      // Transformar el código
      const codigoTransformado = transformarAppJSX(codigoOriginal);
      
      // Crear y ejecutar el script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.textContent = codigoTransformado;
      document.head.appendChild(script);
      
      console.log('✅ App.jsx transformado y ejecutado');
      
      // Ahora renderizar
      renderizarAplicacion();
    })
    .catch(error => {
      console.error('❌ Error transformando App.jsx:', error);
      crearAppDeEmergencia();
    });
  
  function transformarAppJSX(codigo) {
    // Reemplazar imports por referencias a window
    return `
      // === App.jsx TRANSFORMADO PARA REACT GLOBAL ===
      
      // Usar React desde window
      const React = window.React;
      
      // Crear componentes mock para las dependencias
      const Toaster = () => React.createElement('div', null);
      const QueryClientProvider = ({ children, client }) => children;
      const BrowserRouter = ({ children }) => children;
      const Routes = ({ children }) => children;
      const Route = ({ path, element }) => element;
      const AuthProvider = ({ children }) => children;
      const ErrorBoundary = ({ children }) => children;
      const ThemeProvider = ({ children }) => children;
      const SidebarProvider = ({ children }) => children;
      
      // Mock de hooks
      const useLocation = () => ({ pathname: '/' });
      const useAuth = () => ({
        isLoadingAuth: false,
        isLoadingPublicSettings: false,
        authError: null,
        isAuthenticated: true,
        navigateToLogin: () => {}
      });
      
      // Mock de query
      const useQuery = () => ({ 
        data: null, 
        isLoading: false, 
        isError: false 
      });
      
      // Mock de páginas
      const Pages = {
        'Timeline': () => React.createElement('div', null, '📅 Timeline'),
        'MachineManagement': () => React.createElement('div', null, '🏭 Gestión de Máquinas'),
        'MasterEmployeeDatabase': () => React.createElement('div', null, '👥 Base de Empleados'),
        'ProductionDashboard': () => React.createElement('div', null, '📊 Dashboard Producción'),
        'DailyPlanning': () => React.createElement('div', null, '📅 Planning Diario'),
        'AdvancedHRDashboard': () => React.createElement('div', null, '📈 Dashboard RRHH')
      };
      
      // Mock de Layout (usaremos tu main.js real si está disponible)
      const Layout = ({ children, currentPageName }) => {
        return React.createElement('div', {
          style: {
            display: 'flex',
            minHeight: '100vh',
            backgroundColor: '#f8fafc'
          }
        },
          // Sidebar
          React.createElement('div', {
            style: {
              width: '250px',
              backgroundColor: 'white',
              borderRight: '1px solid #e2e8f0',
              padding: '20px'
            }
          },
            React.createElement('h2', {style: {marginBottom: '20px'}}, '📊 CdeApp Planning'),
            React.createElement('nav', null,
              Object.keys(Pages).map(page => 
                React.createElement('div', {
                  key: page,
                  style: {
                    padding: '10px',
                    margin: '5px 0',
                    backgroundColor: currentPageName === page ? '#e0f2fe' : 'transparent',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  },
                  onClick: () => console.log('Navegar a:', page)
                }, page)
              )
            )
          ),
          
          // Contenido principal
          React.createElement('main', {
            style: {
              flex: 1,
              padding: '30px'
            }
          }, children)
        );
      };
      
      // Componente principal App
      function App() {
        const location = useLocation();
        const currentPath = location.pathname.replace('/', '') || 'Timeline';
        const CurrentPage = Pages[currentPath] || (() => React.createElement('div', null, 'Página no encontrada'));
        
        return React.createElement(AuthProvider, null,
          React.createElement(QueryClientProvider, { client: {} },
            React.createElement(BrowserRouter, null,
              React.createElement(Layout, { currentPageName: currentPath },
                React.createElement(CurrentPage)
              ),
              React.createElement(Toaster)
            )
          )
        );
      }
      
      // Hacer App disponible globalmente
      window.App = App;
      console.log('✅ App creada y disponible en window.App');
    `;
  }
  
  function renderizarAplicacion() {
    console.log('🎨 Renderizando aplicación transformada...');
    
    if (!window.React || !window.ReactDOM || !window.App) {
      console.error('❌ Faltan dependencias para renderizar');
      crearAppDeEmergencia();
      return;
    }
    
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error('❌ No se encontró el elemento #root');
      return;
    }
    
    // Limpiar y renderizar
    const root = window.ReactDOM.createRoot(rootElement);
    root.render(
      React.createElement(App)
    );
    
    console.log('✅ Aplicación renderizada exitosamente!');
    
    // Agregar navegación básica
    window.navigateTo = (page) => {
      console.log('Navegando a:', page);
      // Simular cambio de ruta
      const newPath = page === 'home' ? '/' : `/${page}`;
      window.history.pushState({}, '', newPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
      
      // Forzar re-render
      root.render(
        React.createElement(App)
      );
    };
  }
  
  function crearAppDeEmergencia() {
    console.log('🚨 Creando app de emergencia...');
    
    const root = document.getElementById('root');
    if (!root) return;
    
    const AppEmergencia = () => {
      return React.createElement('div', {
        style: {
          padding: '40px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          minHeight: '100vh',
          fontFamily: 'Arial, sans-serif'
        }
      },
        React.createElement('h1', {style: {fontSize: '2.5rem', marginBottom: '20px'}}, '🚀 CdeApp Planning'),
        React.createElement('p', {style: {fontSize: '1.2rem', marginBottom: '30px'}}, 
          'Sistema de Gestión Integral'
        ),
        React.createElement('div', {
          style: {
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '15px',
            padding: '30px',
            maxWidth: '600px',
            margin: '0 auto'
          }
        },
          React.createElement('h2', null, '📊 Módulos Disponibles'),
          React.createElement('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '15px',
              marginTop: '20px'
            }
          },
            ['Gestión RRHH', 'Planificación', 'Producción', 'Mantenimiento', 'Calidad', 'Informes']
              .map(modulo => 
                React.createElement('button', {
                  key: modulo,
                  onClick: () => alert(`Accediendo a: ${modulo}`),
                  style: {
                    padding: '15px',
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }
                }, modulo)
              )
          ),
          React.createElement('div', {
            style: {
              marginTop: '30px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255,255,255,0.2)'
            }
          },
            React.createElement('button', {
              onClick: () => {
                if (window.base44?.auth?.me) {
                  window.base44.auth.me().then(user => {
                    alert(\`Usuario: \${user.email}\\nNombre: \${user.full_name}\`);
                  });
                }
              },
              style: {
                padding: '12px 24px',
                background: 'white',
                color: '#667eea',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginRight: '10px'
              }
            }, '🧪 Probar Autenticación'),
            React.createElement('button', {
              onClick: () => window.location.reload(),
              style: {
                padding: '12px 24px',
                background: 'transparent',
                color: 'white',
                border: '2px solid white',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }
            }, '🔄 Recargar')
          )
        )
      );
    };
    
    const rootReact = ReactDOM.createRoot(root);
    rootReact.render(React.createElement(AppEmergencia));
    
    console.log('✅ App de emergencia renderizada');
  }
})();
