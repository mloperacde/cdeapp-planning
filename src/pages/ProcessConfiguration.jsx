import React, { useState, useEffect } from 'react';

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

  // ESTRATEGIA PRINCIPAL: Usar la misma forma que MachineDailyPlanning
  useEffect(() => {
    const loadData = async () => {
      addLog("🚀 Iniciando carga de datos...");
      
      try {
        // ESTRATEGIA 1: Buscar en window o global scope (como hace MachineDailyPlanning)
        addLog("🔍 Buscando métodos de carga existentes...");
        
        // Intentar encontrar cómo MachineDailyPlanning carga los datos
        const possibleDataSources = [
          window.base44Data,
          window.machinesData,
          window.appData,
          window.globalData
        ];
        
        let foundData = null;
        for (const source of possibleDataSources) {
          if (source && (Array.isArray(source) || (source.data && Array.isArray(source.data)))) {
            foundData = source;
            addLog(`✅ Datos encontrados en window.${Object.keys(window).find(key => window[key] === source)}`);
            break;
          }
        }
        
        // ESTRATEGIA 2: Buscar en localStorage con las claves que vimos en los logs
        if (!foundData) {
          addLog("🔍 Buscando en localStorage...");
          
          // Claves basadas en los logs anteriores
          const localStorageKeys = [
            'base44_machines_cache',
            'machines_cache',
            'production_data',
            'app_machines_data',
            'cached_machines'
          ];
          
          for (const key of localStorageKeys) {
            try {
              const stored = localStorage.getItem(key);
              if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) || (parsed.data && Array.isArray(parsed.data))) {
                  foundData = parsed;
                  addLog(`✅ Datos encontrados en localStorage.${key}`);
                  break;
                }
              }
            } catch (error) {
              addLog(`❌ Error al leer ${key}: ${error.message}`);
            }
          }
        }
        
        // ESTRATEGIA 3: Buscar eventos o estado global de React
        if (!foundData) {
          addLog("🔍 Verificando eventos personalizados...");
          
          // Crear un evento para solicitar datos a otros componentes
          const dataRequestEvent = new CustomEvent('requestMachinesData', {
            detail: { requester: 'ProcessConfiguration' }
          });
          window.dispatchEvent(dataRequestEvent);
          
          // Escuchar respuesta
          const handleDataResponse = (event) => {
            if (event.detail && event.detail.machines) {
              foundData = event.detail.machines;
              addLog("✅ Datos recibidos via evento personalizado");
            }
          };
          
          window.addEventListener('machinesDataResponse', handleDataResponse);
          
          // Esperar un momento por respuesta
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          window.removeEventListener('machinesDataResponse', handleDataResponse);
        }
        
        // ESTRATEGIA 4: Usar el mismo método que MachineDailyPlanning
        if (!foundData) {
          addLog("🔍 Intentando método directo...");
          
          // Buscar cualquier función global que pueda cargar máquinas
          if (window.loadMachines && typeof window.loadMachines === 'function') {
            try {
              foundData = await window.loadMachines();
              addLog("✅ Datos cargados con window.loadMachines()");
            } catch (error) {
              addLog(`❌ Error en window.loadMachines: ${error.message}`);
            }
          }
        }
        
        // PROCESAR LOS DATOS ENCONTRADOS
        let machinesData = [];
        if (foundData) {
          machinesData = Array.isArray(foundData) ? foundData : 
                        (foundData.data ? foundData.data : []);
          setMachines(machinesData);
          addLog(`📊 ${machinesData.length} máquinas procesadas`);
        }
        
        // EXTRAER PROCESOS DE LAS MÁQUINAS
        const extractedProcesses = [];
        
        if (machinesData.length > 0) {
          addLog(`🔧 Extrayendo procesos de ${machinesData.length} máquinas...`);
          
          machinesData.forEach((machine, index) => {
            const machineId = machine._id || machine.id || `machine_${index}`;
            const machineName = machine.nombre || machine.name || `Máquina ${index + 1}`;
            
            // 1. procesos_ids (visto en logs)
            if (machine.procesos_ids && Array.isArray(machine.procesos_ids)) {
              addLog(`   📍 ${machineName}: ${machine.procesos_ids.length} procesos_ids`);
              
              machine.procesos_ids.forEach((procId, procIndex) => {
                extractedProcesses.push({
                  id: `${machineId}_proc_${procId}`,
                  name: `Proceso ${procIndex + 1} de ${machineName}`,
                  code: `PROC_${machineId.substring(0, 8)}_${procIndex}`,
                  category: machine.categoria || machine.department || "General",
                  time: "60 min",
                  status: "active",
                  machineId,
                  machineName,
                  proceso_id: procId,
                  source: 'procesos_ids'
                });
              });
            }
            
            // 2. procesos directos
            if (machine.procesos && Array.isArray(machine.procesos)) {
              addLog(`   📍 ${machineName}: ${machine.procesos.length} procesos directos`);
              
              machine.procesos.forEach((proc, procIndex) => {
                extractedProcesses.push({
                  id: proc._id || `${machineId}_proc_${procIndex}`,
                  name: proc.nombre || proc.name || `Proceso ${procIndex + 1}`,
                  code: proc.codigo || proc.code || `CODE_${machineId.substring(0, 8)}_${procIndex}`,
                  category: proc.categoria || proc.category || "General",
                  time: proc.tiempo || proc.time || proc.duracion || "60 min",
                  status: proc.estado || proc.status || "active",
                  machineId,
                  machineName,
                  source: 'procesos_directos',
                  rawProcess: proc
                });
              });
            }
            
            // 3. Si no tiene procesos, crear uno genérico
            if (!machine.procesos_ids && !machine.procesos) {
              extractedProcesses.push({
                id: `${machineId}_default`,
                name: `Operación en ${machineName}`,
                code: `OP_${machineId.substring(0, 8)}`,
                category: "Operación",
                time: "45 min",
                status: "active",
                machineId,
                machineName,
                source: 'generico'
              });
            }
          });
          
          addLog(`✅ ${extractedProcesses.length} procesos extraídos`);
        }
        
        // SI NO HAY DATOS, USAR DATOS DE EJEMPLO BASADOS EN LOGS ANTERIORES
        if (extractedProcesses.length === 0) {
          addLog("📝 Creando datos de ejemplo basados en logs anteriores...");
          
          // Basado en los logs, sabemos que estas máquinas tienen procesos:
          const exampleMachinesFromLogs = [
            {
              id: '690fd745ee779e5d766ff56d',
              name: 'Máquina con 2 procesos (vista en logs)',
              procesos_ids: ['proc_1', 'proc_2']
            },
            {
              id: '690f96625f43239a040dee87',
              name: 'Máquina con 2 procesos',
              procesos_ids: ['proc_3', 'proc_4']
            },
            {
              id: '690fa9b20dc3e5b338986064',
              name: 'Máquina con 2 procesos',
              procesos_ids: ['proc_5', 'proc_6']
            },
            {
              id: '690faa3392aee0df00a036af',
              name: 'FRASCOS AV 48 2019 (1C) - 3 procesos',
              procesos_ids: ['proc_7', 'proc_8', 'proc_9']
            }
          ];
          
          exampleMachinesFromLogs.forEach((machine, index) => {
            machine.procesos_ids?.forEach((procId, procIndex) => {
              extractedProcesses.push({
                id: `${machine.id}_${procId}`,
                name: `Proceso ${procIndex + 1} de ${machine.name}`,
                code: `LOG_${machine.id.substring(0, 8)}_${procIndex}`,
                category: index === 3 ? "Frasco" : "General",
                time: index === 3 ? "45 min" : "60 min",
                status: "active",
                machineId: machine.id,
                machineName: machine.name,
                source: 'logs_previos',
                isFromLogs: true
              });
            });
          });
          
          addLog(`📝 ${extractedProcesses.length} procesos de ejemplo creados`);
        }
        
        setProcesses(extractedProcesses);
        addLog(`🎉 Carga completada: ${machinesData.length} máquinas, ${extractedProcesses.length} procesos`);
        
      } catch (error) {
        addLog(`💥 Error crítico: ${error.message}`);
        
        // Datos de emergencia mínimos
        setProcesses([
          {
            id: 'emerg_1',
            name: 'Proceso de emergencia',
            code: 'EMERG_001',
            category: 'General',
            time: '30 min',
            status: 'active',
            source: 'emergencia'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleProcessSelect = (e) => {
    setSelectedProcess(e.target.value);
  };

  const forceReloadFromMachineDailyPlanning = () => {
    addLog("🔄 Forzando carga desde MachineDailyPlanning...");
    
    // Intentar disparar el método de carga de MachineDailyPlanning
    if (window.loadMachineDailyData) {
      window.loadMachineDailyData();
      addLog("✅ loadMachineDailyData ejecutado");
    }
    
    // También podemos intentar recargar la página con un parámetro
    setTimeout(() => {
      window.location.href = window.location.pathname + '?forceReload=true';
    }, 1000);
  };

  const inspectMachineDailyPlanning = () => {
    addLog("🔍 Inspeccionando MachineDailyPlanning...");
    
    // Abrir consola y mostrar métodos disponibles
    console.log("=== INSPECCIÓN MACHINE DAILY PLANNING ===");
    console.log("Funciones globales:", Object.keys(window).filter(key => 
      typeof window[key] === 'function' && 
      (key.includes('machine') || key.includes('load') || key.includes('data'))
    ));
    
    console.log("Variables globales:", Object.keys(window).filter(key => 
      !(typeof window[key] === 'function') && 
      (key.includes('machine') || key.includes('data') || key.includes('cache'))
    ));
    
    addLog("✅ Consola abierta con información de inspección");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-700">Cargando configuración...</h2>
          <p className="mt-2 text-gray-500">Buscando datos en el sistema</p>
          
          <div className="mt-6 max-w-md mx-auto bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Últimos logs:</h3>
            <div className="space-y-1 text-left">
              {debugLog.slice(0, 3).map((log, idx) => (
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

  const selectedProcessData = processes.find(p => p.id === selectedProcess);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configuración de Procesos</h1>
              <p className="text-gray-600 mt-2">
                Sistema basado en datos de máquinas · {processes.length} procesos disponibles
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={forceReloadFromMachineDailyPlanning}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Sincronizar con Planning
              </button>
              <button
                onClick={inspectMachineDailyPlanning}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
              >
                Inspeccionar
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Recargar
              </button>
            </div>
          </div>
          
          {/* Warning Alert */}
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Modo limitado</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>ProcessConfiguration no puede acceder directamente a la API. </p>
                  <p className="mt-1">
                    <strong>Solución:</strong> Usar los mismos métodos que MachineDailyPlanning.jsx
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="text-sm text-gray-500">Procesos</div>
                <div className="text-2xl font-bold text-gray-900">{processes.length}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="text-sm text-gray-500">Máquinas</div>
                <div className="text-2xl font-bold text-gray-900">{machines.length}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="text-sm text-gray-500">Fuente</div>
                <div className="text-2xl font-bold text-gray-900">
                  {processes.filter(p => p.isFromLogs).length > 0 ? 'Logs' : 'Datos'}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="text-sm text-gray-500">Estado</div>
                <div className="text-2xl font-bold text-green-600">✓</div>
              </div>
            </div>

            {/* Process Selection */}
            <div className="bg-white rounded-lg shadow border p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Seleccionar Proceso</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proceso:
                </label>
                <select
                  value={selectedProcess}
                  onChange={handleProcessSelect}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">-- Seleccionar --</option>
                  {processes.map(process => (
                    <option key={process.id} value={process.id}>
                      {process.name} 
                      {process.machineName && ` (${process.machineName})`}
                      {process.isFromLogs && ' [Logs]'}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedProcessData && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h3 className="font-bold text-gray-900 mb-2">Detalles</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Nombre</div>
                      <div className="font-medium">{selectedProcessData.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Código</div>
                      <div className="font-medium font-mono">{selectedProcessData.code}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Categoría</div>
                      <div className="font-medium">{selectedProcessData.category}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Tiempo</div>
                      <div className="font-medium">{selectedProcessData.time}</div>
                    </div>
                    {selectedProcessData.machineName && (
                      <div className="col-span-2">
                        <div className="text-sm text-gray-600">Máquina</div>
                        <div className="font-medium">{selectedProcessData.machineName}</div>
                      </div>
                    )}
                    <div className="col-span-2">
                      <div className="text-sm text-gray-600">Fuente</div>
                      <div className="font-medium">{selectedProcessData.source}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* All Processes */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Procesos Disponibles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processes.map(process => (
                  <div 
                    key={process.id}
                    className={`border rounded-lg p-4 ${process.id === selectedProcess ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
                    onClick={() => setSelectedProcess(process.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900">{process.name}</h3>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                        {process.status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {process.code}
                        </code>
                        <span className="text-xs text-gray-500">{process.category}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        ⏱️ {process.time} {process.machineName && `· 📟 ${process.machineName}`}
                      </div>
                      {process.source && (
                        <div className="text-xs text-gray-400">
                          Fuente: {process.source}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Debug */}
          <div>
            <div className="bg-gray-900 text-white rounded-lg p-5 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Log de Actividad</h3>
                <button
                  onClick={() => setDebugLog([])}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Limpiar
                </button>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {debugLog.map((log, index) => (
                  <div key={index} className="border-b border-gray-800 pb-2">
                    <div className="text-cyan-300 text-xs">[{log.time}]</div>
                    <div className="text-sm">{log.message}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Help */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="font-bold text-gray-900 mb-3">🚨 Problema conocido</h3>
              <p className="text-sm text-gray-600 mb-4">
                ProcessConfiguration no puede acceder a la API debido a CORS.
                MachineDailyPlanning SÍ funciona porque usa un método diferente.
              </p>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">Solución rápida:</div>
                  <ol className="text-sm text-gray-600 mt-1 space-y-1">
                    <li>1. Abre MachineDailyPlanning</li>
                    <li>2. Abre consola (F12)</li>
                    <li>3. Busca cómo carga los datos</li>
                    <li>4. Copia ese método aquí</li>
                  </ol>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-700">Para desarrollar:</div>
                  <button
                    onClick={() => {
                      console.log("=== MÉTODOS DISPONIBLES ===");
                      console.log("Funciones:", Object.keys(window).filter(k => typeof window[k] === 'function'));
                      console.log("Variables:", Object.keys(window).filter(k => 
                        k.includes('data') || k.includes('machine') || k.includes('cache')
                      ));
                    }}
                    className="mt-2 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Ver métodos en consola
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessConfiguration;