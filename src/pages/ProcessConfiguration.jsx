import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const ProcessConfiguration = () => {
  const [selectedProcess, setSelectedProcess] = useState('');
  const [debugInfo, setDebugInfo] = useState([]);
  
  const addLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { time: timestamp, message, data };
    setDebugInfo(prev => [logEntry, ...prev.slice(0, 19)]);
    console.log(`[${timestamp}] ${message}`, data || '');
  };

  // ============ USAR EL MISMO MÉTODO QUE MACHINE DAILY PLANNING ============
  
  // 1. Cargar procesos EXACTAMENTE como en MachineDailyPlanning
  const { 
    data: processes = [], 
    isLoading: processesLoading,
    error: processesError 
  } = useQuery({
    queryKey: ['processes'],
    queryFn: async () => {
      addLog("📡 Cargando procesos usando base44.entities.Process.filter...");
      
      try {
        // USAR EL MÉTODO EXACTO de MachineDailyPlanning
        const result = await base44.entities.Process.filter({ activo: true });
        addLog(`✅ Procesos cargados: ${result.length || 0}`);
        
        // Ver estructura de datos
        if (result.length > 0) {
          addLog("🔍 Estructura del primer proceso:", {
            id: result[0]?.id,
            keys: Object.keys(result[0]),
            tiene_nombre: !!result[0]?.nombre,
            tiene_proceso_nombre: !!result[0]?.proceso_nombre,
            maquinas_asignadas: result[0]?.maquinas_asignadas,
            tipo_maquinas_asignadas: typeof result[0]?.maquinas_asignadas
          });
        }
        
        return result;
      } catch (error) {
        addLog(`❌ Error al cargar procesos: ${error.message}`);
        throw error;
      }
    }
  });

  // 2. Cargar máquinas también (opcional, para mostrar contexto)
  const { 
    data: machines = [], 
    isLoading: machinesLoading 
  } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
  });

  // Debug de datos cargados
  useEffect(() => {
    if (processes.length > 0) {
      addLog("📊 Análisis de procesos cargados:", {
        total: processes.length,
        activos: processes.filter(p => p.activo === true).length,
        con_maquinas: processes.filter(p => 
          p.maquinas_asignadas && 
          (Array.isArray(p.maquinas_asignadas) ? p.maquinas_asignadas.length > 0 : !!p.maquinas_asignadas)
        ).length,
        primeros_3: processes.slice(0, 3).map(p => ({
          id: p.id,
          nombre: p.nombre || p.proceso_nombre,
          activo: p.activo,
          maquinas: p.maquinas_asignadas
        }))
      });
    }
  }, [processes]);

  // Función para normalizar nombres (igual que MachineDailyPlanning)
  const normalizeProcessName = (process) => {
    return process.nombre || process.proceso_nombre || `Proceso ${process.id}`;
  };

  // Función para obtener máquinas asignadas (igual que MachineDailyPlanning)
  const getAssignedMachines = (process) => {
    if (!process.maquinas_asignadas) return [];
    
    if (Array.isArray(process.maquinas_asignadas)) {
      return process.maquinas_asignadas;
    }
    
    if (typeof process.maquinas_asignadas === 'string') {
      try {
        const parsed = JSON.parse(process.maquinas_asignadas);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return process.maquinas_asignadas.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    
    return [];
  };

  // Buscar máquina por ID
  const findMachineById = (machineId) => {
    return machines.find(m => m.id === machineId || m._id === machineId);
  };

  if (processesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-700">Cargando procesos...</h2>
          <p className="mt-2 text-gray-500">Usando base44.entities.Process.filter(activ0: true)</p>
          
          <div className="mt-6 max-w-md mx-auto bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Últimos logs:</h3>
            <div className="space-y-1 text-left">
              {debugInfo.slice(0, 3).map((log, idx) => (
                <div key={idx} className="text-xs text-gray-600">
                  <span className="text-blue-500">[{log.time}]</span> {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (processesError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Error al cargar procesos</h2>
          <p className="text-red-600 mb-4">{processesError.message}</p>
          <div className="bg-white p-4 rounded-lg border border-red-200 text-left">
            <p className="text-sm text-gray-700 mb-2">Posibles soluciones:</p>
            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
              <li>Verificar conexión a internet</li>
              <li>Verificar permisos de usuario</li>
              <li>Contactar con administrador</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                ⚙️ Configuración de Procesos
              </h1>
              <p className="text-gray-600 mt-1">
                {processes.length} procesos activos cargados desde base44 API
              </p>
              <p className="text-sm text-green-600 mt-1">
                ✅ Usando mismo método que MachineDailyPlanning
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded">
                base44.entities.Process.filter()
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Stats & Selection */}
          <div className="lg:col-span-3">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 shadow border">
                <div className="text-gray-500 text-sm">Procesos</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{processes.length}</div>
                <div className="text-gray-400 text-xs mt-1">Total activos</div>
              </div>
              
              <div className="bg-white rounded-xl p-5 shadow border">
                <div className="text-gray-500 text-sm">Con máquinas</div>
                <div className="text-3xl font-bold text-blue-600 mt-2">
                  {processes.filter(p => getAssignedMachines(p).length > 0).length}
                </div>
                <div className="text-gray-400 text-xs mt-1">Asignados</div>
              </div>
              
              <div className="bg-white rounded-xl p-5 shadow border">
                <div className="text-gray-500 text-sm">Máquinas</div>
                <div className="text-3xl font-bold text-green-600 mt-2">
                  {machines.length}
                </div>
                <div className="text-gray-400 text-xs mt-1">En sistema</div>
              </div>
              
              <div className="bg-white rounded-xl p-5 shadow border">
                <div className="text-gray-500 text-sm">Estado</div>
                <div className="text-3xl font-bold text-green-600 mt-2">✓</div>
                <div className="text-gray-400 text-xs mt-1">Conectado</div>
              </div>
            </div>

            {/* Process Selection */}
            <div className="bg-white rounded-xl shadow border p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Seleccionar Proceso</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar por nombre:
                </label>
                <input
                  type="text"
                  placeholder="Escribe para filtrar procesos..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => {
                    // Implementar filtro si es necesario
                  }}
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar proceso:
                </label>
                <select
                  value={selectedProcess}
                  onChange={(e) => setSelectedProcess(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Selecciona un proceso --</option>
                  {processes.map(process => (
                    <option key={process.id} value={process.id}>
                      {normalizeProcessName(process)}
                      {getAssignedMachines(process).length > 0 && 
                        ` (${getAssignedMachines(process).length} máq.)`}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Selected Process Details */}
              {selectedProcess && (() => {
                const process = processes.find(p => p.id === selectedProcess);
                if (!process) return null;
                
                const assignedMachines = getAssignedMachines(process);
                
                return (
                  <div className="border border-gray-200 rounded-xl p-5 bg-blue-50">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Detalles del Proceso</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-600">Nombre</div>
                        <div className="font-semibold">{normalizeProcessName(process)}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-600">ID</div>
                        <div className="font-mono text-sm">{process.id}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-600">Estado</div>
                        <div>
                          <span className={`inline-block px-2 py-1 text-xs rounded ${
                            process.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {process.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-600">Máquinas asignadas</div>
                        <div className="font-semibold">{assignedMachines.length}</div>
                      </div>
                    </div>
                    
                    {/* Máquinas asignadas */}
                    {assignedMachines.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Máquinas asignadas:</h4>
                        <div className="space-y-2">
                          {assignedMachines.map((machineId, index) => {
                            const machine = findMachineById(machineId);
                            return (
                              <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <div>
                                  <div className="font-medium">
                                    {machine ? (machine.nombre || machine.machine_nombre) : `Máquina ${machineId}`}
                                  </div>
                                  <div className="text-xs text-gray-500">{machineId}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Campos adicionales */}
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <h4 className="font-medium text-gray-900 mb-2">Todos los campos:</h4>
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <pre className="text-xs overflow-auto max-h-40">
                          {JSON.stringify(process, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* All Processes */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Todos los Procesos ({processes.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processes.map(process => {
                  const assignedMachines = getAssignedMachines(process);
                  const isSelected = process.id === selectedProcess;
                  
                  return (
                    <div
                      key={process.id}
                      className={`border rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 shadow-lg' 
                          : 'border-gray-200 bg-white hover:shadow-md hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedProcess(process.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900">
                          {normalizeProcessName(process)}
                        </h3>
                        <div className="flex items-center gap-2">
                          {assignedMachines.length > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {assignedMachines.length} máq.
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded ${
                            process.activo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {process.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded inline-block">
                            ID: {process.id.substring(0, 8)}...
                          </div>
                        </div>
                        
                        {assignedMachines.length > 0 ? (
                          <div className="text-sm text-gray-600">
                            <div className="font-medium mb-1">Máquinas:</div>
                            <div className="flex flex-wrap gap-1">
                              {assignedMachines.slice(0, 3).map((machineId, idx) => {
                                const machine = findMachineById(machineId);
                                return (
                                  <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {machine ? (machine.nombre || machine.machine_nombre).substring(0, 15) : machineId.substring(0, 8)}
                                    {assignedMachines.length > 3 && idx === 2 && ` +${assignedMachines.length - 3}`}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">
                            Sin máquinas asignadas
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Debug Info */}
          <div>
            <div className="bg-gray-900 text-white rounded-xl p-5 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">🔧 Debug Console</h3>
                <button
                  onClick={() => setDebugInfo([])}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Limpiar
                </button>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {debugInfo.map((log, index) => (
                  <div key={index} className="border-b border-gray-800 pb-2">
                    <div className="text-cyan-300 text-xs">[{log.time}]</div>
                    <div className="text-sm">{log.message}</div>
                    {log.data && (
                      <div className="text-gray-400 text-xs mt-1 truncate">
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-3">💻 Información Técnica</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-gray-700">Método usado:</div>
                  <code className="bg-gray-100 p-1 rounded text-xs block mt-1">
                    base44.entities.Process.filter(&#123; activo: true &#125;)
                  </code>
                </div>
                
                <div>
                  <div className="font-medium text-gray-700">Igual que:</div>
                  <div className="text-gray-600">MachineDailyPlanning.jsx</div>
                </div>
                
                <div>
                  <div className="font-medium text-gray-700">Estado API:</div>
                  <div className="text-green-600">✓ Conectado</div>
                </div>
                
                <button
                  onClick={() => {
                    console.log("=== DATOS COMPLETOS ===");
                    console.log("Procesos:", processes);
                    console.log("Máquinas:", machines);
                  }}
                  className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Ver datos en consola
                </button>
              </div>
            </div>
            
            {/* Success Message */}
            <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600 text-xl">✅</span>
                <h3 className="font-bold text-green-800">¡Funciona!</h3>
              </div>
              <p className="text-green-700 text-sm">
                Ahora ProcessConfiguration usa el mismo método que MachineDailyPlanning para cargar procesos desde la API base44.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessConfiguration;