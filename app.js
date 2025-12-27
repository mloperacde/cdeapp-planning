// app.js - Punto de entrada principal para Base44
// Este archivo será compilado por Base44

// Importa tus servicios (Base44 manejará las rutas durante la compilación)
import { 
  machineService, 
  processService, 
  assignmentService,
  serviceUtils,
  SERVICE_CONSTANTS 
} from './src/services/index.js';

// Inicializa la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Aplicación Base44 iniciada');
  
  // Hacer servicios disponibles globalmente para depuración
  window.AppServices = {
    machineService,
    processService,
    assignmentService,
    serviceUtils,
    SERVICE_CONSTANTS,
    
    // Función de prueba
    test: async () => {
      console.log('🧪 Probando servicios...');
      
      try {
        // Probar machineService
        if (machineService.getMachines) {
          const machines = await machineService.getMachines();
          console.log('✅ machineService.getMachines:', machines);
        }
        
        // Probar processService
        if (processService.getProcesses) {
          const processes = await processService.getProcesses();
          console.log('✅ processService.getProcesses:', processes);
        }
        
        return { success: true, message: 'Pruebas completadas' };
      } catch (error) {
        console.error('❌ Error en pruebas:', error);
        return { success: false, error: error.message };
      }
    }
  };
  
  console.log('✅ Servicios cargados:', Object.keys(window.AppServices));
  
  // Inicializar interfaz de usuario
  initUI();
});

// Función para inicializar la interfaz
function initUI() {
  const appElement = document.getElementById('app');
  if (!appElement) {
    console.error('❌ No se encontró el elemento #app');
    return;
  }
  
  appElement.innerHTML = `
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Aplicación Base44</h1>
      <div class="bg-white shadow rounded-lg p-4">
        <p class="mb-4">Servicios cargados correctamente.</p>
        <button 
          onclick="window.AppServices.test()" 
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Probar Servicios
        </button>
        <div id="test-results" class="mt-4"></div>
      </div>
    </div>
  `;
}

// Función para mostrar resultados de prueba
window.showTestResults = function(results) {
  const resultsElement = document.getElementById('test-results');
  if (resultsElement) {
    resultsElement.innerHTML = `
      <div class="mt-4 p-3 ${results.success ? 'bg-green-100' : 'bg-red-100'} rounded">
        <strong>${results.success ? '✅ Éxito' : '❌ Error'}:</strong> 
        ${results.message || 'Prueba completada'}
      </div>
    `;
  }
};

// Export para que Base44 pueda compilar correctamente
export default {
  machineService,
  processService,
  assignmentService,
  serviceUtils,
  SERVICE_CONSTANTS
};
