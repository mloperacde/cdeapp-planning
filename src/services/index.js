// src/services/index.js
// Asegúrate de que TODAS las dependencias estén definidas aquí

// === MACHINE SERVICE ===
export const machineService = {
  async getMachines(params = {}) {
    console.log('🔧 machineService.getMachines llamado');
    
    // Simulación para desarrollo
    if (window.location.hostname.includes('base44')) {
      // En Base44, podrías hacer una petición real
      try {
        const response = await fetch('/api/machines', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        return {
          success: true,
          data,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Error en machineService:', error);
        return {
          success: false,
          message: 'Error al obtener máquinas',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    } else {
      // Datos de ejemplo para desarrollo
      return {
        success: true,
        data: [
          { id: 1, name: 'Máquina 1', status: 'active' },
          { id: 2, name: 'Máquina 2', status: 'maintenance' },
          { id: 3, name: 'Máquina 3', status: 'active' }
        ],
        timestamp: new Date().toISOString()
      };
    }
  },
  
  async createMachine(data) {
    console.log('📝 Creando máquina:', data);
    return {
      success: true,
      data: { id: Date.now(), ...data },
      message: 'Máquina creada exitosamente',
      timestamp: new Date().toISOString()
    };
  }
};

// === PROCESS SERVICE ===
export const processService = {
  async getProcesses() {
    return {
      success: true,
      data: [
        { id: 1, name: 'Proceso A', status: 'running' },
        { id: 2, name: 'Proceso B', status: 'pending' }
      ],
      timestamp: new Date().toISOString()
    };
  }
};

// === ASSIGNMENT SERVICE ===
export const assignmentService = {
  async getAssignments() {
    return {
      success: true,
      data: [
        { id: 1, task: 'Asignación 1', assignedTo: 'Usuario A' },
        { id: 2, task: 'Asignación 2', assignedTo: 'Usuario B' }
      ],
      timestamp: new Date().toISOString()
    };
  }
};

// === SERVICE UTILITIES ===
export const serviceUtils = {
  formatError(error, serviceName = 'servicio') {
    return {
      success: false,
      message: `Error en ${serviceName}: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  },
  
  formatSuccess(data, message = 'Operación exitosa') {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
  },
  
  validateRequired(data, requiredFields) {
    const missing = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );
    
    if (missing.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missing.join(', ')}`);
    }
  }
};

// === CONSTANTS ===
export const SERVICE_CONSTANTS = {
  MAX_RETRIES: 3,
  TIMEOUT: 30000,
  CACHE_DURATION: 5 * 60 * 1000,
  BATCH_SIZE: 50,
  DEFAULT_PAGINATION: {
    page: 1,
    limit: 20
  }
};
