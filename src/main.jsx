// src/main.jsx - Versión mínima y robusta
console.log('🚀 Punto de entrada de la aplicación');

// Verificación crítica antes de cargar React
if (!window.base44) {
  console.error('❌ CRÍTICO: base44 no disponible en window');
  
  // Crear una versión mínima de emergencia
  window.base44 = {
    auth: {
      me: () => Promise.resolve({ 
        email: 'emergency@demo.com', 
        full_name: 'Usuario Emergencia' 
      }),
      logout: () => Promise.resolve()
    },
    entities: {}
  };
  
  console.warn('⚠️ base44 de emergencia creado');
}

// Ahora cargar React
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Función de renderizado seguro
function renderApp() {
  try {
    const rootElement = document.getElementById('root');
    
    if (!rootElement) {
      throw new Error('No se encontró el elemento #root');
    }
    
    const root = ReactDOM.createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('✅ Aplicación renderizada');
    
  } catch (error) {
    console.error('💥 Error fatal al renderizar:', error);
    
    // Pantalla de error amigable
    document.body.innerHTML = `
      <div style="
        font-family: system-ui, -apple-system, sans-serif;
        padding: 40px;
        text-align: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      ">
        <h1 style="font-size: 2.5rem; margin-bottom: 20px;">
          ⚠️ Error en la aplicación
        </h1>
        
        <div style="
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 30px;
          max-width: 600px;
          margin: 20px 0;
        ">
          <p style="font-size: 1.2rem; margin-bottom: 20px;">
            ${error.message}
          </p>
          
          <div style="
            background: rgba(0,0,0,0.2);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: left;
            font-family: monospace;
            font-size: 0.9rem;
            overflow: auto;
            max-height: 200px;
          ">
            ${error.stack || 'No hay stack trace disponible'}
          </div>
          
          <div style="display: flex; gap: 15px; justify-content: center;">
            <button onclick="window.location.reload()" style="
              padding: 12px 24px;
              background: white;
              color: #667eea;
              border: none;
              border-radius: 8px;
              font-weight: bold;
              cursor: pointer;
              font-size: 1rem;
            ">
              🔄 Recargar
            </button>
            
            <button onclick="console.log('base44:', window.base44)" style="
              padding: 12px 24px;
              background: transparent;
              color: white;
              border: 2px solid white;
              border-radius: 8px;
              font-weight: bold;
              cursor: pointer;
              font-size: 1rem;
            ">
              🐛 Debug
            </button>
          </div>
        </div>
        
        <p style="margin-top: 30px; opacity: 0.8; font-size: 0.9rem;">
          Si el problema persiste, contacta al soporte técnico.
        </p>
      </div>
    `;
  }
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  setTimeout(renderApp, 0);
}

// HMR para Vite
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}
