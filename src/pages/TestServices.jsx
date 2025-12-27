import React, { useState, useEffect } from 'react';
import { machineService, processService, assignmentService } from '@/services';

export default function TestServices() {
  const [testResults, setTestResults] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [stats, setStats] = useState({});

  const runAllTests = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    try {
      const results = [];

      // Test 1: Obtener todas las máquinas
      results.push({ test: '1. Obtener todas las máquinas', status: 'running' });
      setTestResults([...results]);
      
      try {
        const machines = await machineService.getAllMachines();
        results[0] = { 
          test: '1. Obtener todas las máquinas', 
          status: 'success', 
          data: `${machines.length} máquinas encontradas`,
          details: machines.slice(0, 3).map(m => ({ id: m.id, nombre: m.nombre, codigo: m.codigo }))
        };
      } catch (error) {
        results[0] = { 
          test: '1. Obtener todas las máquinas', 
          status: 'error', 
          data: `Error: ${error.message}`
        };
      }
      setTestResults([...results]);

      // Test 2: Obtener todos los procesos
      results.push({ test: '2. Obtener todos los procesos', status: 'running' });
      setTestResults([...results]);
      
      try {
        const processes = await processService.getAllProcesses();
        results[1] = { 
          test: '2. Obtener todos los procesos', 
          status: 'success', 
          data: `${processes.length} procesos encontrados`,
          details: processes.slice(0, 3).map(p => ({ id: p.id, nombre: p.nombre, codigo: p.codigo }))
        };
      } catch (error) {
        results[1] = { 
          test: '2. Obtener todos los procesos', 
          status: 'error', 
          data: `Error: ${error.message}`
        };
      }
      setTestResults([...results]);

      // Test 3: Obtener todas las asignaciones
      results.push({ test: '3. Obtener todas las asignaciones', status: 'running' });
      setTestResults([...results]);
      
      try {
        const assignments = await assignmentService.getAllAssignments();
        results[2] = { 
          test: '3. Obtener todas las asignaciones', 
          status: 'success', 
          data: `${assignments.length} asignaciones encontradas`,
          details: assignments.slice(0, 3).map(a => ({ id: a.id, machine_id: a.machine_id, process_id: a.process_id }))
        };
      } catch (error) {
        results[2] = { 
          test: '3. Obtener todas las asignaciones', 
          status: 'error', 
          data: `Error: ${error.message}`
        };
      }
      setTestResults([...results]);

      // Test 4: Obtener estadísticas de asignaciones
      results.push({ test: '4. Obtener estadísticas', status: 'running' });
      setTestResults([...results]);
      
      try {
        const assignmentStats = await assignmentService.getAssignmentStats();
        results[3] = { 
          test: '4. Obtener estadísticas', 
          status: 'success', 
          data: JSON.stringify(assignmentStats, null, 2)
        };
        setStats(assignmentStats);
      } catch (error) {
        results[3] = { 
          test: '4. Obtener estadísticas', 
          status: 'error', 
          data: `Error: ${error.message}`
        };
      }
      setTestResults([...results]);

      // Test 5: Validar asignaciones
      results.push({ test: '5. Validar consistencia', status: 'running' });
      setTestResults([...results]);
      
      try {
        const validation = await assignmentService.validateAssignments();
        results[4] = { 
          test: '5. Validar consistencia', 
          status: 'success', 
          data: `${validation.issuesCount} problemas encontrados`,
          details: validation.issues.slice(0, 3)
        };
      } catch (error) {
        results[4] = { 
          test: '5. Validar consistencia', 
          status: 'error', 
          data: `Error: ${error.message}`
        };
      }
      setTestResults([...results]);

      console.log('✅ Todas las pruebas completadas');
    } catch (error) {
      console.error('❌ Error general en pruebas:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // Ejecutar automáticamente al cargar
  useEffect(() => {
    runAllTests();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '🔄';
      default: return '⏳';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pruebas de Servicios</h1>
          <p className="text-gray-600">Verificación de los servicios de máquinas y procesos</p>
        </div>
        <button
          onClick={runAllTests}
          disabled={isTesting}
          className={`px-4 py-2 rounded font-medium ${
            isTesting 
              ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isTesting ? 'Ejecutando pruebas...' : 'Ejecutar todas las pruebas'}
        </button>
      </div>

      {/* Resultados de pruebas */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Resultados de las Pruebas</h2>
        
        {testResults.map((result, index) => (
          <div 
            key={index}
            className={`p-4 border rounded-lg ${getStatusColor(result.status)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getStatusIcon(result.status)}</span>
                <span className="font-medium">{result.test}</span>
              </div>
              <span className={`text-sm px-2 py-1 rounded ${
                result.status === 'success' ? 'bg-green-100 text-green-800' :
                result.status === 'error' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {result.status === 'success' ? 'Éxito' : 
                 result.status === 'error' ? 'Error' : 
                 result.status === 'running' ? 'En progreso' : 'Pendiente'}
              </span>
            </div>
            
            <div className="mt-2">
              <p className="text-sm">{result.data}</p>
              
              {result.details && result.details.length > 0 && (
                <div className="mt-2 text-xs">
                  <p className="font-medium mb-1">Detalles:</p>
                  <pre className="bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Estadísticas */}
      {Object.keys(stats).length > 0 && (
        <div className="p-4 border rounded-lg bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Estadísticas Generales</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-white rounded shadow">
              <p className="text-sm text-gray-500">Total Asignaciones</p>
              <p className="text-2xl font-bold">{stats.total || 0}</p>
            </div>
            <div className="p-3 bg-white rounded shadow">
              <p className="text-sm text-gray-500">Máquinas Únicas</p>
              <p className="text-2xl font-bold">{stats.uniqueMachines || 0}</p>
            </div>
            <div className="p-3 bg-white rounded shadow">
              <p className="text-sm text-gray-500">Procesos Únicos</p>
              <p className="text-2xl font-bold">{stats.uniqueProcesses || 0}</p>
            </div>
            <div className="p-3 bg-white rounded shadow">
              <p className="text-sm text-gray-500">Promedio por Máquina</p>
              <p className="text-2xl font-bold">
                {stats.averagePerMachine ? stats.averagePerMachine.toFixed(1) : '0'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comandos de consola para probar manualmente */}
      <div className="p-4 border rounded-lg bg-yellow-50">
        <h2 className="text-xl font-semibold mb-2">Pruebas en Consola</h2>
        <p className="text-gray-600 mb-3">
          También puedes probar los servicios directamente en la consola del navegador:
        </p>
        
        <div className="space-y-2">
          <pre className="bg-gray-800 text-green-300 p-3 rounded text-sm overflow-x-auto">
            {`// Abre la consola (F12) y prueba estos comandos:
            
// 1. Obtener todas las máquinas
await machineService.getAllMachines().then(r => console.log('Máquinas:', r))

// 2. Obtener todos los procesos  
await processService.getAllProcesses().then(r => console.log('Procesos:', r))

// 3. Obtener estadísticas
await assignmentService.getAssignmentStats().then(r => console.log('Estadísticas:', r))

// 4. Probar un servicio específico con una máquina existente
// (Reemplaza 'MACHINE_ID' con un ID real)
const machineId = 'TU_MACHINE_ID_AQUI'
await machineService.getMachineWithProcesses(machineId).then(r => console.log('Máquina con procesos:', r))`}
          </pre>
        </div>
      </div>
    </div>
  );
}
