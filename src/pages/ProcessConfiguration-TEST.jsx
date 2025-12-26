// SOLO ESTE CÓDIGO - NADA MÁS
import React from 'react';

const ProcessConfiguration = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
        Configuración de Procesos
      </h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Página temporal de prueba - Sin errores de compilación
      </p>
      
      <div style={{ 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '20px',
        backgroundColor: '#f9fafb'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>
          ✅ Página cargando correctamente
        </h2>
        <p style={{ marginBottom: '15px' }}>
          Esto prueba que el archivo se puede compilar sin errores.
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '10px',
          marginTop: '20px'
        }}>
          <button
            onClick={() => console.log('Test button clicked')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Botón de prueba
          </button>
          
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Recargar página
          </button>
        </div>
      </div>
      
      <div style={{ marginTop: '30px', fontSize: '14px', color: '#9ca3af' }}>
        <p>Instrucciones:</p>
        <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
          <li>Abre la consola (F12)</li>
          <li>Haz clic en "Botón de prueba"</li>
          <li>Verifica que no haya errores de JavaScript</li>
          <li>Presiona "Recargar página" si es necesario</li>
        </ul>
      </div>
    </div>
  );
};

export default ProcessConfiguration;
