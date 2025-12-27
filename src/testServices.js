// src/testServices.js (temporal, eliminar después)
import { machineService, processService } from './services';

async function testServices() {
  console.log('=== Probando servicios ===');
  
  try {
    // Probar machineService
    console.log('1. Probando machineService.list()...');
    const machines = await machineService.list('orden');
    console.log(`✓ Máquinas obtenidas: ${machines.length}`);
    
    // Probar processService  
    console.log('2. Probando processService.list()...');
    const processes = await processService.list();
    console.log(`✓ Procesos obtenidos: ${processes.length}`);
    
    console.log('=== Todos los servicios funcionan correctamente ===');
  } catch (error) {
    console.error('✗ Error probando servicios:', error);
  }
}

// Ejecutar prueba
testServices();
