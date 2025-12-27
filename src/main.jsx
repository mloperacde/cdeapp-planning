// src/main.jsx - Punto de entrada mínimo
console.log('🎬 main.jsx iniciando en Base44...');

// Solo importar React y renderizar
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Función segura para renderizar
function renderApp() {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Elemento #root no encontrado');
    }
    
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('✅ Aplicación renderizada');
  } catch (error) {
    console.error('💥 Error renderizando:', error);
    document.body.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>Error al cargar la aplicación</h1>
        <p>${error.message}</p>
        <button onclick="window.location.reload()">Recargar</button>
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
