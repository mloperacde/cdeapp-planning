// ProcessConfiguration.jsx - VERSIÓN MEJORADA CON DEBUG
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";

const ProcessConfiguration = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;
  
  const addDebug = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const debugEntry = {
      time: timestamp,
      message,
      data: data ? JSON.stringify(data).substring(0, 100) : null
    };
    
    setDebugInfo(prev => [debugEntry, ...prev.slice(0, 9)]); // Mantener solo 10 últimas
    console.log(`[${timestamp}] ${message}`, data || '');
  };

  // Función para buscar procesos en TODAS las posibles ubicaciones
  const findProcessesEverywhere = () => {
    addDebug("🔍 Buscando procesos en todas las ubicaciones...");
    
    const possibleKeys = [
      'processTypesMaster',
      'processTypes',
      'availableProcesses',
      'productionProcesses',
      'machinesData',
      'maquinas',
      'equipmentList'
    ];
    
    let allProcesses = [];
    const foundInKeys = [];
    
    possibleKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          
          // Verificar si es un array
          if (Array.isArray(parsed)) {
            foundInKeys.push(`${key} (${parsed.length} items)`);
            
            // Si son procesos directos, agregarlos
            if (parsed.length > 0 && parsed[0].code) {
              allProcesses = [...allProcesses, ...parsed];
            }
            // Si son máquinas, extraer sus procesos
            else if (parsed.length > 0 && (parsed[0].name || parsed[0].nombre)) {
              parsed.forEach(machine => {
                if (machine.processes && Array.isArray(machine.processes)) {
                  allProcesses = [...allProcesses, ...machine.processes.map(p => ({
                    ...p,
                    machineName: machine.name || machine.nombre
                  }))];
                }
                if (machine.procesos && Array.isArray(machine.procesos)) {
                  allProcesses = [...allProcesses, ...machine.procesos.map(p => ({
                    ...p,
                    machineName: machine.name || machine.nombre
                  }))];
                }
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error al leer ${key}:`, error);
      }
    });
    
    addDebug(`Encontrados en: ${foundInKeys.join(', ')}`);
    addDebug(`Procesos totales encontrados: ${allProcesses.length}`);
    
    // Eliminar duplicados por código
    const uniqueProcesses = [];
    const seenCodes = new Set();
    
    allProcesses.forEach(process => {
      if (process.code && !seenCodes.has(process.code)) {
        seenCodes.add(process.code);
        uniqueProcesses.push(process);
      }
    });
    
    addDebug(`Procesos únicos después de eliminar duplicados: ${uniqueProcesses.length}`);
    
    return uniqueProcesses;
  };

  // Cargar procesos con retry
  useEffect(() => {
    const loadProcesses = () => {
      addDebug("🔄 Iniciando carga de procesos...");
      
      // Buscar en todas partes
      const foundProcesses = findProcessesEverywhere();
      
      if (foundProcesses.length > 0) {
        addDebug(`✅ Procesos cargados: ${foundProcesses.length}`, foundProcesses);
        setProcesses(foundProcesses);
        setLoading(false);
        
        // Guardar en localStorage para uso futuro
        localStorage.setItem('processConfigCache', JSON.stringify({
          timestamp: new Date().toISOString(),
          processes: foundProcesses
        }));
      } else {
        addDebug("⚠️ No se encontraron procesos. Reintentando...");
        
        if (retryCount < maxRetries) {
          // Reintentar después de un delay
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000 * (retryCount + 1)); // Delay incremental
        } else {
          // Usar datos de ejemplo como último recurso
          addDebug("⚠️ Usando datos de ejemplo después de múltiples intentos");
          const exampleProcesses = getExampleProcesses();
          setProcesses(exampleProcesses);
          setLoading(false);
        }
      }
    };

    loadProcesses();
    
    // Escuchar eventos de almacenamiento (cuando otras pestañas actualizan datos)
    const handleStorageChange = (e) => {
      if (e.key && (e.key.includes('process') || e.key.includes('machine'))) {
        addDebug(`📡 Storage actualizado: ${e.key}. Recargando...`);
        loadProcesses();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [retryCount]);

  // Datos de ejemplo
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
      }
    ];
  };

  // Forzar recarga
  const forceReload = () => {
    setRetryCount(0);
    setLoading(true);
    addDebug("🔄 Forzando recarga de procesos...");
  };

  // Sincronizar con ProcessTypes
  const syncWithProcessTypes = () => {
    addDebug("🔄 Sincronizando con ProcessTypes...");
    // Abrir ProcessTypes en nueva pestaña o redirigir
    window.open('/process-types', '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Cargando procesos...</p>
        <p className="text-sm text-gray-500 mt-2">Intento {retryCount + 1} de {maxRetries}</p>
        <button 
          onClick={forceReload}
          className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        >
          Reintentar ahora
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header con Debug */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">⚙️ Configuración de Procesos</h1>
            <p className="text-blue-100">
              {processes.length} procesos disponibles | Última actualización: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={forceReload}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              ↻ Recargar
            </button>
            <button
              onClick={syncWithProcessTypes}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              🔄 ProcessTypes
            </button>
          </div>
        </div>
        
        {/* Debug Info Collapsible */}
        <details className="mt-4 bg-black/20 rounded-lg overflow-hidden">
          <summary className="p-3 cursor-pointer flex items-center gap-2">
            <span className="font-mono">🔧 Debug Information ({debugInfo.length} eventos)</span>
          </summary>
          <div className="p-3 bg-black/30 font-mono text-sm max-h-60 overflow-y-auto">
            {debugInfo.map((entry, index) => (
              <div key={index} className="mb-1 border-b border-white/10 pb-1">
                <span className="text-green-400">[{entry.time}]</span>{' '}
                <span className="text-white">{entry.message}</span>
                {entry.data && (
                  <div className="text-gray-300 text-xs mt-1">{entry.data}</div>
                )}
              </div>
            ))}
            {debugInfo.length === 0 && (
              <div className="text-gray-400">No hay eventos de debug aún</div>
            )}
          </div>
        </details>
      </div>

      {/* Panel de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Procesos Totales</div>
          <div className="text-2xl font-bold text-blue-800">{processes.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Procesos Activos</div>
          <div className="text-2xl font-bold text-green-800">
            {processes.filter(p => p.status === 'active').length}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium">Categorías Únicas</div>
          <div className="text-2xl font-bold text-purple-800">
            {[...new Set(processes.map(p => p.category))].length}
          </div>
        </div>
      </div>

      {/* Selector de Proceso */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Seleccionar Proceso</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar Proceso:
          </label>
          <input
            type="text"
            placeholder="Escriba el nombre o código del proceso..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            onChange={(e) => {
              // Implementar búsqueda si es necesario
            }}
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Proceso:
          </label>
          <select
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            defaultValue=""
          >
            <option value="">-- Seleccione un proceso --</option>
            {processes
              .filter(p => p.status === 'active')
              .map(process => (
                <option key={process.code || process.id} value={process.code}>
                  {process.name} ({process.code}) - {process.time}
                  {process.machineName && ` [${process.machineName}]`}
                </option>
              ))
            }
          </select>
          <p className="text-sm text-gray-500 mt-2">
            {processes.filter(p => p.status === 'active').length} procesos activos disponibles
          </p>
        </div>

        {/* Lista de procesos */}
        <div>
          <h3 className="text-lg font-bold mb-4 text-gray-800">Todos los Procesos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processes.map(process => (
              <div 
                key={process.code || process.id} 
                className={`border rounded-lg p-4 ${
                  process.status === 'active' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-800">{process.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    process.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {process.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="text-sm font-mono text-gray-600 mb-2">{process.code}</div>
                <div className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Categoría:</span> {process.category}
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Tiempo:</span> {process.time}
                </div>
                {process.machineName && (
                  <div className="text-xs text-gray-500 mt-2">
                    <span className="font-medium">Máquina:</span> {process.machineName}
                  </div>
                )}
                {process.machines && Array.isArray(process.machines) && (
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="font-medium">Máquinas:</span> {process.machines.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Información técnica */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-bold text-gray-800 mb-2">ℹ️ Información Técnica</h3>
        <p className="text-sm text-gray-600 mb-3">
          Esta página busca procesos en: processTypesMaster, processTypes, availableProcesses, 
          productionProcesses, machinesData, maquinas, equipmentList
        </p>
        <div className="text-xs font-mono bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
          <div>// Para MachineDailyPlanning.jsx:</div>
          <div>// Asegúrate de usar la misma lógica de búsqueda</div>
          <div className="mt-2">
            const processes = JSON.parse(localStorage.getItem('processTypesMaster')) ||<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;JSON.parse(localStorage.getItem('processTypes')) ||<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[];
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessConfiguration;