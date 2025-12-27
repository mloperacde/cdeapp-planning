// src/services/machineService.js
const base44 = window.base44;

export const machineService = {
  // CRUD básico - CORREGIDO: Usa base44.entities.Machine (NO MachineMaster)
  list: async (params = {}) => {
    try {
      // Maneja el formato actual: string 'orden' o objeto
      if (typeof params === 'string') {
        params = { order: params };
      }
      return await base44.entities.Machine.list(params);
    } catch (error) {
      console.error('Error listing machines:', error);
      throw error;
    }
  },
  
  get: async (id) => {
    try {
      return await base44.entities.Machine.get(id);
    } catch (error) {
      console.error(`Error getting machine ${id}:`, error);
      throw error;
    }
  },
  
  create: async (data) => {
    try {
      return await base44.entities.Machine.create(data);
    } catch (error) {
      console.error('Error creating machine:', error);
      throw error;
    }
  },
  
  update: async (id, data) => {
    try {
      return await base44.entities.Machine.update(id, data);
    } catch (error) {
      console.error(`Error updating machine ${id}:`, error);
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      return await base44.entities.Machine.delete(id);
    } catch (error) {
      console.error(`Error deleting machine ${id}:`, error);
      throw error;
    }
  }
};
