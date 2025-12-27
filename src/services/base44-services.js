// Base44-Specific Services Loader
// Este archivo maneja la carga especial para Base44

// Exporta servicios como objeto global primero
const Base44Services = {
  // Machine Service
  machineService: {
    async getMachines(params = {}) {
      console.log('[Base44] machineService.getMachines', params);
      
      // Tu implementación real aquí
      try {
        const query = new URLSearchParams(params).toString();
        const url = query ? `/api/machines?${query}` : '/api/machines';
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return {
          success: true,
          data: data,
          count: data.length,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Error al cargar máquinas',
          timestamp: new Date().toISOString()
        };
      }
    },
    
    async createMachine(data) {
      // Implementación
      return { success: true, message: 'Máquina creada' };
    }
  },
  
  // Process Service
  processService: {
    async getProcesses() {
      return { success: true, data: [] };
    }
  },
  
  // Assignment Service
  assignmentService: {
    async getAssignments() {
      return { success: true, data: [] };
    }
  },
  
  // Utils
  serviceUtils: {
    formatError: (error, serviceName) => ({
      success: false,
      message: `Error en ${serviceName}`,
      details: error.message,
      timestamp: new Date().toISOString()
    }),
    
    formatSuccess: (data, message) => ({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    })
  },
  
  // Constants
  SERVICE_CONSTANTS: {
    MAX_RETRIES: 3,
    TIMEOUT: 30000
  }
};

// Método especial para Base44
Base44Services.init = function() {
  console.log('[Base44] Services initialized');
  
  // Registrar en window si no existe
  if (typeof window !== 'undefined' && !window.Base44Services) {
    window.Base44Services = this;
    console.log('[Base44] Services registered to window.Base44Services');
  }
  
  return this;
};

// Inicializar automáticamente
Base44Services.init();

// Export para ES6
export default Base44Services;
export const {
  machineService,
  processService,
  assignmentService,
  serviceUtils,
  SERVICE_CONSTANTS
} = Base44Services;
