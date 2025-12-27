// src/main.jsx - CARGAR initBase44 PRIMERO
console.log('🚀 Iniciando aplicación Base44...');

// ========== CARGA NUCLEAR DE BASE44 ==========
// ESTO DEBE SER LO PRIMERO QUE SE EJECUTE
import './initBase44';

// Verificar que base44 esté disponible
if (!window.base44) {
  console.error('💥 CRÍTICO: base44 no disponible incluso después de initBase44');
  document.body.innerHTML = `
    <div style="
      padding: 40px;
      font-family: Arial, sans-serif;
      text-align: center;
      background: #dc2626;
      color: white;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    ">
      <h1 style="font-size: 2.5rem;">💥 ERROR CRÍTICO</h1>
      <p style="font-size: 1.2rem; margin: 20px 0;">
        No se pudo cargar base44. La aplicación no puede iniciar.
      </p>
      <button onclick="window.location.reload()" style="
        padding: 15px 30px;
        background: white;
        color: #dc2626;
        border: none;
        border-radius: 8px;
        font-size: 1.1rem;
        font-weight: bold;
        cursor: pointer;
        margin: 10px;
      ">
        🔄 RECARGAR APLICACIÓN
      </button>
    </div>
  `;
  throw new Error('base44 no disponible');
}

console.log('✅ base44 verificado, cargando React...');

// ========== IMPORTS NORMALES ==========
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ========== RENDERIZADO ==========
function renderApplication() {
  try {
    const rootElement = document.getElementById('root');
    
    if (!rootElement) {
      throw new Error('Elemento #root no encontrado en el DOM');
    }
    
    const root = ReactDOM.createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('🎉 Aplicación renderizada exitosamente');
    
    // Verificar que todo funciona
    setTimeout(() => {
      if (window.base44 && window.base44.__debug) {
        console.log('🔧 Debug nuclear disponible');
      }
    }, 2000);
    
  } catch (error) {
    console.error('💥 Error al renderizar:', error);
    
    // Mostrar error amigable
    document.body.innerHTML = `
      <div style="
        padding: 40px;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
        color: white;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      ">
        <h1 style="font-size: 2.5rem; margin-bottom: 20px;">
          ⚠️ Error al renderizar
        </h1>
        
        <div style="
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 30px;
          max-width: 700px;
          margin: 20px 0;
          text-align: left;
        ">
          <h2 style="margin-top: 0;">Detalles del error:</h2>
          <p><strong>Mensaje:</strong> ${error.message}</p>
          <p><strong>Archivo:</strong> ${error.fileName || 'Desconocido'}</p>
          <p><strong>Línea:</strong> ${error.lineNumber || 'Desconocida'}</p>
          
          <div style="
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            overflow: auto;
            max-height: 300px;
          ">
            <pre style="margin: 0;">${error.stack || 'No hay stack trace'}</pre>
          </div>
          
          <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
            <button onclick="window.location.reload()" style="
              padding: 12px 24px;
              background: white;
              color: #dc2626;
              border: none;
              border-radius: 8px;
              font-weight: bold;
              cursor: pointer;
              font-size: 1rem;
              min-width: 200px;
            ">
              🔄 Recargar aplicación
            </button>
            
            <button onclick="console.clear(); console.log('base44:', window.base44); window.base44?.__debug?.status()" style="
              padding: 12px 24px;
              background: transparent;
              color: white;
              border: 2px solid white;
              border-radius: 8px;
              font-weight: bold;
              cursor: pointer;
              font-size: 1rem;
              min-width: 200px;
            ">
              🐛 Ver estado base44
            </button>
            
            <button onclick="window.base44?.__debug?.testAll()" style="
              padding: 12px 24px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 8px;
              font-weight: bold;
              cursor: pointer;
              font-size: 1rem;
              min-width: 200px;
            ">
              🧪 Probar servicios
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

// ========== INICIAR CUANDO EL DOM ESTÉ LISTO ==========
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApplication);
} else {
  // El DOM ya está listo
  setTimeout(renderApplication, 100);
}

// ========== HMR PARA VITE ==========
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}
