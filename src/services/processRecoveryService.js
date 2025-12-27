// src/services/processRecoveryService.js
const base44 = window.base44;

export const processRecoveryService = {
  recoverProcesses: async () => {
    try {
      const allProcesses = await base44.entities.Process.list();
      const allMachineProcesses = await base44.entities.MachineProcess.list();
      
      const processData = allProcesses.map(process => {
        const machineRelations = allMachineProcesses.filter(
          mp => mp.process_id === process.id
        );
        
        const machineCount = new Set(machineRelations.map(mp => mp.machine_id)).size;
        const maxOperators = machineRelations.reduce((max, mp) => 
          Math.max(max, mp.operadores_requeridos || 1), 1
        );
        
        return {
          id: process.id,
          nombre: process.nombre,
          codigo: process.codigo,
          descripcion: process.descripcion,
          activo: process.activo,
          operadores_requeridos: maxOperators,
          maquinas_asignadas: machineCount,
          pasos: 1,
          proceso_largo: false,
          proceso_id: process.id
        };
      });
      
      // Migrar a Processtype si existe
      let migrationResult = null;
      if (base44.entities.Processtype) {
        const promises = processData.map(process => 
          base44.entities.Processtype.upsert({
            id: process.id,
            nombre: process.nombre,
            pasos: process.pasos,
            operadores_requeridos: process.operadores_requeridos,
            codigo: process.codigo,
            descripcion: process.descripcion
          })
        );
        migrationResult = await Promise.all(promises);
      }
      
      return {
        recoveredProcesses: processData,
        migrationResult,
        totalProcesses: processData.length,
        assignedProcesses: processData.filter(p => p.maquinas_asignadas > 0).length
      };
    } catch (error) {
      console.error("Error recovering processes:", error);
      throw error;
    }
  }
};
