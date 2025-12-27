// src/services/processService.js
import { base44 } from '@/api/base44Client';

/**
 * Servicio unificado para gestión de procesos
 */
export const processService = {
  // ===== OPERACIONES CRUD BÁSICAS =====

  /**
   * Obtiene todos los procesos
   * @returns {Promise<Array>} Lista de procesos
   */
  async getAllProcesses() {
    try {
      console.log('📋 Obteniendo todos los procesos');
      return await base44.entities.Process.list();
    } catch (error) {
      console.error('❌ Error obteniendo procesos:', error);
      throw new Error(`Error al obtener procesos: ${error.message}`);
    }
  },

  /**
   * Obtiene un proceso por ID
   * @param {string} processId - ID del proceso
   * @returns {Promise<Object>} Datos del proceso
   */
  async getProcessById(processId) {
    try {
      console.log(`🔍 Obteniendo proceso con ID: ${processId}`);
      return await base44.entities.Process.get(processId);
    } catch (error) {
      console.error(`❌ Error obteniendo proceso ${processId}:`, error);
      throw new Error(`Error al obtener proceso: ${error.message}`);
    }
  },

  /**
   * Crea un nuevo proceso
   * @param {Object} processData - Datos del proceso
   * @returns {Promise<Object>} Proceso creado
   */
  async createProcess(processData) {
    try {
      console.log('➕ Creando nuevo proceso:', processData.nombre);
      
      // Validaciones básicas
      if (!processData.codigo || !processData.nombre) {
        throw new Error('Código y nombre son requeridos');
      }
      
      return await base44.entities.Process.create(processData);
    } catch (error) {
      console.error('❌ Error creando proceso:', error);
      throw new Error(`Error al crear proceso: ${error.message}`);
    }
  },

  /**
   * Actualiza un proceso existente
   * @param {string} processId - ID del proceso
   * @param {Object} updates - Campos a actualizar
   * @returns {Promise<Object>} Proceso actualizado
   */
  async updateProcess(processId, updates) {
    try {
      console.log(`✏️ Actualizando proceso ${processId}:`, updates);
      return await base44.entities.Process.update(processId, updates);
    } catch (error) {
      console.error(`❌ Error actualizando proceso ${processId}:`, error);
      throw new Error(`Error al actualizar proceso: ${error.message}`);
    }
  },

  /**
   * Elimina un proceso
   * @param {string} processId - ID del proceso
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async deleteProcess(processId) {
    try {
      console.log(`🗑️ Eliminando proceso con ID: ${processId}`);
      return await base44.entities.Process.delete(processId);
    } catch (error) {
      console.error(`❌ Error eliminando proceso ${processId}:`, error);
      throw new Error(`Error al eliminar proceso: ${error.message}`);
    }
  },

  // ===== OPERACIONES CON MÁQUINAS ASIGNADAS =====

  /**
   * Obtiene un proceso con todas las máquinas asignadas
   * @param {string} processId - ID del proceso
   * @returns {Promise<Object>} Proceso con máquinas asignadas
   */
  async getProcessWithMachines(processId) {
    try {
      console.log(`🔗 Obteniendo proceso ${processId} con sus máquinas`);
      
      const [process, machineAssignments] = await Promise.all([
        this.getProcessById(processId),
        base44.entities.MachineProcess.list({
          filters: { process_id: processId }
        })
      ]);

      // Obtener detalles de cada máquina asignada
      const machines = await Promise.all(
        machineAssignments.map(async (assignment) => {
          try {
            const machine = await base44.entities.Machine.get(assignment.machine_id);
            return {
              ...machine,
              assignment_id: assignment.id,
              operadores_asignados: assignment.operadores_asignados || 1,
              tiempo_estandar: assignment.tiempo_estandar || 60
            };
          } catch (error) {
            console.warn(`⚠️ Error cargando máquina ${assignment.machine_id}:`, error);
            return null;
          }
        })
      );

      // Filtrar máquinas nulas (errores de carga)
      const validMachines = machines.filter(m => m !== null);

      return {
        ...process,
        assignedMachines: validMachines
      };
    } catch (error) {
      console.error(`❌ Error obteniendo proceso con máquinas ${processId}:`, error);
      throw new Error(`Error al obtener proceso con máquinas: ${error.message}`);
    }
  },

  /**
   * Obtiene máquinas disponibles (no asignadas) para un proceso
   * @param {string} processId - ID del proceso
   * @returns {Promise<Array>} Lista de máquinas disponibles
   */
  async getAvailableMachinesForProcess(processId) {
    try {
      console.log(`📋 Obteniendo máquinas disponibles para proceso ${processId}`);
      
      const [allMachines, processAssignments] = await Promise.all([
        base44.entities.Machine.list('orden'),
        base44.entities.MachineProcess.list({
          filters: { process_id: processId }
        })
      ]);

      // Filtrar máquinas ya asignadas
      const assignedMachineIds = processAssignments.map(pa => pa.machine_id);
      return allMachines.filter(
        machine => !assignedMachineIds.includes(machine.id)
      );
    } catch (error) {
      console.error(`❌ Error obteniendo máquinas disponibles:`, error);
      throw new Error(`Error al obtener máquinas disponibles: ${error.message}`);
    }
  },

  // ===== MÉTODOS DE BÚSQUEDA Y FILTRADO =====

  /**
   * Busca procesos por criterios
   * @param {Object} criteria - Criterios de búsqueda
   * @returns {Promise<Array>} Procesos que coinciden
   */
  async searchProcesses(criteria = {}) {
    try {
      console.log(`🔎 Buscando procesos con criterios:`, criteria);
      const allProcesses = await this.getAllProcesses();
      
      return allProcesses.filter(process => {
        return Object.entries(criteria).every(([key, value]) => {
          if (!value) return true; // Si el valor está vacío, no filtrar
          
          if (key === 'nombre' || key === 'codigo' || key === 'descripcion') {
            return process[key]?.toLowerCase().includes(value.toLowerCase());
          }
          if (key === 'tipo') {
            return process.tipo === value;
          }
          if (key === 'activo') {
            return process.activo === value;
          }
          return process[key] === value;
        });
      });
    } catch (error) {
      console.error('❌ Error buscando procesos:', error);
      throw new Error(`Error al buscar procesos: ${error.message}`);
    }
  },

  /**
   * Obtiene procesos por tipo
   * @param {string} tipo - Tipo de proceso
   * @returns {Promise<Array>} Procesos del tipo especificado
   */
  async getProcessesByType(tipo) {
    try {
      console.log(`📂 Obteniendo procesos de tipo: ${tipo}`);
      const allProcesses = await this.getAllProcesses();
      return allProcesses.filter(process => process.tipo === tipo);
    } catch (error) {
      console.error(`❌ Error obteniendo procesos por tipo ${tipo}:`, error);
      throw new Error(`Error al obtener procesos por tipo: ${error.message}`);
    }
  },

  /**
   * Obtiene procesos activos
   * @returns {Promise<Array>} Procesos activos
   */
  async getActiveProcesses() {
    try {
      console.log('✅ Obteniendo procesos activos');
      const allProcesses = await this.getAllProcesses();
      return allProcesses.filter(process => process.activo);
    } catch (error) {
      console.error('❌ Error obteniendo procesos activos:', error);
      throw new Error(`Error al obtener procesos activos: ${error.message}`);
    }
  },

  // ===== ESTADÍSTICAS Y REPORTES =====

  /**
   * Obtiene estadísticas de procesos
   * @returns {Promise<Object>} Estadísticas
   */
  async getProcessStats() {
    try {
      console.log('📊 Obteniendo estadísticas de procesos');
      const processes = await this.getAllProcesses();
      
      // Agrupar por tipo
      const byType = processes.reduce((acc, process) => {
        const tipo = process.tipo || 'Sin tipo';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {});

      // Contar operadores totales
      const totalOperadores = processes.reduce(
        (sum, process) => sum + (process.operadores_requeridos || 0), 0
      );

      // Tiempo total estimado
      const totalTiempo = processes.reduce(
        (sum, process) => sum + (process.tiempo_estimado || 0), 0
      );

      return {
        total: processes.length,
        activos: processes.filter(p => p.activo).length,
        inactivos: processes.filter(p => !p.activo).length,
        porTipo: byType,
        totalOperadores,
        totalTiempoEstimado: totalTiempo,
        tiempoPromedio: processes.length > 0 ? totalTiempo / processes.length : 0
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  },

  // ===== VALIDACIONES =====

  /**
   * Valida si un código de proceso ya existe
   * @param {string} codigo - Código a validar
   * @param {string} excludeId - ID a excluir (para actualizaciones)
   * @returns {Promise<boolean>} True si existe
   */
  async isProcessCodeDuplicate(codigo, excludeId = null) {
    try {
      const processes = await this.getAllProcesses();
      return processes.some(
        process => 
          process.codigo === codigo && 
          (!excludeId || process.id !== excludeId)
      );
    } catch (error) {
      console.error('❌ Error validando código:', error);
      return false;
    }
  }
};
