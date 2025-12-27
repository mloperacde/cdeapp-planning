// App.jsx - Versión temporal simplificada
import React, { useState, useEffect } from 'react';

// Usar base44 global (ya inyectado)
const base44 = window.base44;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (base44?.auth?.me) {
          const userData = await base44.auth.me();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f8fafc'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#1e293b' }}>CdeApp Planning</h1>
      <p style={{ color: '#64748b' }}>Sistema de Gestión Integral</p>
      
      {user && (
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          maxWidth: '400px',
          margin: '30px auto',
          textAlign: 'left'
        }}>
          <h3 style={{ marginTop: 0, color: '#3b82f6' }}>Usuario Conectado</h3>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Nombre:</strong> {user.full_name}</p>
          <p><strong>Rol:</strong> {user.role}</p>
        </div>
      )}
      
      <div style={{ marginTop: '30px' }}>
        <button 
          onClick={() => {
            if (base44?.entities?.MachineMaster?.list) {
              base44.entities.MachineMaster.list().then(machines => {
                console.log('Máquinas:', machines);
                alert(`Se cargaron ${machines.data?.length || machines.length || 0} máquinas`);
              });
            }
          }}
          style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            margin: '0 10px'
          }}
        >
          Cargar Máquinas
        </button>
        
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            background: '#64748b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            margin: '0 10px'
          }}
        >
          Recargar
        </button>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
