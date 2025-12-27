// src/services/assignmentService.js
import { base44 } from '@/api/base44Client';

/**
 * Servicio para gestión de asignaciones máquina-proceso
 */
export const assignmentService = {
  // ===== OPERACIONES CON MACHINEPROCESS =====

  /**
   * Obtiene todas las asignaciones máquina-proceso
   * @returns {Promise<Array>} Todas las asignaciones
   */
  async getAllAssignments() {
    try {
      console.log('📋 Obteniendo todas las asignaciones máquina-proceso');
      return await base44.entities.MachineProcess.list();
    } catch (error) {
      console.error('❌ Error obteniendo asignaciones:', error);
      throw new Error(`Error al obtener asignaciones: ${error.message}`);
    }
  },

  /**
   * Obtiene asignaciones con detalles completos
   * @returns {Promise<Array>} Asignaciones enriquecidas
   */
  async getAssignmentsWithDetails() {
    try {
      console.log('🔗 Obteniendo asignaciones con detalles');
      const assignments = await this.getAllAssignments();
      
      // Enriquecer cada asignación con datos de máquina y proceso
      const enriched = await Promise.all(
        assignments.map(async (assignment) => {
          try {
            const [machine, process] = await Promise.all([
              base44.entities.Machine.get(assignment.machine_id),
              base44.entities.Process.get(assignment.process_id)
            ]);
            
            return {
              ...assignment,
              machine_nombre: machine?.nombre || 'Desconocido',
              machine_codigo: machine?.codigo || 'N/A',
              machine_activo: machine?.activo || false,
              process_nombre: process?.nombre || 'Desconocido',
              process_codigo: process?.codigo || 'N/A',
              process_tipo: process?.tipo || 'N/A',
              process_activo: process?.activo || false
            };
          } catch (error) {
            console.warn(`⚠️ Error enriqueciendo asignación ${assignment.id}:`, error);
            return assignment; // Devolver sin enriquecer si hay error
          }
        })
      );
      
      return enriched;
    } catch (error) {
      console.error('❌ Error obteniendo asignaciones con detalles:', error);
      throw new Error(`Error al obtener asignaciones con detalles: ${error.message}`);
    }
  },

  /**
   * Obtiene asignaciones por máquina
   * @param {string} machineId - ID de la máquina
   * @returns {Promise<Array>} Asignaciones de la máquina
   */
  async getAssignmentsByMachine(machineId) {
    try {
      console.log(`🔗 Obteniendo asignaciones para máquina ${machineId}`);
      return await base44.entities.MachineProcess.list({
        filters: { machine_id: machineId }
      });
    } catch (error) {
      console.error(`❌ Error obteniendo asignaciones por máquina:`, error);
      throw new Error(`Error al obtener asignaciones por máquina: ${error.message}`);
    }
  },

  /**
   * Obtiene asignaciones por proceso
   * @param {string} processId - ID del proceso
   * @returns {Promise<Array>} Asignaciones del proceso
   */
  async getAssignmentsByProcess(processId) {
    try {
      console.log(`🔗 Obteniendo asignaciones para proceso ${processId}`);
      return await base44.entities.MachineProcess.list({
        filters: { process_id: processId }
      });
    } catch (error) {
      console.error(`❌ Error obteniendo asignaciones por proceso:`, error);
      throw new Error(`Error al obtener asignaciones por proceso: ${error.message}`);
    }
  },

  /**
   * Verifica si una asignación específica existe
   * @param {string} machineId - ID de la máquina
   * @param {string} processId - ID del proceso
   * @returns {Promise<Object|null>} Asignación si existe, null si no
   */
  async getAssignment(machineId, processId) {
    try {
      console.log(`🔍 Buscando asignación máquina ${machineId} - proceso ${processId}`);
      const assignments = await base44.entities.MachineProcess.list({
        filters: {
          machine_id: machineId,
          process_id: processId
        }
      });
      
      return assignments.length > 0 ? assignments[0] : null;
    } catch (error) {
      console.error('❌ Error buscando asignación:', error);
      throw new Error(`Error al buscar asignación: ${error.message}`);
    }
  },

  /**
   * Crea o actualiza una asignación
   * @param {string} machineId - ID de la máquina
   * @param {string} processId - ID del proceso
   * @param {Object} data - Datos de la asignación
   * @returns {Promise<Object>} Asignación creada/actualizada
   */
  async upsertAssignment(machineId, processId, data = {}) {
    try {
      // Verificar si ya existe
      const existing = await this.getAssignment(machineId, processId);
      
      if (existing) {
        console.log(`✏️ Actualizando asignación existente ${existing.id}`);
        return await base44.entities.MachineProcess.update(existing.id, {
          ...data,
          updated_at: new Date().toISOString()
        });
      } else {
        console.log(`➕ Creando nueva asignación máquina ${machineId} - proceso ${processId}`);
        return await base44.entities.MachineProcess.create({
          machine_id: machineId,
          process_id: processId,
          operadores_asignados: data.operadores || 1,
          tiempo_estandar: data.tiempo || 60,
          notas: data.notas || '',
          created_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Error en upsert de asignación:', error);
      throw new Error(`Error al guardar asignación: ${error.message}`);
    }
  },

  /**
   * Elimina una asignación por ID
   * @param {string} assignmentId - ID de la asignación
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async deleteAssignment(assignmentId) {
    try {
      console.log(`🗑️ Eliminando asignación ${assignmentId}`);
      return await base44.entities.MachineProcess.delete(assignmentId);
    } catch (error) {
      console.error(`❌ Error eliminando asignación ${assignmentId}:`, error);
      throw new Error(`Error al eliminar asignación: ${error.message}`);
    }
  },

  // ===== OPERACIONES MASIVAS =====

  /**
   * Asigna múltiples procesos a una máquina
   * @param {string} machineId - ID de la máquina
   * @param {Array} processIds - IDs de los procesos
   * @param {Object} config - Configuración común
   * @returns {Promise<Array>} Resultados de las asignaciones
   */
  async assignMultipleProcesses(machineId, processIds, config = {}) {
    try {
      console.log(`🔗 Asignando ${processIds.length} procesos a máquina ${machineId}`);
      
      const results = await Promise.allSettled(
        processIds.map(processId =>
          this.upsertAssignment(machineId, processId, config)
        )
      );
      
      // Analizar resultados
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`✅ ${successful} asignaciones exitosas, ❌ ${failed} fallidas`);
      
      return {
        total: processIds.length,
        successful,
        failed,
        results: results.map((result, index) => ({
          processId: processIds[index],
          status: result.status,
          data: result.status === 'fulfilled' ? result.value : result.reason
        }))
      };
    } catch (error) {
      console.error('❌ Error en asignación masiva:', error);
      throw new Error(`Error en asignación masiva: ${error.message}`);
    }
  },

  /**
   * Sincroniza asignaciones (elimina las que no están en la lista)
   * @param {string} machineId - ID de la máquina
   * @param {Array} processIds - IDs de procesos que DEBEN estar asignados
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async syncAssignments(machineId, processIds) {
    try {
      console.log(`🔄 Sincronizando asignaciones para máquina ${machineId}`);
      
      // Obtener asignaciones actuales
      const currentAssignments = await this.getAssignmentsByMachine(machineId);
      const currentProcessIds = currentAssignments.map(a => a.process_id);
      
      // Procesos a agregar
      const toAdd = processIds.filter(id => !currentProcessIds.includes(id));
      
      // Procesos a eliminar
      const toRemove = currentAssignments
        .filter(a => !processIds.includes(a.process_id))
        .map(a => a.id);
      
      // Ejecutar operaciones
      const addResults = await Promise.allSettled(
        toAdd.map(processId => this.upsertAssignment(machineId, processId))
      );
      
      const removeResults = await Promise.allSettled(
        toRemove.map(assignmentId => this.deleteAssignment(assignmentId))
      );
      
      return {
        before: currentProcessIds.length,
        target: processIds.length,
        added: toAdd.length,
        removed: toRemove.length,
        addResults: {
          successful: addResults.filter(r => r.status === 'fulfilled').length,
          failed: addResults.filter(r => r.status === 'rejected').length
        },
        removeResults: {
          successful: removeResults.filter(r => r.status === 'fulfilled').length,
          failed: removeResults.filter(r => r.status === 'rejected').length
        }
      };
    } catch (error) {
      console.error('❌ Error sincronizando asignaciones:', error);
      throw new Error(`Error al sincronizar asignaciones: ${error.message}`);
    }
  },

  // ===== ESTADÍSTICAS Y VALIDACIONES =====

  /**
   * Obtiene estadísticas de asignaciones
   * @returns {Promise<Object>} Estadísticas
   */
  async getAssignmentStats() {
    try {
      console.log('📊 Obteniendo estadísticas de asignaciones');
      const assignments = await this.getAllAssignments();
      
      // Agrupar por máquina
      const byMachine = assignments.reduce((acc, assignment) => {
        acc[assignment.machine_id] = (acc[assignment.machine_id] || 0) + 1;
        return acc;
      }, {});
      
      // Agrupar por proceso
      const byProcess = assignments.reduce((acc, assignment) => {
        acc[assignment.process_id] = (acc[assignment.process_id] || 0) + 1;
        return acc;
      }, {});
      
      return {
        total: assignments.length,
        uniqueMachines: Object.keys(byMachine).length,
        uniqueProcesses: Object.keys(byProcess).length,
        averagePerMachine: assignments.length / Math.max(Object.keys(byMachine).length, 1),
        averagePerProcess: assignments.length / Math.max(Object.keys(byProcess).length, 1),
        byMachineCount: byMachine,
        byProcessCount: byProcess
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  },

  /**
   * Valida consistencia de asignaciones
   * @returns {Promise<Array>} Problemas encontrados
   */
  async validateAssignments() {
    try {
      console.log('🔍 Validando consistencia de asignaciones');
      const assignments = await this.getAssignmentsWithDetails();
      
      const issues = [];
      
      assignments.forEach(assignment => {
        // Verificar que máquina y proceso existan
        if (!assignment.machine_nombre || assignment.machine_nombre === 'Desconocido') {
          issues.push({
            type: 'MÁQUINA_NO_ENCONTRADA',
            assignmentId: assignment.id,
            machineId: assignment.machine_id,
            message: `Máquina ${assignment.machine_id} no encontrada`
          });
        }
        
        if (!assignment.process_nombre || assignment.process_nombre === 'Desconocido') {
          issues.push({
            type: 'PROCESO_NO_ENCONTRADO',
            assignmentId: assignment.id,
            processId: assignment.process_id,
            message: `Proceso ${assignment.process_id} no encontrado`
          });
        }
        
        // Verificar que ambos estén activos
        if (assignment.machine_activo === false) {
          issues.push({
            type: 'MÁQUINA_INACTIVA',
            assignmentId: assignment.id,
            machineId: assignment.machine_id,
            message: `Máquina ${assignment.machine_codigo} está inactiva`
          });
        }
        
        if (assignment.process_activo === false) {
          issues.push({
            type: 'PROCESO_INACTIVO',
            assignmentId: assignment.id,
            processId: assignment.process_id,
            message: `Proceso ${assignment.process_codigo} está inactivo`
          });
        }
      });
      
      return {
        totalAssignments: assignments.length,
        issuesCount: issues.length,
        issues: issues,
        isValid: issues.length === 0
      };
    } catch (error) {
      console.error('❌ Error validando asignaciones:', error);
      throw new Error(`Error al validar asignaciones: ${error.message}`);
    }
  }
};
