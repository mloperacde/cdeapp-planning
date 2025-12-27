// src/services/machineService.js
import { base44 } from '@/api/base44Client';

/**
 * Servicio unificado para gestión de máquinas
 * Centraliza todas las operaciones relacionadas con máquinas
 */
export const machineService = {
  // ===== OPERACIONES CRUD BÁSICAS =====
  
  /**
   * Obtiene todas las máquinas ordenadas
   * @param {string} sortField - Campo para ordenar (default: 'orden')
   * @returns {Promise<Array>} Lista de máquinas
   */
  async getAllMachines(sortField = 'orden') {
    try {
      console.log(`📋 Obteniendo todas las máquinas ordenadas por: ${sortField}`);
      return await base44.entities.Machine.list(sortField);
    } catch (error) {
      console.error('❌ Error obteniendo máquinas:', error);
      throw new Error(`Error al obtener máquinas: ${error.message}`);
    }
  },

  /**
   * Obtiene una máquina específica por ID
   * @param {string} machineId - ID de la máquina
   * @returns {Promise<Object>} Datos de la máquina
   */
  async getMachineById(machineId) {
    try {
      console.log(`🔍 Obteniendo máquina con ID: ${machineId}`);
      return await base44.entities.Machine.get(machineId);
    } catch (error) {
      console.error(`❌ Error obteniendo máquina ${machineId}:`, error);
      throw new Error(`Error al obtener máquina: ${error.message}`);
    }
  },

  /**
   * Crea una nueva máquina
   * @param {Object} machineData - Datos de la máquina
   * @returns {Promise<Object>} Máquina creada
   */
  async createMachine(machineData) {
    try {
      console.log('➕ Creando nueva máquina:', machineData.nombre);
      return await base44.entities.Machine.create(machineData);
    } catch (error) {
      console.error('❌ Error creando máquina:', error);
      throw new Error(`Error al crear máquina: ${error.message}`);
    }
  },

  /**
   * Actualiza una máquina existente
   * @param {string} machineId - ID de la máquina
   * @param {Object} updates - Campos a actualizar
   * @returns {Promise<Object>} Máquina actualizada
   */
  async updateMachine(machineId, updates) {
    try {
      console.log(`✏️ Actualizando máquina ${machineId}:`, updates);
      return await base44.entities.Machine.update(machineId, updates);
    } catch (error) {
      console.error(`❌ Error actualizando máquina ${machineId}:`, error);
      throw new Error(`Error al actualizar máquina: ${error.message}`);
    }
  },

  /**
   * Elimina una máquina
   * @param {string} machineId - ID de la máquina
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async deleteMachine(machineId) {
    try {
      console.log(`🗑️ Eliminando máquina con ID: ${machineId}`);
      return await base44.entities.Machine.delete(machineId);
    } catch (error) {
      console.error(`❌ Error eliminando máquina ${machineId}:`, error);
      throw new Error(`Error al eliminar máquina: ${error.message}`);
    }
  },

  // ===== OPERACIONES CON PROCESOS ASIGNADOS =====

  /**
   * Obtiene una máquina con todos sus procesos asignados
   * @param {string} machineId - ID de la máquina
   * @returns {Promise<Object>} Máquina con procesos asignados
   */
  async getMachineWithProcesses(machineId) {
    try {
      console.log(`🔗 Obteniendo máquina ${machineId} con sus procesos`);
      
      const [machine, processAssignments] = await Promise.all([
        this.getMachineById(machineId),
        base44.entities.MachineProcess.list({
          filters: { machine_id: machineId }
        })
      ]);

      // Obtener detalles de cada proceso asignado
      const processes = await Promise.all(
        processAssignments.map(async (assignment) => {
          try {
            const process = await base44.entities.Process.get(assignment.process_id);
            return {
              ...process,
              assignment_id: assignment.id,
              operadores_asignados: assignment.operadores_asignados || 1,
              tiempo_estandar: assignment.tiempo_estandar || 60,
              created_at: assignment.created_at,
              updated_at: assignment.updated_at
            };
          } catch (error) {
            console.warn(`⚠️ Error cargando proceso ${assignment.process_id}:`, error);
            return null;
          }
        })
      );

      // Filtrar procesos nulos (errores de carga)
      const validProcesses = processes.filter(p => p !== null);

      return {
        ...machine,
        assignedProcesses: validProcesses
      };
    } catch (error) {
      console.error(`❌ Error obteniendo máquina con procesos ${machineId}:`, error);
      throw new Error(`Error al obtener máquina con procesos: ${error.message}`);
    }
  },

  /**
   * Asigna un proceso a una máquina
   * @param {string} machineId - ID de la máquina
   * @param {string} processId - ID del proceso
   * @param {Object} config - Configuración adicional
   * @returns {Promise<Object>} Asignación creada
   */
  async assignProcessToMachine(machineId, processId, config = {}) {
    try {
      console.log(`🔗 Asignando proceso ${processId} a máquina ${machineId}`);
      
      // Verificar que la máquina y el proceso existen
      await Promise.all([
        this.getMachineById(machineId),
        base44.entities.Process.get(processId)
      ]);

      // Crear la asignación
      return await base44.entities.MachineProcess.create({
        machine_id: machineId,
        process_id: processId,
        operadores_asignados: config.operadores || 1,
        tiempo_estandar: config.tiempo || 60,
        notas: config.notas || '',
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Error asignando proceso a máquina:`, error);
      throw new Error(`Error al asignar proceso: ${error.message}`);
    }
  },

  /**
   * Elimina la asignación de un proceso a una máquina
   * @param {string} assignmentId - ID de la asignación (MachineProcess)
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async removeProcessFromMachine(assignmentId) {
    try {
      console.log(`🔗 Eliminando asignación ${assignmentId}`);
      return await base44.entities.MachineProcess.delete(assignmentId);
    } catch (error) {
      console.error(`❌ Error eliminando asignación ${assignmentId}:`, error);
      throw new Error(`Error al eliminar asignación: ${error.message}`);
    }
  },

  /**
   * Obtiene procesos disponibles (no asignados) para una máquina
   * @param {string} machineId - ID de la máquina
   * @returns {Promise<Array>} Lista de procesos disponibles
   */
  async getAvailableProcessesForMachine(machineId) {
    try {
      console.log(`📋 Obteniendo procesos disponibles para máquina ${machineId}`);
      
      const [allProcesses, machineAssignments] = await Promise.all([
        base44.entities.Process.list(),
        base44.entities.MachineProcess.list({
          filters: { machine_id: machineId }
        })
      ]);

      // Filtrar procesos ya asignados
      const assignedProcessIds = machineAssignments.map(ma => ma.process_id);
      return allProcesses.filter(
        process => !assignedProcessIds.includes(process.id)
      );
    } catch (error) {
      console.error(`❌ Error obteniendo procesos disponibles:`, error);
      throw new Error(`Error al obtener procesos disponibles: ${error.message}`);
    }
  },

  // ===== OPERACIONES CON PLANIFICACIÓN =====

  /**
   * Obtiene la planificación de una máquina
   * @param {string} machineId - ID de la máquina
   * @param {Object} filters - Filtros adicionales
   * @returns {Promise<Array>} Planificaciones de la máquina
   */
  async getMachinePlanning(machineId, filters = {}) {
    try {
      console.log(`📅 Obteniendo planificación para máquina ${machineId}`);
      return await base44.entities.MachinePlanning.list({
        filters: { machine_id: machineId, ...filters }
      });
    } catch (error) {
      console.error(`❌ Error obteniendo planificación:`, error);
      throw new Error(`Error al obtener planificación: ${error.message}`);
    }
  },

  /**
   * Obtiene asignaciones de empleados a máquina
   * @param {string} machineId - ID de la máquina
   * @returns {Promise<Array>} Asignaciones de empleados
   */
  async getMachineEmployeeAssignments(machineId) {
    try {
      console.log(`👥 Obteniendo asignaciones de empleados para máquina ${machineId}`);
      return await base44.entities.MachineAssignment.list({
        filters: { machine_id: machineId }
      });
    } catch (error) {
      console.error(`❌ Error obteniendo asignaciones de empleados:`, error);
      throw new Error(`Error al obtener asignaciones de empleados: ${error.message}`);
    }
  },

  // ===== MÉTODOS DE BÚSQUEDA Y FILTRADO =====

  /**
   * Busca máquinas por criterios
   * @param {Object} criteria - Criterios de búsqueda
   * @returns {Promise<Array>} Máquinas que coinciden
   */
  async searchMachines(criteria = {}) {
    try {
      console.log(`🔎 Buscando máquinas con criterios:`, criteria);
      const allMachines = await this.getAllMachines();
      
      return allMachines.filter(machine => {
        // Filtrar por cada criterio proporcionado
        return Object.entries(criteria).every(([key, value]) => {
          if (key === 'nombre' || key === 'codigo') {
            return machine[key]?.toLowerCase().includes(value.toLowerCase());
          }
          if (key === 'activo') {
            return machine.activo === value;
          }
          if (key === 'ubicacion') {
            return machine.ubicacion?.toLowerCase().includes(value.toLowerCase());
          }
          return machine[key] === value;
        });
      });
    } catch (error) {
      console.error('❌ Error buscando máquinas:', error);
      throw new Error(`Error al buscar máquinas: ${error.message}`);
    }
  },

  /**
   * Obtiene estadísticas de máquinas
   * @returns {Promise<Object>} Estadísticas
   */
  async getMachineStats() {
    try {
      console.log('📊 Obteniendo estadísticas de máquinas');
      const machines = await this.getAllMachines();
      
      return {
        total: machines.length,
        activas: machines.filter(m => m.activo).length,
        inactivas: machines.filter(m => !m.activo).length,
        porUbicacion: machines.reduce((acc, machine) => {
          const ubicacion = machine.ubicacion || 'Sin ubicación';
          acc[ubicacion] = (acc[ubicacion] || 0) + 1;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  },

  // ===== MÉTODOS DE VALIDACIÓN =====

  /**
   * Valida si un código de máquina ya existe
   * @param {string} codigo - Código a validar
   * @param {string} excludeId - ID a excluir (para actualizaciones)
   * @returns {Promise<boolean>} True si existe
   */
  async isMachineCodeDuplicate(codigo, excludeId = null) {
    try {
      const machines = await this.getAllMachines();
      return machines.some(
        machine => 
          machine.codigo === codigo && 
          (!excludeId || machine.id !== excludeId)
      );
    } catch (error) {
      console.error('❌ Error validando código:', error);
      return false;
    }
  }
};
