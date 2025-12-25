import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const ProcessConfiguration = () => {
  const [selectedProcess, setSelectedProcess] = useState('');
  const [debugInfo, setDebugInfo] = useState([]);
  const [processesWithMachines, setProcessesWithMachines] = useState([]);
  
  const addLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { time: timestamp, message, data };
    setDebugInfo(prev => [logEntry, ...prev.slice(0, 19)]);
    console.log(`[${timestamp}] ${message}`, data || '');
  };

  // ============ CARGAR PROCESOS ============
  const { 
    data: processes = [], 
    isLoading: processesLoading,
    error: processesError 
  } = useQuery({
    queryKey: ['processes'],
    queryFn: async () => {
      addLog("📡 Cargando procesos usando base44.entities.Process.filter...");
      
      try {
        const result = await base44.entities.Process.filter({ activo: true });
        addLog(`✅ Procesos cargados: ${result.length || 0}`);
        
        // Debug detallado de la estructura
        if (result.length > 0) {
          const sampleProcess = result[0];
          addLog("🔍 Análisis de estructura del proceso:", {
            id: sampleProcess.id,
            todas_las_claves: Object.keys(sampleProcess),
            campos_maquinas: Object.keys(sampleProcess).filter(k => 
              k.toLowerCase().includes('maquina') || 
              k.toLowerCase().includes('machine')
            ),
            campos_proceso: Object.keys(sampleProcess).filter(k => 
              k.toLowerCase().includes('proceso') || 
              k.toLowerCase().includes('process')
            ),
            maquinas_asignadas: sampleProcess.maquinas_asignadas,
            tipo_maquinas_asignadas: typeof sampleProcess.maquinas_asignadas,
            es_array: Array.isArray(sampleProcess.maquinas_asignadas),
            valor_crudo: sampleProcess.maquinas_asignadas
          });
        }
        
        return result;
      } catch (error) {
        addLog(`❌ Error al cargar procesos: ${error.message}`);
        throw error;
      }
    }
  });

  // ============ CARGAR MÁQUINAS ============
  const { 
    data: machines = [], 
    isLoading: machinesLoading 
  } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      addLog("🛠️ Cargando máquinas...");
      try {
        const result = await base44.entities.Machine.list('orden');
        addLog(`✅ Máquinas cargadas: ${result.length}`);
        
        // Debug de máquinas
        if (result.length > 0) {
          const sampleMachine = result[0];
          addLog("🔍 Análisis de estructura de máquina:", {
            id: sampleMachine.id,
            nombre: sampleMachine.nombre || sampleMachine.machine_nombre,
            tiene_procesos_ids: !!sampleMachine.procesos_ids,
            procesos_ids: sampleMachine.procesos_ids,
            tipo_procesos_ids: typeof sampleMachine.procesos_ids
          });
        }
        
        return result;
      } catch (error) {
        addLog(`❌ Error al cargar máquinas: ${error.message}`);
        return [];
      }
    },
  });

  // ============ PROCESAR Y RELACIONAR DATOS ============
  useEffect(() => {
    if (processes.length > 0 && machines.length > 0) {
      addLog("🔗 Relacionando procesos con máquinas usando relación inversa...");
      
      const enrichedProcesses = processes.map(process => {
        // ESTRATEGIA 1: Buscar en máquinas que tengan este proceso en sus procesos_ids (RELACIÓN INVERSA)
        let machineIds = [];
        const machinesWithThisProcess = machines.filter(machine => {
          if (machine.procesos_ids && Array.isArray(machine.procesos_ids)) {
            return machine.procesos_ids.includes(process.id);
          }
          return false;
        });
        
        if (machinesWithThisProcess.length > 0) {
          addLog(`   Proceso ${process.id}: Encontrado en ${machinesWithThisProcess.length} máquinas (relación inversa)`);
          machineIds = machinesWithThisProcess.map(m => m.id);
        }
        
        // ESTRATEGIA 2: Buscar en maquinas_asignadas del proceso (por si acaso)
        if (machineIds.length === 0 && process.maquinas_asignadas) {
          addLog(`   Proceso ${process.id}: Buscando en maquinas_asignadas`);
          
          if (Array.isArray(process.maquinas_asignadas)) {
            machineIds = process.maquinas_asignadas;
          } else if (typeof process.maquinas_asignadas === 'string') {
            try {
              const parsed = JSON.parse(process.maquinas_asignadas);
              if (Array.isArray(parsed)) {
                machineIds = parsed;
              }
            } catch {
              machineIds = process.maquinas_asignadas
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
            }
          }
        }
        
        // ENCONTRAR DATOS COMPLETOS DE LAS MÁQUINAS
        const assignedMachines = machineIds
          .map(machineId => {
            const machine = machines.find(m => 
              m.id === machineId || 
              m._id === machineId
            );
            
            if (machine) {
              return {
                id: machine.id || machine._id,
                nombre: machine.nombre || machine.machine_nombre || `Máquina ${machineId}`,
                codigo: machine.codigo || machine.code,
                departamento: machine.departamento,
                estado: machine.estado,
                procesos_ids: machine.procesos_ids || []
              };
            }
            return null;
          })
          .filter(Boolean);
        
        return {
          ...process,
          nombre: process.nombre || process.proceso_nombre || `Proceso ${process.id}`,
          machineIds,
          assignedMachines,
          hasMachines: assignedMachines.length > 0,
          source: machinesWithThisProcess.length > 0 ? 'relación inversa' : 'maquinas_asignadas'
        };
      });
      
      setProcessesWithMachines(enrichedProcesses);
      
      // Estadísticas
      const withMachines = enrichedProcesses.filter(p => p.hasMachines).length;
      const viaInverse = enrichedProcesses.filter(p => p.source === 'relación inversa').length;
      
      addLog(`📊 Relación completada:`, {
        total_procesos: processes.length,
        con_maquinas: withMachines,
        sin_maquinas: processes.length - withMachines,
        via_relacion_inversa: viaInverse,
        via_maquinas_asignadas: withMachines - viaInverse,
        muestra_relaciones: enrichedProcesses
          .filter(p => p.hasMachines)
          .slice(0, 3)
          .map(p => ({
            nombre: p.nombre,
            maquinas: p.assignedMachines.map(m => m.nombre),
            fuente: p.source
          }))
      });
    }
  }, [processes, machines]);

  // ============ FUNCIONES AUXILIARES ============
  const normalizeProcessName = (process) => {
    return process.nombre || process.proceso_nombre || `Proceso ${process.id}`;
  };

  const getProcessById = (id) => {
    return processesWithMachines.find(p => p.id === id);
  };

  // ============ ESTADOS DE CARGA ============
  if (processesLoading || machinesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-700">Cargando configuración de procesos...</h2>
          <p className="mt-2 text-gray-500">
            {processesLoading ? 'Cargando procesos...' : 'Cargando máquinas...'}
          </p>
          
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
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const selectedProcessData = getProcessById(selectedProcess);

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
                {processesWithMachines.length} procesos · {machines.length} máquinas
              </p>
              <p className="text-sm text-green-600 mt-1">
                ✅ Relación procesos-máquinas activa
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded">
                {processesWithMachines.filter(p => p.hasMachines).length}/{processesWithMachines.length} con máquinas
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                ↻ Actualizar
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
                <div className="text-3xl font-bold text-gray-900 mt-2">{processesWithMachines.length}</div>
                <div className="text-gray-400 text-xs mt-1">Total activos</div>
              </div>
              
              <div className="bg-white rounded-xl p-5 shadow border">
                <div className="text-gray-500 text-sm">Con máquinas</div>
                <div className="text-3xl font-bold text-blue-600 mt-2">
                  {processesWithMachines.filter(p => p.hasMachines).length}
                </div>
                <div className="text-gray-400 text-xs mt-1">Relacionados</div>
              </div>
              
              <div className="bg-white rounded-xl p-5 shadow border">
                <div className="text-gray-500 text-sm">Máquinas</div>
                <div className="text-3xl font-bold text-green-600 mt-2">
                  {machines.length}
                </div>
                <div className="text-gray-400 text-xs mt-1">En sistema</div>
              </div>
              
              <div className="bg-white rounded-xl p-5 shadow border">
                <div className="text-gray-500 text-sm">Relaciones</div>
                <div className="text-3xl font-bold text-purple-600 mt-2">
                  {processesWithMachines.reduce((sum, p) => sum + p.assignedMachines.length, 0)}
                </div>
                <div className="text-gray-400 text-xs mt-1">Totales</div>
              </div>
            </div>

            {/* Process Selection */}
            <div className="bg-white rounded-xl shadow border p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Seleccionar Proceso</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar por nombre o máquina:
                </label>
                <input
                  type="text"
                  placeholder="Escribe para filtrar..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => {
                    // Implementar filtro si es necesario
                  }}
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar proceso para configurar:
                </label>
                <select
                  value={selectedProcess}
                  onChange={(e) => setSelectedProcess(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Selecciona un proceso --</option>
                  {processesWithMachines.map(process => (
                    <option key={process.id} value={process.id}>
                      {normalizeProcessName(process)}
                      {process.hasMachines && ` (${process.assignedMachines.length} máq.)`}
                      {!process.hasMachines && ' [Sin máquinas]'}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  {processesWithMachines.filter(p => p.hasMachines).length} procesos con máquinas asignadas
                </p>
              </div>
              
              {/* Selected Process Details */}
              {selectedProcessData && (
                <div className="border border-gray-200 rounded-xl p-5 bg-blue-50">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {normalizeProcessName(selectedProcessData)}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">ID del Proceso</div>
                      <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                        {selectedProcessData.id}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600">Estado</div>
                      <div>
                        <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                          selectedProcessData.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedProcessData.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600">Fuente de relación</div>
                      <div className="font-medium">
                        {selectedProcessData.source === 'relación inversa' ? '🔄 Relación inversa' : '📋 Directa'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600">Máquinas asignadas</div>
                      <div className="font-semibold">{selectedProcessData.assignedMachines.length}</div>
                    </div>
                  </div>
                  
                  {/* Máquinas asignadas */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Máquinas donde se puede realizar este proceso ({selectedProcessData.assignedMachines.length})
                    </h4>
                    
                    {selectedProcessData.hasMachines ? (
                      <div className="space-y-3">
                        {selectedProcessData.assignedMachines.map((machine, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <div className="font-medium text-gray-900">{machine.nombre}</div>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  {machine.codigo && (
                                    <div>Código: <span className="font-mono">{machine.codigo}</span></div>
                                  )}
                                  {machine.departamento && (
                                    <div>Departamento: {machine.departamento}</div>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    ID: {machine.id}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Procesos en esta máquina: {machine.procesos_ids?.length || 0}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                Compatible
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <span className="text-yellow-500 mr-2">⚠️</span>
                          <span className="text-yellow-800">
                            Este proceso no tiene máquinas asignadas.
                          </span>
                        </div>
                        <p className="text-sm text-yellow-600 mt-2">
                          Ninguna máquina tiene este proceso en su lista de procesos_ids.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Información de debug */}
                  <div className="border-t border-gray-300 pt-4">
                    <details className="border border-gray-200 rounded-lg overflow-hidden">
                      <summary className="cursor-pointer bg-gray-100 px-4 py-3 font-medium text-gray-700">
                        🔍 Ver información técnica del proceso
                      </summary>
                      <div className="p-4 bg-white">
                        <div className="text-sm font-medium text-gray-700 mb-2">Datos del proceso:</div>
                        <div className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-auto max-h-60">
                          <pre className="text-xs">
                            {JSON.stringify(selectedProcessData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              )}
            </div>

            {/* All Processes */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Todos los Procesos ({processesWithMachines.length})
                </h2>
                <div className="text-sm text-gray-500">
                  <span className="mr-2">Filtrar:</span>
                  <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded">
                    Todos
                  </button>
                  <button className="ml-2 px-3 py-1 bg-green-100 text-green-700 rounded">
                    Con máquinas
                  </button>
                  <button className="ml-2 px-3 py-1 bg-gray-100 text-gray-700 rounded">
                    Sin máquinas
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processesWithMachines.map(process => {
                  const isSelected = process.id === selectedProcess;
                  
                  return (
                    <div
                      key={process.id}
                      className={`border rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 shadow-lg' 
                          : process.hasMachines
                            ? 'border-green-200 bg-white hover:shadow-md hover:border-green-300'
                            : 'border-gray-200 bg-gray-50 hover:shadow hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedProcess(process.id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-gray-900">
                          {normalizeProcessName(process)}
                        </h3>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            process.activo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {process.activo ? 'Activo' : 'Inactivo'}
                          </span>
                          {process.hasMachines ? (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1">
                              <span>📟</span>
                              <span>{process.assignedMachines.length} máq.</span>
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              Sin máquinas
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                          <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded inline-block">
                            ID: {process.id.substring(0, 10)}...
                          </div>
                        </div>
                        
                        {process.hasMachines ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-700 mb-1">Máquinas compatibles:</div>
                            <div className="flex flex-wrap gap-1">
                              {process.assignedMachines.slice(0, 2).map((machine, idx) => (
                                <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  {machine.nombre.substring(0, 15)}
                                  {process.assignedMachines.length > 2 && idx === 1 && ` +${process.assignedMachines.length - 2}`}
                                </span>
                              ))}
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              Fuente: {process.source}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">
                            No se encontraron máquinas compatibles
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Debug & Info */}
          <div>
            {/* Debug Console */}
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
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data).substring(0, 100)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <h3 className="font-bold text-gray-900 mb-3">💻 Información Técnica</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-gray-700">Estrategia usada:</div>
                  <div className="text-gray-600">
                    <span className="font-semibold">🔄 Relación inversa</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Busca en <code>procesos_ids</code> de las máquinas para encontrar qué procesos pueden realizar.
                  </p>
                </div>
                
                <div>
                  <div className="font-medium text-gray-700">Método de carga:</div>
                  <code className="bg-gray-100 p-1 rounded text-xs block mt-1">
                    base44.entities.Process.filter(&#123; activo: true &#125;)
                  </code>
                </div>
                
                <div>
                  <div className="font-medium text-gray-700">Igual que:</div>
                  <div className="text-gray-600">MachineDailyPlanning.jsx</div>
                </div>
                
                <button
                  onClick={() => {
                    console.log("=== ANÁLISIS COMPLETO ===");
                    console.log("Procesos con máquinas:", processesWithMachines);
                    console.log("Máquinas:", machines);
                    
                    // Análisis de relaciones
                    const analysis = processesWithMachines.map(p => ({
                      nombre: p.nombre,
                      id: p.id,
                      tieneMaquinas: p.hasMachines,
                      cantidadMaquinas: p.assignedMachines.length,
                      maquinas: p.assignedMachines.map(m => m.nombre),
                      fuente: p.source
                    }));
                    
                    console.log("Análisis de relaciones:", analysis);
                  }}
                  className="w-full mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Ver análisis en consola
                </button>
              </div>
            </div>
            
            {/* Success Panel */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-green-600 text-xl">✅</span>
                <h3 className="font-bold text-green-800">¡Problema resuelto!</h3>
              </div>
              <div className="space-y-2 text-green-700 text-sm">
                <p><strong>Antes:</strong> ProcessConfiguration no encontraba procesos.</p>
                <p><strong>Ahora:</strong> Carga {processesWithMachines.length} procesos con sus máquinas.</p>
                <p><strong>Solución:</strong> Usar relación inversa (procesos_ids en máquinas).</p>
              </div>
            </div>
            
            {/* Help */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="font-bold text-blue-900 mb-2">ℹ️ Cómo funciona</h3>
              <ul className="text-blue-800 text-sm space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">1.</span>
                  <span>Las máquinas tienen <code>procesos_ids</code> con IDs de procesos</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">2.</span>
                  <span>Se busca qué máquinas incluyen cada proceso en su lista</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">3.</span>
                  <span>Se muestra la relación proceso → máquinas compatibles</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessConfiguration;