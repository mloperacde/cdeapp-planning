// === BASE44 CLIENT FALLBACK ===
// Esto debe ir ANTES de cualquier import que use base44
console.log('🔧 Configurando base44 fallback...');

// Función para crear base44 mock
function createBase44Mock() {
  console.warn('⚠️ Usando base44 mock (cliente real no disponible)');
  
  return {
    auth: {
      me: () => Promise.resolve({ 
        email: 'demo@example.com', 
        full_name: 'Usuario Demo',
        role: 'admin'
      }),
      logout: () => {
        console.log('Mock: logout');
        return Promise.resolve();
      },
      updateMe: (data) => {
        console.log('Mock: updateMe', data);
        return Promise.resolve({ success: true });
      }
    },
    entities: {
      AppConfig: {
        filter: () => Promise.resolve([{
          config_key: 'branding',
          app_name: 'CdeApp Planning',
          app_subtitle: 'Demo Mode'
        }])
      },
      EmployeeMasterDatabase: {
        list: () => Promise.resolve([])
      },
      MachineMaster: {
        list: () => Promise.resolve([]),
        create: (data) => Promise.resolve({ ...data, id: Date.now() }),
        update: (id, data) => Promise.resolve({ ...data, id })
      },
      Process: {
        list: () => Promise.resolve([])
      },
      Assignment: {
        list: () => Promise.resolve([])
      }
    }
  };
}

// Inyectar base44 si no existe
if (typeof window !== 'undefined') {
  if (!window.base44) {
    window.base44 = createBase44Mock();
    window.__usingBase44Mock = true;
    console.log('✅ base44 mock inyectado');
  } else {
    console.log('✅ base44 real disponible');
    window.__usingBase44Mock = false;
  }
}

// Ahora los imports pueden usar base44 de forma segura
import { ServicesProvider } from '@/contexts/ServicesContext';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Luego envuelve tu aplicación con ServicesProvider:
export default function Layout({ children, currentPageName }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ServicesProvider> {/* ← Agrega esto aquí */}
          <SidebarProvider>
ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}
 </SidebarProvider>
        </ServicesProvider> {/* ← Cierra aquí */}
      </ThemeProvider>
    </ErrorBoundary>
  );
}


