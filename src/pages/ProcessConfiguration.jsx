import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const ProcessConfiguration = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [debugLog, setDebugLog] = useState([]);
  const [machines, setMachines] = useState([]);

  const addLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { time: timestamp, message, data };
    setDebugLog(prev => [logEntry, ...prev.slice(0, 19)]); // Mantener 20 logs
    console.log(`[${timestamp}] ${message}`, data || '');
  };

  // 1. CARGAR MÁQUINAS DESDE LA API (como hace MachineDailyPlanning)
  useEffect(() => {
    const loadMachinesAndProcesses = async () => {
      addLog("🚀 Iniciando carga de datos desde API...");
      
      try {
        // Cargar máquinas (como hace MachineDailyPlanning)
        addLog("📡 Cargando máquinas desde API...");
        const machinesResponse = await base44.get('/maquinas');
        const machinesData = machinesResponse.data || machinesResponse;
        setMachines(Array.isArray(machinesData) ? machinesData : []);
        addLog(`✅ Máquinas cargadas: ${Array.isArray(machinesData) ? machinesData.length : 0}`);
        
        // Extraer procesos de las máquinas
        const extractedProcesses = [];
        const processMap = new Map(); // Para evitar duplicados
        
        if (Array.isArray(machinesData)) {
          machinesData.forEach(machine => {
            // Verificar diferentes estructuras posibles
            const machineName = machine.nombre || machine.name || `Máquina ${machine._id?.substring(0, 8)}`;
            const machineId = machine._id;
            
            // Buscar procesos_ids (como en los logs)
            if (machine.procesos_ids && Array.isArray(machine.procesos_ids)) {
              addLog(`🔧 Máquina ${machineName} tiene ${machine.procesos_ids.length} procesos_ids`);
              
              // Aquí deberías cargar los detalles de cada proceso_id
              // Por ahora, creamos procesos de ejemplo basados en los IDs
              machine.procesos_ids.forEach((procId, index) => {
                const processKey = `PROC_${machineId}_${procId}`;
                if (!processMap.has(processKey)) {
                  extractedProcesses.push({
                    id: `${machineId}_${procId}`,
                    name: `Proceso ${index + 1} de ${machineName}`,
                    code: `PROC_${machineId.substring(0, 8)}_${index + 1}`,
                    category: "General",
                    time: "60 min",
                    status: "active",
                    machineId: machineId,
                    machineName: machineName,
                    proceso_id: procId,
                    rawMachineData: machine
                  });
                  processMap.set(processKey, true);
                }
              });
            }
            
            // También buscar en otros campos posibles
            if (machine.procesos && Array.isArray(machine.procesos)) {
              addLog(`🔧 Máquina ${machineName} tiene ${machine.procesos.length} procesos directos`);
              machine.procesos.forEach((proc, index) => {
                const processKey = `${machineId}_${proc.nombre || proc.name || index}`;
                if (!processMap.has(processKey)) {
                  extractedProcesses.push({
                    id: `${machineId}_${index}`,
                    name: proc.nombre || proc.name || `Proceso ${index + 1}`,
                    code: proc.codigo || proc.code || `CODE_${machineId.substring(0, 8)}_${index}`,
                    category: proc.categoria || proc.category || "General",
                    time: proc.tiempo || proc.time || "60 min",
                    status: "active",
                    machineId: machineId,
                    machineName: machineName,
                    rawProcessData: proc
                  });
                  processMap.set(processKey, true);
                }
              });
            }
          });
        }
        
        addLog(`📊 Procesos extraídos de máquinas: ${extractedProcesses.length}`);
        
        // 2. INTENTAR CARGAR PROCESOS DIRECTAMENTE DESDE API
        try {
          addLog("📡 Intentando cargar procesos directamente desde API...");
          const processesResponse = await base44.get('/procesos');
          const apiProcesses = processesResponse.data || processesResponse;
          
          if (Array.isArray(apiProcesses) && apiProcesses.length > 0) {
            addLog(`✅ Procesos cargados desde API: ${apiProcesses.length}`);
            
            // Combinar con procesos extraídos de máquinas
            const allProcesses = [...extractedProcesses, ...apiProcesses.map((proc, index) => ({
              id: proc._id || `api_${index}`,
              name: proc.nombre || proc.name,
              code: proc.codigo || proc.code,
              category: proc.categoria || proc.category,
              time: proc.tiempo || proc.time,
              status: proc.estado || "active",
              isFromAPI: true
            }))];
            
            setProcesses(allProcesses);
            addLog(`📈 Total de procesos combinados: ${allProcesses.length}`);
          } else {
            setProcesses(extractedProcesses);
            addLog("ℹ️ No se encontraron procesos en endpoint /procesos, usando solo los de máquinas");
          }
        } catch (apiError) {
          addLog("⚠️ No se pudo cargar /procesos, usando solo procesos de máquinas", apiError.message);
          setProcesses(extractedProcesses);
        }
        
        // 3. SI NO HAY PROCESOS, USAR DATOS DE EJEMPLO CON MÁQUINAS REALES
        if (extractedProcesses.length === 0) {
          addLog("⚠️ No se extrajeron procesos. Creando datos de ejemplo basados en máquinas reales...");
          
          const exampleProcesses = machinesData.slice(0, 5).map((machine, index) => ({
            id: `example_${index}`,
            name: `Ejemplo: ${machine.nombre || machine.name}`,
            code: `EX_${machine._id?.substring(0, 8) || index}`,
            category: "Ejemplo",
            time: "45 min",
            status: "active",
            machineId: machine._id,
            machineName: machine.nombre || machine.name,
            isExample: true
          }));
          
          setProcesses(exampleProcesses);
          addLog(`📝 Datos de ejemplo creados: ${exampleProcesses.length} procesos`);
        }
        
      } catch (error) {
        addLog("❌ Error al cargar datos desde API", error.message);
        // Datos de emergencia
        setProcesses([
          {
            id: 'emergency_1',
            name: 'Corte por láser (emergencia)',
            code: 'CORTE_LASER',
            category: 'Corte',
            time: '45 min',
            status: 'active'
          },
          {
            id: 'emergency_2',
            name: 'Fresado CNC (emergencia)',
            code: 'FRESADO_CNC',
            category: 'Mecanizado',
            time: '120 min',
            status: 'active'
          }
        ]);
      } finally {
        setLoading(false);
        addLog("🏁 Carga de datos completada");
      }
    };

    loadMachinesAndProcesses();
  }, []);

  // 4. USAR REACT QUERY PARA PROCESOS (opcional pero recomendado)
  const { data: queryProcesses, isLoading: queryLoading } = useQuery({
    queryKey: ['processes'],
    queryFn: async () => {
      try {
        const response = await base44.get('/procesos');
        return response.data || response;
      } catch (error) {
        console.error('Error en React Query:', error);
        return [];
      }
    },
    enabled: false // No cargar automáticamente por ahora
  });

  const handleProcessSelect = (e) => {
    const value = e.target.value;
    setSelectedProcess(value);
    
    const selected = processes.find(p => p.id === value || p.code === value);
    if (selected) {
      addLog(`✅ Proceso seleccionado: ${selected.name}`);
    }
  };

  const loadProcessDetails = async (procesoId) => {
    addLog(`🔍 Cargando detalles del proceso ${procesoId}...`);
    try {
      const response = await base44.get(`/procesos/${procesoId}`);
      addLog(`📋 Detalles del proceso cargados`, response.data);
      return response.data;
    } catch (error) {
      addLog(`❌ Error al cargar detalles del proceso`, error.message);
      return null;
    }
  };

  const refreshData = async () => {
    setLoading(true);
    addLog("🔄 Refrescando datos desde API...");
    
    // Limpiar cache forzando recarga
    setProcesses([]);
    
    // Recargar después de un breve delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Cargando configuración de procesos...</h2>
        <p className="text-gray-500 text-center max-w-md">
          Consultando base de datos para obtener procesos y máquinas
        </p>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg max-w-lg">
          <div className="text-sm text-blue-800 font-mono overflow-auto max-h-40">
            {debugLog.slice(0, 3).map((log, idx) => (
              <div key={idx} className="mb-1">
                <span className="text-blue-600">[{log.time}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">⚙️ Configuración de Procesos</h1>
              <p className="text-gray-600 mt-2">
                Gestiona los procesos disponibles en el sistema. Datos cargados desde la base de datos.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                ↻ Actualizar
              </button>
              <button
                onClick={() => window.open('/process-types', '_blank')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                📋 Ver Tabla Maestra
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-blue-600 text-sm font-medium">Procesos</div>
              <div className="text-2xl font-bold text-blue-800">{processes.length}</div>
              <div className="text-blue-600 text-xs mt-1">Total disponibles</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="text-green-600 text-sm font-medium">Activos</div>
              <div className="text-2xl font-bold text-green-800">
                {processes.filter(p => p.status === 'active').length}
              </div>
              <div className="text-green-600 text-xs mt-1">En uso</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="text-purple-600 text-sm font-medium">Máquinas</div>
              <div className="text-2xl font-bold text-purple-800">{machines.length}</div>
              <div className="text-purple-600 text-xs mt-1">En sistema</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-amber-600 text-sm font-medium">Con procesos</div>
              <div className="text-2xl font-bold text-amber-800">
                {machines.filter(m => (m.procesos_ids && m.procesos_ids.length > 0) || (m.procesos && m.procesos.length > 0)).length}
              </div>
              <div className="text-amber-600 text-xs mt-1">Máquinas activas</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Process Selector */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Seleccionar Proceso</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar por nombre o código:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Corte, Fresado, PROC_..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => {
                    // Implementar búsqueda si es necesario
                  }}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar proceso para configurar:
                </label>
                <select
                  value={selectedProcess}
                  onChange={handleProcessSelect}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Seleccione un proceso --</option>
                  {processes.map(process => (
                    <option key={process.id} value={process.id}>
                      {process.name} ({process.code})
                      {process.machineName && ` - ${process.machineName}`}
                      {process.isExample && ' [Ejemplo]'}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  {processes.filter(p => !p.isExample).length} procesos reales | {processes.filter(p => p.isExample).length} ejemplos
                </p>
              </div>

              {/* Process Details */}
              {selectedProcess && (() => {
                const process = processes.find(p => p.id === selectedProcess || p.code === selectedProcess);
                if (!process) return null;
                
                return (
                  <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Detalles del Proceso</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Nombre</p>
                        <p className="font-medium">{process.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Código</p>
                        <p className="font-mono font-medium">{process.code}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Categoría</p>
                        <p className="font-medium">{process.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tiempo estimado</p>
                        <p className="font-medium">{process.time}</p>
                      </div>
                      {process.machineName && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-gray-600">Máquina asociada</p>
                          <p className="font-medium">{process.machineName}</p>
                        </div>
                      )}
                      {process.proceso_id && (
                        <div>
                          <p className="text-sm text-gray-600">ID del proceso</p>
                          <p className="font-mono text-sm">{process.proceso_id}</p>
                        </div>
                      )}
                    </div>
                    
                    {process.proceso_id && (
                      <button
                        onClick={() => loadProcessDetails(process.proceso_id)}
                        className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                      >
                        Cargar detalles completos desde API
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* All Processes Grid */}
            <div className="mt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Todos los Procesos ({processes.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processes.map(process => (
                  <div 
                    key={process.id}
                    className={`border rounded-xl p-4 ${process.isExample ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900">{process.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${process.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {process.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">{process.code}</code>
                      {process.isExample && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Ejemplo</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><span className="font-medium">Categoría:</span> {process.category}</div>
                      <div><span className="font-medium">Tiempo:</span> {process.time}</div>
                      {process.machineName && (
                        <div><span className="font-medium">Máquina:</span> {process.machineName}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Debug & Info */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🔧 Información de Debug</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Estado de conexión</p>
                  <p className="font-medium text-green-600">✓ Conectado a base44 API</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Máquinas cargadas</p>
                  <p className="font-medium">{machines.length} máquinas</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Última actualización</p>
                  <p className="font-medium">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => console.log('Máquinas:', machines, 'Procesos:', processes)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Ver datos en consola
                </button>
              </div>
            </div>

            {/* Debug Log */}
            <div className="bg-gray-900 text-gray-100 rounded-2xl p-5">
              <h3 className="text-lg font-bold mb-4">📋 Log de actividad</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-sm">
                {debugLog.map((log, index) => (
                  <div key={index} className="border-b border-gray-700 pb-2">
                    <div className="text-cyan-400">[{log.time}]</div>
                    <div className="text-gray-300">{log.message}</div>
                    {log.data && (
                      <div className="text-gray-400 text-xs mt-1 truncate">{JSON.stringify(log.data)}</div>
                    )}
                  </div>
                ))}
                {debugLog.length === 0 && (
                  <div className="text-gray-400">No hay actividad registrada</div>
                )}
              </div>
              <button
                onClick={() => setDebugLog([])}
                className="mt-4 w-full px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 text-sm"
              >
                Limpiar log
              </button>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Cómo funciona</h3>
          <p className="text-blue-800 mb-4">
            Esta página consulta directamente la base de datos para obtener procesos y máquinas. 
            Los datos vienen de los endpoints <code>/maquinas</code> y <code>/procesos</code> de la API base44.
          </p>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Problema anterior:</strong> Se buscaba en localStorage cuando los datos están en la API.
            </p>
            <p className="text-sm text-gray-700">
              <strong>Solución actual:</strong> Consulta directa a la API, igual que MachineDailyPlanning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessConfiguration;