// src/hooks/useMachineData.js
import { useState, useEffect, useCallback } from 'react';
import machineDataService from '../services/MachineDataService';

/**
 * Hook personalizado para consumir datos de máquinas
 * Maneja estado de carga, error y actualizaciones automáticas
 */
export function useMachineData(options = {}) {
  const {
    employeeId = null,
    autoRefresh = true,
    refreshInterval = 30000, // 30 segundos
    initialLoad = true
  } = options;

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(initialLoad);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Función para cargar datos
  const loadData = useCallback(async (force = false) => {
    if (!initialLoad && !force) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let data;
      
      if (employeeId) {
        data = await machineDataService.getEmployeeMachines(employeeId, force);
      } else {
        data = await machineDataService.getAllMachines(force);
      }
      
      setMachines(data);
      setLastUpdate(new Date());
      setError(null);
      
    } catch (err) {
      console.error(`❌ [useMachineData] Error cargando datos:`, err);
      setError(err.message);
      // Mantener datos anteriores si hay error
    } finally {
      setLoading(false);
    }
  }, [employeeId, initialLoad]);

  // Carga inicial
  useEffect(() => {
    if (initialLoad) {
      loadData(false);
    }
  }, [loadData, initialLoad]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;
    
    const interval = setInterval(() => {
      console.log('🔄 [useMachineData] Auto-refresh');
      loadData(true);
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadData]);

  // Suscripción a eventos del servicio
  useEffect(() => {
    let listenerKey;
    
    if (employeeId) {
      listenerKey = machineDataService.addListener(
        `employee-machines-updated-${employeeId}`,
        (newData) => {
          console.log('📢 [useMachineData] Evento recibido, actualizando estado');
          setMachines(newData);
          setLastUpdate(new Date());
        }
      );
    } else {
      listenerKey = machineDataService.addListener(
        'machines-updated',
        (newData) => {
          console.log('📢 [useMachineData] Evento recibido, actualizando estado');
          setMachines(newData);
          setLastUpdate(new Date());
        }
      );
    }
    
    // Limpiar listener al desmontar
    return () => {
      if (listenerKey) {
        machineDataService.removeListener(listenerKey);
      }
    };
  }, [employeeId]);

  return {
    machines,
    loading,
    error,
    lastUpdate,
    refresh: () => loadData(true),
    getMachineById: (id) => machineDataService.findMachineById(id),
    stats: machineDataService.getStats()
  };
}

/**
 * Hook específico para máquinas de empleado
 */
export function useEmployeeMachines(employeeId, options = {}) {
  return useMachineData({
    ...options,
    employeeId
  });
}

/**
 * Hook específico para todas las máquinas
 */
export function useAllMachines(options = {}) {
  return useMachineData({
    ...options,
    employeeId: null
  });
}
