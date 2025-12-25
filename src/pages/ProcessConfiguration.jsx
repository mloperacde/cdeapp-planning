// ProcessTypes.jsx - Versión que usa API
import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";

const ProcessTypes = () => {
  const [processes, setProcesses] = useState([]);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar máquinas y extraer procesos
        const machinesResponse = await base44.get('/maquinas');
        const machines = machinesResponse.data || machinesResponse;
        
        // Extraer todos los procesos de todas las máquinas
        const allProcesses = [];
        machines.forEach(machine => {
          if (machine.procesos_ids) {
            machine.procesos_ids.forEach(procId => {
              allProcesses.push({
                machineId: machine._id,
                machineName: machine.nombre,
                procesoId: procId
              });
            });
          }
        });
        
        setProcesses(allProcesses);
      } catch (error) {
        console.error('Error al cargar procesos:', error);
      }
    };
    
    loadData();
  }, []);
  
  // ... resto del componente
};