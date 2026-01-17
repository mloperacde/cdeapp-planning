import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * PROVEEDOR CENTRALIZADO DE DATOS
 * Fuente única de verdad para toda la aplicación
 * Evita llamadas duplicadas y respeta rate limits
 */

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  
  // 1. USUARIO ACTUAL - Cache 5 min
  const userQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => isLocal ? Promise.resolve(null) : base44.auth.me().catch(() => null),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // 2. EMPLEADO ACTUAL - Cache 10 min
  const employeeQuery = useQuery({
    queryKey: ['currentEmployee', userQuery.data?.email],
    queryFn: async () => {
      if (isLocal || !userQuery.data?.email) return null;
      const emps = await base44.entities.EmployeeMasterDatabase.list('nombre', 500);
      return emps.find(e => e.email === userQuery.data.email) || null;
    },
    enabled: !!userQuery.data?.email,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 3. EMPLEADOS - Cache 10 min (FUENTE ÚNICA) - SOLO EmployeeMasterDatabase
  const employeesQuery = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: async () => {
      if (isLocal) return [];
      try {
        const data = await base44.entities.EmployeeMasterDatabase.list('nombre', 500);
        if (!Array.isArray(data)) {
          console.warn('EmployeeMasterDatabase no retornó array:', data);
          return [];
        }
        return data;
      } catch (err) {
        console.error('Error EmployeeMasterDatabase:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false, // NUNCA hacer polling automático
    retry: 1, // Reducir reintentos
  });

  // 4. AUSENCIAS - Cache 5 min
  const absencesQuery = useQuery({
    queryKey: ['absences'],
    queryFn: () => isLocal ? Promise.resolve([]) : base44.entities.Absence.list('-fecha_inicio', 500),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 5. TIPOS DE AUSENCIAS - Cache 15 min (config estable, fuente única)
  const absenceTypesQuery = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => isLocal ? Promise.resolve([]) : base44.entities.AbsenceType.list('orden', 200),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 6. EQUIPOS - Cache 15 min
  const teamsQuery = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => isLocal ? Promise.resolve([]) : base44.entities.TeamConfig.list(),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 7. VACACIONES - Cache 30 min (muy estable)
  const vacationsQuery = useQuery({
    queryKey: ['vacations'],
    queryFn: () => isLocal ? Promise.resolve([]) : base44.entities.Vacation.list(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 8. FESTIVOS - Cache 1 hora (datos anuales)
  const holidaysQuery = useQuery({
    queryKey: ['holidays'],
    queryFn: () => isLocal ? Promise.resolve([]) : base44.entities.Holiday.list(),
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 9. MÁQUINAS - Cache 15 min - SOLO MachineMasterDatabase
  const machinesQuery = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      if (isLocal) return [];
      try {
        const masterData = await base44.entities.MachineMasterDatabase.list(undefined, 500);
        if (!Array.isArray(masterData)) return [];
        
        return masterData.map(m => ({
                  id: m.id,
                  nombre: m.nombre || '',
                  codigo: m.codigo_maquina || '',
                  marca: m.marca || '',
                  modelo: m.modelo || '',
                  tipo: m.tipo || '',
                  ubicacion: m.ubicacion || '',
                  orden: m.orden_visualizacion || 999,
                  estado: m.estado_operativo || 'Disponible',
                  procesos_configurados: m.procesos_configurados || [],
                  procesos_ids: Array.isArray(m.procesos_configurados) 
                    ? m.procesos_configurados.map(p => p?.process_id).filter(Boolean) 
                    : []
                })).sort((a, b) => (a.orden || 999) - (b.orden || 999));
      } catch (err) {
        console.error('Error fetching machines:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
  });

  // 10. MANTENIMIENTO - Cache 10 min
  const maintenanceQuery = useQuery({
    queryKey: ['maintenanceSchedules'],
    queryFn: async () => {
      if (isLocal) return [];
      try {
        return await base44.entities.MaintenanceSchedule.list('fecha_programada', 500);
      } catch (err) {
        console.warn('MaintenanceSchedule error:', err);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // 11. PROCESOS - Cache 15 min
  const processesQuery = useQuery({
    queryKey: ['processes'],
    queryFn: () => isLocal ? Promise.resolve([]) : base44.entities.Process.list('codigo', 200),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 12. TIPOS DE MANTENIMIENTO - Cache 30 min
  const maintenanceTypesQuery = useQuery({
    queryKey: ['maintenanceTypes'],
    queryFn: async () => {
      if (isLocal) return [];
      try {
        return await base44.entities.MaintenanceType.list('nombre', 100);
      } catch (err) {
        console.warn('MaintenanceType no existe, continuando', err);
        return [];
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  const allAbsenceTypes = absenceTypesQuery.data || [];

  const value = {
    // Usuario
    user: userQuery.data,
    userLoading: userQuery.isLoading,
    userError: userQuery.isError,
    
    // Empleado actual
    currentEmployee: employeeQuery.data,
    currentEmployeeLoading: employeeQuery.isLoading,
    
    // Datos maestros - EMPLEADOS
    employees: employeesQuery.data || [],
    masterEmployees: employeesQuery.data || [], // Alias para compatibilidad
    employeesLoading: employeesQuery.isLoading,
    
    // Datos maestros - AUSENCIAS
    absences: absencesQuery.data || [],
    absencesLoading: absencesQuery.isLoading,
    
    absenceTypes: allAbsenceTypes.filter(t => t?.activo !== false),
    absenceTypesAll: allAbsenceTypes,
    absenceTypesLoading: absenceTypesQuery.isLoading,
    
    // Datos maestros - EQUIPOS Y CALENDARIO
    teams: teamsQuery.data || [],
    teamsLoading: teamsQuery.isLoading,
    
    vacations: vacationsQuery.data || [],
    vacationsLoading: vacationsQuery.isLoading,
    
    holidays: holidaysQuery.data || [],
    holidaysLoading: holidaysQuery.isLoading,
    
    // Datos maestros - MÁQUINAS Y MANTENIMIENTO
    machines: machinesQuery.data || [],
    machinesLoading: machinesQuery.isLoading,
    
    maintenance: maintenanceQuery.data || [],
    maintenanceLoading: maintenanceQuery.isLoading,
    
    processes: processesQuery.data || [],
    processesLoading: processesQuery.isLoading,
    
    maintenanceTypes: maintenanceTypesQuery.data || [],
    maintenanceTypesLoading: maintenanceTypesQuery.isLoading,
    
    // Helper computed
    isAdmin: userQuery.data?.role === 'admin',
    isAuthenticated: !!userQuery.data,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/**
 * Hook para acceder a datos compartidos
 * USO: const { employees, absences, user } = useAppData();
 */
export function useAppData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useAppData debe usarse dentro de DataProvider");
  }
  return context;
}
