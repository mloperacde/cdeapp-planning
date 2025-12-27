// src/fallback.js - Fallback para cuando base44 no está disponible
export function initializeFallback() {
  console.log('🛡️  Inicializando fallback...');
  
  // Verificar si base44 está disponible
  if (typeof window !== 'undefined' && !window.base44) {
    console.error('❌ base44 NO disponible, activando fallback...');
    
    // Crear un sistema de fallback completo
    window.__fallbackMode = true;
    
    // Redirigir a una página de error amigable
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
          <div style="
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            width: 90%;
          ">
            <h1 style="font-size: 2.5rem; margin-bottom: 20px;">
              ⚠️ Sistema en Mantenimiento
            </h1>
            
            <p style="font-size: 1.2rem; margin-bottom: 30px; line-height: 1.6;">
              La aplicación está experimentando problemas técnicos temporales.
              Nuestro equipo está trabajando para resolverlo.
            </p>
            
            <div style="
              background: rgba(255, 255, 255, 0.15);
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 30px;
              text-align: left;
            ">
              <h3 style="margin-bottom: 10px;">📋 Soluciones rápidas:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Recarga la página (F5)</li>
                <li style="margin-bottom: 8px;">Limpia la caché del navegador</li>
                <li>Intenta en otro navegador</li>
              </ul>
            </div>
            
            <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
              <button onclick="window.location.reload()" style="
                padding: 12px 30px;
                background: white;
                color: #667eea;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                font-size: 1rem;
                transition: transform 0.2s;
              ">
                🔄 Recargar Aplicación
              </button>
              
              <button onclick="console.log('base44:', window.base44); alert('Consulta la consola (F12)')" style="
                padding: 12px 30px;
                background: transparent;
                color: white;
                border: 2px solid white;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                font-size: 1rem;
                transition: transform 0.2s;
              ">
                🐛 Ver Detalles Técnicos
              </button>
            </div>
          </div>
          
          <div style="margin-top: 40px; font-size: 0.9rem; opacity: 0.8;">
            <p>CdeApp Planning • Sistema de Gestión Integral</p>
            <p id="status">Estado: Fallback activado</p>
          </div>
        </div>
      `;
    }
    
    return false; // Indicar que fallback se activó
  }
  
  return true; // Indicar que base44 está disponible
}
