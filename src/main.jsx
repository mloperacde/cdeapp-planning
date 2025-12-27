// src/main.jsx - AL PRINCIPIO DEL ARCHIVO
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ============ BLOQUEAR TAILWIND CDN ============
(function() {
  // Solo ejecutar en el navegador
  if (typeof window === 'undefined') return;
  
  console.log('🚀 Iniciando bloqueo de Tailwind CDN...');
  
  // 1. Eliminar script existente inmediatamente
  const tailwindScript = document.querySelector('script[src*="tailwindcss.com"]');
  if (tailwindScript) {
    tailwindScript.remove();
    console.log('✅ Script de Tailwind CDN eliminado (inmediato)');
  }
  
  // 2. Interceptar document.createElement
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName, options) {
    const element = originalCreateElement.call(this, tagName, options);
    
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' && value && value.includes('tailwindcss.com')) {
          console.warn('❌ Bloqueada creación de script de Tailwind CDN');
          return; // No establecer el src
        }
        return originalSetAttribute.call(this, name, value);
      };
      
      // También interceptar .src
      Object.defineProperty(element, 'src', {
        set(value) {
          if (value && value.includes('tailwindcss.com')) {
            console.warn('❌ Bloqueada asignación .src de Tailwind CDN');
            return;
          }
          originalSetAttribute.call(this, 'src', value);
        },
        get() {
          return this.getAttribute('src');
        }
      });
    }
    
    return element;
  };
  
  // 3. Observar mutaciones
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === 'SCRIPT' && 
            node.src && 
            node.src.includes('tailwindcss.com')) {
          node.remove();
          console.log('✅ Script de Tailwind CDN eliminado (mutación)');
        }
      });
    });
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  // 4. Verificar periódicamente
  setInterval(() => {
    const scripts = document.querySelectorAll('script[src*="tailwindcss.com"]');
    if (scripts.length > 0) {
      scripts.forEach(script => script.remove());
      console.log('✅ Scripts de Tailwind CDN limpiados (verificación periódica)');
    }
  }, 1000);
  
  console.log('✅ Sistema de bloqueo de Tailwind CDN activado');
})();
// ============ FIN BLOQUEO ============

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

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



