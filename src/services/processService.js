// src/services/processService.js
const base44 = window.base44;

export const processService = {
  list: async (params = {}) => {
    try {
      return await base44.entities.Process.list(params);
    } catch (error) {
      console.error('Error listing processes:', error);
      throw error;
    }
  },
  
  get: async (id) => {
    try {
      return await base44.entities.Process.get(id);
    } catch (error) {
      console.error(`Error getting process ${id}:`, error);
      throw error;
    }
  },
  
  getMachineProcesses: async (machineId) => {
    try {
      return await base44.entities.MachineProcess.list({
        machine_id: machineId
      });
    } catch (error) {
      console.error(`Error getting processes for machine ${machineId}:`, error);
      throw error;
    }
  },
  
  assignToMachine: async (machineId, processId, data = {}) => {
    try {
      return await base44.entities.MachineProcess.create({
        machine_id: machineId,
        process_id: processId,
        ...data
      });
    } catch (error) {
      console.error(`Error assigning process ${processId} to machine ${machineId}:`, error);
      throw error;
    }
  }
};
