const API_BASE_URL = 'https://cdeapp.es/api/v1';
const API_KEY = '1oeV2Wg9g6gmY8rAGF4qxtBme4DsX7exYoiFFCf4xVQXDKDYp4Xc9CPSlm2ZzxSJ';

/**
 * Servicio para sincronizar datos con la API de cdeapp.es
 */
export const cdeApi = {
  /**
   * Obtiene el listado de máquinas activas
   * @returns {Promise<Object>} Respuesta de la API { success, data, count }
   */
  async getMachines() {
    try {
      const response = await fetch(`${API_BASE_URL}/sync-machines`, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching machines:', error);
      throw error;
    }
  },

  /**
   * Obtiene el listado de salas activas
   * @returns {Promise<Object>} Respuesta de la API { success, data, count }
   */
  async getRooms() {
    try {
      const response = await fetch(`${API_BASE_URL}/sync-rooms`, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  }
};
