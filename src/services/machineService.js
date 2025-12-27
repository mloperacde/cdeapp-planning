// src/services/machineService.js - VERSIÓN CORREGIDA
const base44 = window.base44;

export const machineService = {
  // CRUD básico - CORREGIDO: Usa base44.entities.Machine
  list: async (params = {}) => {
    try {
      // Maneja tanto objeto como string (para compatibilidad)
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
  },
  
  // Métodos específicos del negocio
  listWithOrder: async () => {
    try {
      return await base44.entities.Machine.list('orden');
    } catch (error) {
      console.error('Error listing machines with order:', error);
      throw error;
    }
  },
  
  search: async (query) => {
    try {
      return await base44.entities.Machine.list({
        search: query
      });
    } catch (error) {
      console.error(`Error searching machines with query "${query}":`, error);
      throw error;
    }
  }
};
