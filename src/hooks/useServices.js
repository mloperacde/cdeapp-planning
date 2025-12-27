// src/hooks/useServices.js
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Servicios locales inline (para evitar problemas de import)
const createServices = () => ({
  // === MÁQUINAS ===
  machineService: {
    async getMachines(params = {}) {
      try {
        console.log('[Services] Obteniendo máquinas');
        
        // Usa base44Client directamente
        const machines = await base44.entities.MachineMaster?.list() || [];
        
        // Aplica filtros si existen
        let filtered = machines;
        if (params.search) {
          const search = params.search.toLowerCase();
          filtered = filtered.filter(m => 
            m.name?.toLowerCase().includes(search) ||
            m.code?.toLowerCase().includes(search) ||
            m.description?.toLowerCase().includes(search)
          );
        }
        
        return {
          success: true,
          data: filtered,
          count: filtered.length,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('[Services] Error en getMachines:', error);
        return {
          success: false,
          error: error.message,
          message: 'Error al obtener máquinas',
          timestamp: new Date().toISOString()
        };
      }
    },
    
    async createMachine(data) {
      try {
        const machine = await base44.entities.MachineMaster.create(data);
        return {
          success: true,
          data: machine,
          message: 'Máquina creada exitosamente'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Error al crear máquina'
        };
      }
    },
    
    async updateMachine(id, data) {
      try {
        const machine = await base44.entities.MachineMaster.update(id, data);
        return {
          success: true,
          data: machine,
          message: 'Máquina actualizada'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Error al actualizar máquina'
        };
      }
    }
  },
  
  // === PROCESOS ===
  processService: {
    async getProcesses() {
      try {
        const processes = await base44.entities.Process?.list() || [];
        return {
          success: true,
          data: processes,
          count: processes.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  // === ASIGNACIONES ===
  assignmentService: {
    async getAssignments(filters = {}) {
      try {
        // Implementar lógica de asignaciones
        return {
          success: true,
          data: [],
          count: 0
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  // === UTILIDADES ===
  serviceUtils: {
    formatError(error, serviceName = 'servicio') {
      return {
        success: false,
        message: `Error en ${serviceName}: ${error.message}`,
        timestamp: new Date().toISOString(),
        code: error.code || 'UNKNOWN_ERROR'
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
      const missing = requiredFields.filter(field => {
        const value = data[field];
        return value === undefined || value === null || value === '';
      });
      
      if (missing.length > 0) {
        throw new Error(`Campos requeridos faltantes: ${missing.join(', ')}`);
      }
    }
  },
  
  // === CONSTANTES ===
  SERVICE_CONSTANTS: {
    MAX_RETRIES: 3,
    TIMEOUT: 30000,
    CACHE_DURATION: 5 * 60 * 1000,
    BATCH_SIZE: 50,
    
    // URLs de API específicas para Base44
    API_ENDPOINTS: {
      MACHINES: 'MachineMaster',
      PROCESSES: 'Process',
      ASSIGNMENTS: 'Assignment'
    }
  }
});

// Hook de React para usar servicios
const useServices = () => {
  const [services, setServices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        setLoading(true);
        
        // Crear servicios inline (sin importar archivos)
        const serviceInstance = createServices();
        
        // Verificar que base44 esté disponible
        if (!base44 || !base44.entities) {
          console.warn('⚠️ Base44 client no está disponible');
        }
        
        setServices(serviceInstance);
        console.log('✅ Servicios inicializados:', Object.keys(serviceInstance));
        
      } catch (err) {
        console.error('💥 Error inicializando servicios:', err);
        setError(err.message);
        
        // Crear servicios de emergencia
        setServices(createServices());
      } finally {
        setLoading(false);
      }
    };

    initializeServices();
  }, []);

  return {
    services,
    loading,
    error,
    reload: () => {
      setLoading(true);
      setTimeout(() => {
        setServices(createServices());
        setLoading(false);
      }, 100);
    }
  };
};

export default useServices;
