// src/services/index.js
// 📦 Exportaciones unificadas de servicios

// Exporta cada servicio individualmente
export { machineService } from './machineService';
export { processService } from './processService';
export { assignmentService } from './assignmentService';

// Utilidades de servicio (definidas localmente, sin importar desde archivos inexistentes)
export const serviceUtils = {
  /**
   * Maneja errores de servicios de forma consistente
   * @param {Error} error - Error original
   * @param {string} serviceName - Nombre del servicio
   * @returns {Object} Error formateado
   */
  formatError(error, serviceName = 'servicio') {
    return {
      success: false,
      message: error.message || `Error en ${serviceName}`,
      originalError: process.env.NODE_ENV === 'development' ? error : undefined,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Formatea respuesta exitosa
   * @param {any} data - Datos a retornar
   * @param {string} message - Mensaje opcional
   * @returns {Object} Respuesta formateada
   */
  formatSuccess(data, message = 'Operación exitosa') {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Valida datos requeridos
   * @param {Object} data - Datos a validar
   * @param {Array} requiredFields - Campos requeridos
   * @throws {Error} Si faltan campos
   */
  validateRequired(data, requiredFields) {
    const missing = requiredFields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missing.join(', ')}`);
    }
  }
};

// Constantes de servicio (definidas localmente)
export const SERVICE_CONSTANTS = {
  MAX_RETRIES: 3,
  TIMEOUT: 30000, // 30 segundos
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
  BATCH_SIZE: 50, // Para operaciones masivas
  DEFAULT_PAGINATION: {
    page: 1,
    limit: 20
  }
};
