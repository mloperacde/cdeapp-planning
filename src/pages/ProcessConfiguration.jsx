import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const ProcessConfiguration = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    categories: []
  });

  // 1. Cargar procesos desde localStorage o API
  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = () => {
    setLoading(true);
    
    // Intentar cargar desde localStorage primero
    const savedProcesses = localStorage.getItem('processTypesMaster');
    
    if (savedProcesses) {
      try {
        const parsed = JSON.parse(savedProcesses);
        setProcesses(parsed);
        updateStats(parsed);
        console.log(`✅ Cargados ${parsed.length} procesos desde localStorage`);
      } catch (error) {
        console.error('Error al parsear procesos:', error);
        fetchProcessesFromAPI();
      }
    } else {
      // Si no hay en localStorage, buscar en API
      fetchProcessesFromAPI();
    }
    
    setLoading(false);
  };

  const fetchProcessesFromAPI = async () => {
    try {
      // Usar React Query si está configurado
      const data = await base44.get('/process-types'); // Ajusta el endpoint según tu API
      setProcesses(data);
      updateStats(data);
      
      // Guardar en localStorage para uso futuro
      localStorage.setItem('processTypesMaster', JSON.stringify(data));
      
      console.log(`✅ Cargados ${data.length} procesos desde API`);
    } catch (error) {
      console.error('Error al cargar procesos desde API:', error);
      
      // Usar datos de ejemplo como fallback
      const exampleProcesses = getExampleProcesses();
      setProcesses(exampleProcesses);
      updateStats(exampleProcesses);
    }
  };

  const getExampleProcesses = () => {
    return [
      {
        id: 1,
        name: "Corte por láser",
        code: "CORTE_LASER",
        category: "Corte",
        time: "45 min",
        status: "active",
        machines: ["Láser-01", "Láser-02"]
      },
      {
        id: 2,
        name: "Fresado CNC",
        code: "FRESADO_CNC",
        category: "Mecanizado",
        time: "120 min",
        status: "active",
        machines: ["CNC-01", "CNC-02"]
      },
      {
        id: 3,
        name: "Impresión 3D",
        code: "IMPRESION_3D",
        category: "Prototipado",
        time: "180 min",
        status: "active",
        machines: ["3D-Printer-01"]
      }
    ];
  };

  const updateStats = (processList) => {
    const total = processList.length;
    const active = processList.filter(p => p.status === 'active').length;
    const categories = [...new Set(processList.map(p => p.category))];
    
    setStats({ total, active, categories });
  };

  const handleProcessSelect = (e) => {
    const value = e.target.value;
    setSelectedProcess(value);
    
    // Encontrar el proceso completo seleccionado
    const selected = processes.find(p => p.code === value || p.id.toString() === value);
    if (selected) {
      console.log('Proceso seleccionado:', selected);
      // Puedes hacer algo con el proceso seleccionado
    }
  };

  const refreshProcesses = () => {
    // Limpiar caché y recargar
    localStorage.removeItem('processTypesMaster');
    localStorage.removeItem('processTypesCache');
    loadProcesses();
  };

  const syncWithProcessTypes = () => {
    // Redirigir a la página de ProcessTypes para gestionar procesos
    window.location.href = '/process-types'; // Ajusta la ruta según tu router
  };

  // Usar React Query si lo prefieres
  const { data: queryData, isLoading: queryLoading } = useQuery({
    queryKey: ['processTypes'],
    queryFn: () => base44.get('/process-types'),
    enabled: false, // No cargar automáticamente, usamos nuestro método
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando procesos...</p>
      </div>
    );
  }

  return (
    <div className="process-configuration">
      {/* Header con estadísticas */}
      <div className="page-header">
        <h1>Configuración de Procesos</h1>
        <div className="process-stats">
          <span className="stat-item">
            <strong>📊 Total:</strong> {stats.total}
          </span>
          <span className="stat-item">
            <strong>✅ Activos:</strong> {stats.active}
          </span>
          <span className="stat-item">
            <strong>🗂️ Categorías:</strong> {stats.categories.length}
          </span>
          <button 
            className="btn-refresh"
            onClick={refreshProcesses}
            title="Actualizar lista de procesos"
          >
            ↻ Actualizar
          </button>
          <button 
            className="btn-sync"
            onClick={syncWithProcessTypes}
            title="Ir a Tipos de Procesos"
          >
            🔄 Gestionar Procesos
          </button>
        </div>
      </div>

      {/* Selector de proceso */}
      <div className="form-section">
        <h2>Seleccionar Proceso</h2>
        <div className="form-group">
          <label htmlFor="processSelect">Proceso:</label>
          <select
            id="processSelect"
            value={selectedProcess}
            onChange={handleProcessSelect}
            className="process-select"
          >
            <option value="">-- Seleccionar un proceso --</option>
            {processes
              .filter(p => p.status === 'active')
              .map(process => (
                <option key={process.id} value={process.code}>
                  {process.name} ({process.code}) - {process.time}
                </option>
              ))
            }
          </select>
        </div>

        {/* Mostrar detalles del proceso seleccionado */}
        {selectedProcess && (
          <div className="process-details">
            <h3>Detalles del Proceso</h3>
            {(() => {
              const process = processes.find(
                p => p.code === selectedProcess || p.id.toString() === selectedProcess
              );
              if (process) {
                return (
                  <div className="details-card">
                    <p><strong>Nombre:</strong> {process.name}</p>
                    <p><strong>Código:</strong> <code>{process.code}</code></p>
                    <p><strong>Categoría:</strong> {process.category}</p>
                    <p><strong>Tiempo estimado:</strong> {process.time}</p>
                    <p><strong>Máquinas compatibles:</strong></p>
                    <ul>
                      {process.machines?.map((machine, index) => (
                        <li key={index}>{machine}</li>
                      )) || <li>No especificadas</li>}
                    </ul>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* Lista completa de procesos disponibles */}
        <div className="process-list">
          <h3>Procesos Disponibles ({processes.length})</h3>
          <div className="process-grid">
            {processes.map(process => (
              <div 
                key={process.id} 
                className={`process-card ${process.status === 'active' ? 'active' : 'inactive'}`}
              >
                <h4>{process.name}</h4>
                <div className="process-code">{process.code}</div>
                <div className="process-meta">
                  <span className="category-badge">{process.category}</span>
                  <span className="time-badge">{process.time}</span>
                  <span className={`status-badge ${process.status}`}>
                    {process.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="process-machines">
                  <small>Máquinas: {process.machines?.join(', ') || 'No especificadas'}</small>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Estilos CSS en línea o importar CSS */}
      <style jsx>{`
        .process-configuration {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .page-header {
          background: linear-gradient(135deg, #2c3e50, #4a6491);
          color: white;
          padding: 25px;
          border-radius: 10px;
          margin-bottom: 25px;
        }
        
        .page-header h1 {
          margin: 0 0 15px 0;
          font-size: 2rem;
        }
        
        .process-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          align-items: center;
        }
        
        .stat-item {
          background: rgba(255, 255, 255, 0.1);
          padding: 8px 15px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-refresh, .btn-sync {
          padding: 8px 15px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }
        
        .btn-refresh {
          background: #f39c12;
          color: white;
        }
        
        .btn-refresh:hover {
          background: #d68910;
        }
        
        .btn-sync {
          background: #3498db;
          color: white;
        }
        
        .btn-sync:hover {
          background: #2980b9;
        }
        
        .form-section {
          background: white;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.08);
          margin-bottom: 25px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .process-select {
          width: 100%;
          padding: 12px 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
          background-color: white;
          cursor: pointer;
        }
        
        .process-details {
          margin-top: 25px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #3498db;
        }
        
        .details-card {
          background: white;
          padding: 15px;
          border-radius: 6px;
          margin-top: 10px;
        }
        
        .process-list {
          margin-top: 30px;
        }
        
        .process-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          margin-top: 15px;
        }
        
        .process-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
          border-top: 4px solid #3498db;
        }
        
        .process-card.inactive {
          border-top-color: #95a5a6;
          opacity: 0.7;
        }
        
        .process-card h4 {
          margin: 0 0 10px 0;
          color: #2c3e50;
        }
        
        .process-code {
          font-family: monospace;
          color: #7f8c8d;
          font-size: 0.9rem;
          margin-bottom: 10px;
        }
        
        .process-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        
        .category-badge, .time-badge, .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .category-badge {
          background: #e8f4fc;
          color: #3498db;
        }
        
        .time-badge {
          background: #d4edda;
          color: #155724;
        }
        
        .status-badge.active {
          background: #d4edda;
          color: #155724;
        }
        
        .status-badge.inactive {
          background: #f8d7da;
          color: #721c24;
        }
        
        .process-machines {
          color: #666;
          font-size: 0.85rem;
          margin-top: 10px;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProcessConfiguration;