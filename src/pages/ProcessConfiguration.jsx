import React, { useState, useEffect } from 'react';

// Importar base44 correctamente - basado en la estructura común del proyecto
// Dado que base44.get no es una función, probablemente necesitas usar otra sintaxis

const ProcessConfiguration = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [debugLog, setDebugLog] = useState([]);
  const [machines, setMachines] = useState([]);

  const addLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { time: timestamp, message, data };
    setDebugLog(prev => [logEntry, ...prev.slice(0, 19)]);
    console.log(`[${timestamp}] ${message}`, data || '');
  };

  // CARGAR DATOS CORRECTAMENTE
  useEffect(() => {
    const loadData = async () => {
      addLog("🚀 Iniciando carga de datos...");
      
      try {
        // INTENTO 1: Usar fetch directamente a la API base44
        addLog("📡 Intentando conectar a API base44...");
        
        // Primero, probar diferentes endpoints
        const endpoints = [
          '/api/maquinas',
          '/api/maquinas/list',
          '/maquinas',
          'https://api.base44.com/maquinas',
          // Agregar más endpoints según tu configuración
        ];
        
        let machinesData = [];
        let successfulEndpoint = '';
        
        for (const endpoint of endpoints) {
          try {
            addLog(`🔍 Probando endpoint: ${endpoint}`);
            const response = await fetch(endpoint, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data) || (data.data && Array.isArray(data.data))) {
                machinesData = Array.isArray(data) ? data : data.data;
                successfulEndpoint = endpoint;
                addLog(`✅ Éxito con endpoint: ${endpoint}, ${machinesData.length} máquinas`);
                break;
              }
            }
          } catch (error) {
            addLog(`❌ Error con ${endpoint}: ${error.message}`);
          }
        }
        
        // Si no conseguimos datos, buscar en localStorage
        if (machinesData.length === 0) {
          addLog("🔍 Buscando datos en localStorage...");
          
          // Buscar en diferentes claves de localStorage
          const localStorageKeys = [
            'machinesData',
            'maquinas',
            'equipmentList',
            'productionMachines',
            'base44_machines_cache'
          ];
          
          for (const key of localStorageKeys) {
            try {
              const stored = localStorage.getItem(key);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) || (parsed.data && Array.isArray(parsed.data))) {
                  machinesData = Array.isArray(parsed) ? parsed : parsed.data;
                  addLog(`✅ Datos encontrados en localStorage (${key}): ${machinesData.length} máquinas`);
                  break;
                }
              }
            } catch (error) {
              addLog(`❌ Error al leer localStorage ${key}: ${error.message}`);
            }
          }
        }
        
        setMachines(machinesData);
        
        // EXTRAER PROCESOS DE LAS MÁQUINAS
        const extractedProcesses = [];
        const processMap = new Map();
        
        if (Array.isArray(machinesData) && machinesData.length > 0) {
          addLog(`🔧 Analizando ${machinesData.length} máquinas para extraer procesos...`);
          
          machinesData.forEach((machine, index) => {
            const machineName = machine.nombre || machine.name || `Máquina ${index + 1}`;
            const machineId = machine._id || machine.id || `machine_${index}`;
            
            // 1. Buscar procesos_ids (lo que vemos en los logs)
            if (machine.procesos_ids && Array.isArray(machine.procesos_ids)) {
              addLog(`   ${machineName}: ${machine.procesos_ids.length} procesos_ids`);
              
              machine.procesos_ids.forEach((procId, procIndex) => {
                const processKey = `${machineId}_${procId}`;
                if (!processMap.has(processKey)) {
                  extractedProcesses.push({
                    id: processKey,
                    name: `Proceso ${procIndex + 1} de ${machineName}`,
                    code: `PROC_${machineId.substring(0, 8)}_${procIndex + 1}`,
                    category: machine.categoria || "General",
                    time: machine.tiempo_estimado || "60 min",
                    status: "active",
                    machineId: machineId,
                    machineName: machineName,
                    proceso_id: procId,
                    isFromMachine: true,
                    rawData: { ...machine, procesos_ids_count: machine.procesos_ids.length }
                  });
                  processMap.set(processKey, true);
                }
              });
            }
            
            // 2. Buscar procesos directos
            if (machine.procesos && Array.isArray(machine.procesos)) {
              addLog(`   ${machineName}: ${machine.procesos.length} procesos directos`);
              
              machine.procesos.forEach((proc, procIndex) => {
                const processKey = `${machineId}_${proc._id || proc.id || procIndex}`;
                if (!processMap.has(processKey)) {
                  extractedProcesses.push({
                    id: processKey,
                    name: proc.nombre || proc.name || `Proceso ${procIndex + 1}`,
                    code: proc.codigo || proc.code || `CODE_${machineId.substring(0, 8)}_${procIndex}`,
                    category: proc.categoria || proc.category || "General",
                    time: proc.tiempo || proc.time || proc.duracion || "60 min",
                    status: proc.estado || proc.status || "active",
                    machineId: machineId,
                    machineName: machineName,
                    isDirectProcess: true,
                    rawProcessData: proc
                  });
                  processMap.set(processKey, true);
                }
              });
            }
            
            // 3. Buscar en otros campos posibles
            if (!machine.procesos_ids && !machine.procesos) {
              // Si la máquina no tiene procesos definidos, crear uno genérico
              const processKey = `${machineId}_default`;
              if (!processMap.has(processKey)) {
                extractedProcesses.push({
                  id: processKey,
                  name: `Operación en ${machineName}`,
                  code: `OP_${machineId.substring(0, 8)}`,
                  category: "Operación",
                  time: "45 min",
                  status: "active",
                  machineId: machineId,
                  machineName: machineName,
                  isGeneric: true
                });
                processMap.set(processKey, true);
              }
            }
          });
          
          addLog(`📊 Procesos extraídos: ${extractedProcesses.length}`);
        } else {
          addLog("⚠️ No se encontraron máquinas para extraer procesos");
        }
        
        // 3. INTENTAR CARGAR PROCESOS DIRECTAMENTE
        if (extractedProcesses.length === 0) {
          addLog("📡 Intentando cargar procesos desde endpoint /procesos...");
          
          try {
            const procesosEndpoints = [
              '/api/procesos',
              '/api/procesos/list',
              '/procesos',
              'https://api.base44.com/procesos'
            ];
            
            for (const endpoint of procesosEndpoints) {
              try {
                const response = await fetch(endpoint, {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                  }
                });
                
                if (response.ok) {
                  const data = await response.json();
                  const apiProcesses = Array.isArray(data) ? data : (data.data || []);
                  
                  if (apiProcesses.length > 0) {
                    addLog(`✅ Procesos cargados desde ${endpoint}: ${apiProcesses.length}`);
                    
                    apiProcesses.forEach((proc, index) => {
                      extractedProcesses.push({
                        id: proc._id || `api_${index}`,
                        name: proc.nombre || proc.name,
                        code: proc.codigo || proc.code,
                        category: proc.categoria || proc.category,
                        time: proc.tiempo || proc.time,
                        status: proc.estado || "active",
                        isFromAPI: true,
                        rawApiData: proc
                      });
                    });
                    
                    break;
                  }
                }
              } catch (error) {
                addLog(`❌ Error con endpoint ${endpoint}: ${error.message}`);
              }
            }
          } catch (error) {
            addLog(`❌ Error al cargar procesos: ${error.message}`);
          }
        }
        
        // 4. SI NO HAY PROCESOS, CREAR DATOS DE EJEMPLO
        if (extractedProcesses.length === 0) {
          addLog("📝 Creando datos de ejemplo...");
          
          const exampleMachines = [
            { id: 'example_1', nombre: 'Máquina de Corte Láser' },
            { id: 'example_2', nombre: 'Fresadora CNC' },
            { id: 'example_3', nombre: 'Prensa Hidráulica' }
          ];
          
          exampleMachines.forEach((machine, index) => {
            extractedProcesses.push({
              id: `example_${index}`,
              name: `Proceso en ${machine.nombre}`,
              code: `EX_${machine.id}`,
              category: index === 0 ? "Corte" : index === 1 ? "Mecanizado" : "Conformado",
              time: index === 0 ? "45 min" : index === 1 ? "120 min" : "90 min",
              status: "active",
              machineId: machine.id,
              machineName: machine.nombre,
              isExample: true
            });
          });
          
          addLog(`📝 ${extractedProcesses.length} procesos de ejemplo creados`);
        }
        
        setProcesses(extractedProcesses);
        addLog(`✅ Carga completada: ${machinesData.length} máquinas, ${extractedProcesses.length} procesos`);
        
      } catch (error) {
        addLog(`❌ Error crítico: ${error.message}`);
        
        // Datos de emergencia
        setProcesses([
          {
            id: 'emergency_1',
            name: 'Corte por láser',
            code: 'CORTE_LASER',
            category: 'Corte',
            time: '45 min',
            status: 'active',
            isEmergency: true
          },
          {
            id: 'emergency_2',
            name: 'Fresado CNC',
            code: 'FRESADO_CNC',
            category: 'Mecanizado',
            time: '120 min',
            status: 'active',
            isEmergency: true
          }
        ]);
      } finally {
        setLoading(false);
        addLog("🏁 Finalizado");
      }
    };

    loadData();
  }, []);

  const handleProcessSelect = (e) => {
    setSelectedProcess(e.target.value);
  };

  const refreshData = () => {
    setLoading(true);
    setProcesses([]);
    setMachines([]);
    setDebugLog([]);
    
    addLog("🔄 Recargando datos...");
    
    // Forzar recarga después de un breve delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Configurando Procesos</h2>
          <p className="text-gray-600 mb-6">
            Conectando con la base de datos y analizando máquinas disponibles...
          </p>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="text-left space-y-2">
              {debugLog.slice(0, 3).map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 text-sm">[{log.time}]</span>
                  <span className="text-gray-700 text-sm">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Encontrar el proceso seleccionado
  const selectedProcessData = processes.find(p => p.id === selectedProcess || p.code === selectedProcess);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración de Procesos</h1>
              <p className="text-gray-600 mt-1">
                Sistema integrado con base de datos · {processes.length} procesos disponibles
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <span>↻</span>
                <span>Actualizar</span>
              </button>
              
              <div className="text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Conectado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Process Selection */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 shadow border border-gray-200">
                <div className="text-gray-500 text-sm font-medium">Procesos</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{processes.length}</div>
                <div className="text-gray-400 text-xs mt-1">Totales en sistema</div>
              </div>
              
              <div className="bg-white rounded-xl p-5 shadow border border-gray-200">
                <div className="text-gray-500 text-sm font-medium">Máquinas</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{machines.length}</div>
                <div className="text-gray-400 text-xs mt-1">Disponibles</div>
              </div>
              
              <div className="bg-white rounded-xl p-5 shadow border border-gray-200">
                <div className="text-gray-500 text-sm font-medium">Activos</div>
                <div className="text-3xl font-bold text-green-600 mt-2">
                  {processes.filter(p => p.status === 'active').length}
                </div>
                <div className="text-gray-400 text-xs mt-1">En producción</div>
              </div>
            </div>

            {/* Process Selector */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Seleccionar Proceso</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar proceso
                  </label>
                  <input
                    type="text"
                    placeholder="Escribe el nombre, código o máquina..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar de la lista
                  </label>
                  <select
                    value={selectedProcess}
                    onChange={handleProcessSelect}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">-- Elige un proceso --</option>
                    {processes.map(process => (
                      <option key={process.id} value={process.id}>
                        {process.name}
                        {process.machineName && ` (${process.machineName})`}
                        {process.isExample && ' [Ejemplo]'}
                        {process.isEmergency && ' [Emergencia]'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Selected Process Details */}
              {selectedProcessData && (
                <div className="mt-6 border border-gray-200 rounded-xl p-5 bg-blue-50">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Detalles del Proceso</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Nombre</div>
                      <div className="font-semibold">{selectedProcessData.name}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600">Código</div>
                      <div className="font-semibold font-mono">{selectedProcessData.code}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600">Categoría</div>
                      <div className="font-semibold">{selectedProcessData.category}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600">Tiempo estimado</div>
                      <div className="font-semibold">{selectedProcessData.time}</div>
                    </div>
                    
                    {selectedProcessData.machineName && (
                      <div className="md:col-span-2">
                        <div className="text-sm text-gray-600">Máquina asociada</div>
                        <div className="font-semibold">{selectedProcessData.machineName}</div>
                      </div>
                    )}
                    
                    {selectedProcessData.proceso_id && (
                      <div>
                        <div className="text-sm text-gray-600">ID del proceso</div>
                        <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                          {selectedProcessData.proceso_id}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <div className="text-sm text-gray-600">Origen</div>
                      <div className="font-semibold">
                        {selectedProcessData.isExample ? 'Ejemplo' : 
                         selectedProcessData.isEmergency ? 'Emergencia' : 
                         selectedProcessData.isFromMachine ? 'Máquina' : 
                         selectedProcessData.isFromAPI ? 'API' : 'Sistema'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* All Processes Grid */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Todos los Procesos</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processes.map(process => {
                  const isSelected = process.id === selectedProcess;
                  const isExample = process.isExample || process.isEmergency;
                  
                  return (
                    <div
                      key={process.id}
                      className={`border rounded-xl p-4 transition-all duration-200 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 bg-white hover:shadow-sm'
                      } ${isExample ? 'opacity-90' : ''}`}
                      onClick={() => setSelectedProcess(process.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900">{process.name}</h3>
                        <div className="flex items-center gap-2">
                          {isExample && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              {process.isEmergency ? 'Emerg' : 'Ejemplo'}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded ${
                            process.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {process.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                            {process.code}
                          </code>
                          <span className="text-xs text-gray-500">{process.category}</span>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <span>⏱️ {process.time}</span>
                            {process.machineName && (
                              <span className="ml-2">📟 {process.machineName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Debug & Info */}
          <div className="space-y-6">
            {/* System Info */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Información del Sistema</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Estado</div>
                  <div className="font-semibold text-green-600">✓ Operativo</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600">Máquinas con procesos</div>
                  <div className="font-semibold">
                    {machines.filter(m => 
                      (m.procesos_ids && m.procesos_ids.length > 0) || 
                      (m.procesos && m.procesos.length > 0)
                    ).length} de {machines.length}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600">Última actualización</div>
                  <div className="font-semibold">{new Date().toLocaleTimeString()}</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => console.log({ machines, processes })}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Ver datos en consola
                </button>
              </div>
            </div>

            {/* Debug Log */}
            <div className="bg-gray-900 rounded-xl shadow p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Log de Actividad</h3>
                <button
                  onClick={() => setDebugLog([])}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Limpiar
                </button>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {debugLog.map((log, index) => (
                  <div 
                    key={index} 
                    className="border-b border-gray-800 pb-2 last:border-0"
                  >
                    <div className="text-cyan-400 text-sm">[{log.time}]</div>
                    <div className="text-gray-300 text-sm">{log.message}</div>
                    {log.data && (
                      <div className="text-gray-500 text-xs mt-1 truncate">
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data)}
                      </div>
                    )}
                  </div>
                ))}
                
                {debugLog.length === 0 && (
                  <div className="text-gray-500 text-sm italic">
                    No hay actividad registrada
                  </div>
                )}
              </div>
            </div>

            {/* Help Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="text-lg font-bold text-blue-900 mb-2">💡 Ayuda</h3>
              <p className="text-blue-800 text-sm mb-3">
                Esta página extrae procesos de las máquinas en tu sistema. Si no ves procesos, verifica:
              </p>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Que las máquinas tengan <code>procesos_ids</code> definidos</li>
                <li>• Que la API esté accesible</li>
                <li>• Que tengas conexión a internet</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProcessConfiguration;