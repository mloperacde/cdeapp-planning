import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getMachineAlias } from "@/utils/machineAlias";
import { toast } from "sonner";

/**
 * PROVEEDOR CENTRALIZADO DE DATOS
 * Fuente única de verdad para toda la aplicación
 * Evita llamadas duplicadas y respeta rate limits
 */

const DataContext = createContext(null);

export function DataProvider({ children }) {
  // DIAGNOSTIC LOG
  console.log("DataProvider: Mounting...");

  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  // isLocal NO debe impedir cargar datos si estamos usando un mock local o si queremos probar persistencia
  // El control de "si es local, no hay backend" es demasiado agresivo.
  // Dejamos que base44Client decida si usa mock o real.
  const isLocal = false; // Forzamos a false para que intente cargar datos siempre (Mock o Real)
  
  // 1. USUARIO ACTUAL - Cache 5 min
  const userQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      if (isLocal) return null;
      try {
        const me = await base44.auth.me();
        // console.log("DataProvider: User authenticated:", me.email);
        return me;
      } catch (error) {
        console.error("DataProvider: Auth Check Failed:", error);
        // If error is 401/403, return null (not authenticated)
        // If error is 404 (App Not Found), it's critical but we return null to avoid crash
        return null;
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 2 * 60 * 60 * 1000,
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
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 2 * 60 * 60 * 1000,
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
    staleTime: 60 * 60 * 1000, // 1 hora (estables)
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false, // NUNCA hacer polling automático
    retry: 1, // Reducir reintentos
  });

  // 4. AUSENCIAS - Cache 5 min
  const absencesQuery = useQuery({
    queryKey: ['absences'],
    queryFn: () => isLocal ? Promise.resolve([]) : base44.entities.Absence.list('-fecha_inicio', 500),
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 5. TIPOS DE AUSENCIAS - Cache 15 min (config estable, fuente única)
  const absenceTypesQuery = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => isLocal ? Promise.resolve([]) : base44.entities.AbsenceType.list('orden', 200),
    staleTime: Infinity, // Config is stable
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // 6. EQUIPOS - Cache 15 min
  const teamsQuery = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => isLocal ? Promise.resolve([]) : base44.entities.TeamConfig.list(),
    staleTime: Infinity, // Config is stable
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // 7. VACACIONES - Cache 30 min (muy estable)
  const vacationsQuery = useQuery({
    queryKey: ['vacations'],
    queryFn: () => isLocal ? Promise.resolve([]) : base44.entities.Vacation.list(),
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 8. FESTIVOS - Cache 1 hora (datos anuales)
  const holidaysQuery = useQuery({
    queryKey: ['holidays'],
    queryFn: () => isLocal ? Promise.resolve([]) : base44.entities.Holiday.list(),
    staleTime: Infinity, // Annual data
    gcTime: Infinity,
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
        
        return masterData.map(m => {
          const alias = getMachineAlias(m);
          
          return {
                  id: m.id,
                  nombre: m.nombre,
                  codigo: m.codigo_maquina || m.codigo,
                  marca: m.marca || '',
                  modelo: m.modelo || '',
                  tipo: m.tipo || '',
                  ubicacion: m.ubicacion,
                  alias: alias, // Standard display name
                  orden: m.orden_visualizacion || 999,
                  estado: m.estado_operativo || 'Disponible',
                  procesos_configurados: m.procesos_configurados || [],
                  procesos_ids: Array.isArray(m.procesos_configurados) 
                    ? m.procesos_configurados.map(p => p?.process_id).filter(Boolean) 
                    : []
                };
        }).sort((a, b) => (a.orden || 999) - (b.orden || 999));
      } catch (err) {
        console.error('Error fetching machines:', err);
        return [];
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hora (estables)
    gcTime: 2 * 60 * 60 * 1000,
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
    staleTime: 30 * 60 * 1000, // 30 min
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // 11. PROCESOS - Cache 15 min
  const processesQuery = useQuery({
    queryKey: ['processes'],
    queryFn: () => isLocal ? Promise.resolve([]) : base44.entities.Process.list('codigo', 200),
    staleTime: Infinity, // Config is stable
    gcTime: Infinity,
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
    staleTime: Infinity, // Config is stable
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  // 13. CONFIGURACIÓN DE ROLES
  const rolesConfigQuery = useQuery({
    queryKey: ['rolesConfig'],
    queryFn: async () => {
      if (isLocal) return null;
      try {
          const results = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
          
          if (!results || results.length === 0) {
              return null;
          }
          
          const config = results[0];
          if (!config) return null;

          let jsonString = config.value || config.app_subtitle || config.description;
          if (!jsonString) return null;

          try {
            const parsed = JSON.parse(jsonString);
            return parsed;
          } catch (error) {
            console.error("Error parseando roles config:", error);
            return null;
          }
        } catch (err) {
          console.error('Error loading roles configuration:', err);
          return null;
        }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - evitar recargas constantes
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // 14. BRANDING
  const brandingConfigQuery = useQuery({
    queryKey: ['brandingConfig'],
    queryFn: async () => {
      if (isLocal) return null;
      try {
        const configs = await base44.entities.AppConfig.filter({ config_key: 'branding' });
        
        if (!configs || configs.length === 0) return null;

        const sortedConfigs = configs.sort((a, b) => {
            const getTs = (d) => {
                const date = new Date(d.updated_at || d.created_at || 0);
                return isNaN(date.getTime()) ? 0 : date.getTime();
            };
            return getTs(b) - getTs(a);
        });

        const config = sortedConfigs[0];
        if (!config) return null;

        if (config.value) {
          try {
            return JSON.parse(config.value);
          } catch (e) {
            console.warn('Error parsing branding config value', e);
            return null;
          }
        }
        
        return config;
      } catch (err) {
        console.warn('No branding configuration found');
        return null;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
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
    
    rolesConfig: rolesConfigQuery.data,
    rolesConfigLoading: rolesConfigQuery.isLoading,
    refetchRolesConfig: rolesConfigQuery.refetch,

    branding: brandingConfigQuery.data,
    brandingConfig: brandingConfigQuery.data, // Alias
    brandingConfigLoading: brandingConfigQuery.isLoading,
    
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
    console.error("useAppData: Context is null! DataProvider might not be in tree or duplicated.");
    throw new Error("useAppData debe usarse dentro de DataProvider");
  }
  return context;
}