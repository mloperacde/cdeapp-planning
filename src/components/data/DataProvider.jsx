import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getMachineAlias } from "@/utils/machineAlias";

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

  // 13. CONFIGURACIÓN DE ROLES - Cache 5 min
  const rolesConfigQuery = useQuery({
    queryKey: ['rolesConfig'],
    queryFn: async () => {
      if (isLocal) return null;
      try {
          console.log("DataProvider: Buscando configuración de roles (Aggressive)...");
          
          // CLIENT-SIDE CONSISTENCY CHECK
          // If we recently saved data, ensure we don't return older data.
          let minRequiredTimestamp = 0;
          try {
              const localTs = localStorage.getItem('last_save_ts_roles_config');
              if (localTs) minRequiredTimestamp = parseInt(localTs, 10);
          } catch(e) {}

          const MAX_RETRIES = 10;
          const RETRY_DELAY = 1000;

          let config = null;
          let bestCandidateSoFar = null;

          for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
               if (attempt > 0) {
                   console.log(`[RolesConfig] Attempt ${attempt}: Data stale or missing, retrying in ${RETRY_DELAY}ms...`);
                   await new Promise(r => setTimeout(r, RETRY_DELAY));
               }

               // ESTRATEGIA AGRESIVA DE LECTURA (Paralela)
               const [byConfigKey, byKey, recentItems] = await Promise.all([
                  base44.entities.AppConfig.filter({ config_key: 'roles_config' }).catch(() => []),
                  base44.entities.AppConfig.filter({ key: 'roles_config' }).catch(() => []),
                  base44.entities.AppConfig.list('-updated_at', 50).catch(() => [])
               ]);
     
               // Recolectar candidatos
               let candidates = [...(byConfigKey || []), ...(byKey || [])];
               
               // Buscar en lista reciente (para vencer lag de indexación)
               const recentCandidates = recentItems.filter(r => r.key === 'roles_config' || r.config_key === 'roles_config');
               candidates = [...candidates, ...recentCandidates];
               
               // Deduplicar por ID
               candidates = Array.from(new Map(candidates.map(c => [c.id, c])).values());
     
               // Ordenar por fecha de actualización (más reciente primero)
               // FIX: Handle invalid dates and prioritize internal timestamps
               candidates.sort((a, b) => {
                   const getTs = (item) => {
                       // 1. Try internal timestamp (most reliable)
                       try {
                           const val = item.value || item.description || item.app_subtitle;
                           if (val && val.startsWith('{')) {
                               const p = JSON.parse(val);
                               if (p._ts) return p._ts;
                               if (p.timestamp) return p.timestamp;
                           }
                       } catch(e) {}
                       
                       // 2. Fallback to record timestamp
                       const d = new Date(item.updated_at || item.created_at || 0);
                       return isNaN(d.getTime()) ? 0 : d.getTime();
                   };
                   return getTs(b) - getTs(a);
               });
     
               config = candidates.length > 0 ? candidates[0] : null;
               
               if (config) {
                   bestCandidateSoFar = config;
               }

               // Parse to check timestamp inside
               if (config && minRequiredTimestamp > 0) {
                    let ts = 0;
                    try {
                        const val = config.value || config.description || config.app_subtitle;
                        if (val && val.startsWith('{')) {
                             const p = JSON.parse(val);
                             if (p._ts) ts = p._ts;
                        }
                    } catch(e) {}
                    
                    // Fallback if no internal ts
                    if (ts === 0) {
                        const d = new Date(config.updated_at);
                        if (!isNaN(d.getTime())) ts = d.getTime();
                    }

                    if (ts > 0 && ts < minRequiredTimestamp) {
                         console.warn(`[RolesConfig] Found TS ${ts} < Required ${minRequiredTimestamp}. Retrying...`);
                         config = null; // Force retry
                         continue;
                    }
               }

               if (config) break; // Found good config
          }
          
          if (!config && bestCandidateSoFar) {
              console.warn(`[RolesConfig] Consistency Timeout. Returning best available candidate.`);
              config = bestCandidateSoFar;
          }

          if (!config) {
              // Silently fail or debug log
              return null;
          }

          if (!config?.value) {
              // INFO: Esto es normal si el backend rechaza el payload en 'value' pero lo aceptó en 'description'
              const hasDescriptionBackup = config?.description && config.description.startsWith('{');
              const hasLocalBackup = typeof localStorage !== 'undefined' && localStorage.getItem('roles_config_backup');
              
              if (hasDescriptionBackup) {
                  config.value = config.description;
              } 
              else if (hasLocalBackup) {
                  const localBackup = localStorage.getItem('roles_config_backup');
                  if (localBackup && localBackup.startsWith('{')) {
                       config.value = localBackup;
                  }
              }
              
              if (!config.value) {
                   console.debug("DataProvider: Configuración de roles no inicializada (usando defaults).");
                   return {
                       roles: {
                           admin: { permissions: { isAdmin: true } },
                           user: { permissions: { isAdmin: false } }
                       },
                       user_assignments: {}
                   };
              }
          }

          try {
            let jsonString = config.value;
            
            // DETECCIÓN INTELIGENTE DE FORMATO
            // Si no parece JSON (no empieza por {), asumimos que es Base64 y decodificamos
            if (jsonString && !jsonString.trim().startsWith('{')) {
                try {
                    jsonString = decodeURIComponent(escape(atob(jsonString)));
                } catch (e) {
                    // Fail silently or debug
                }
            }

            const parsed = JSON.parse(jsonString);
            
            // v8 SUPPORT: Direct ID Linking
            if (parsed._v === 8 && parsed._chunk_ids && Array.isArray(parsed._chunk_ids)) {
                 try {
                     const chunkPromises = parsed._chunk_ids.map(id => base44.entities.AppConfig.get(id));
                     const chunkResults = await Promise.all(chunkPromises);
                     
                     let fullString = "";
                     chunkResults.forEach((res, idx) => {
                         if (res && (res.value || res.description)) {
                             fullString += (res.value || res.description);
                         } else {
                             console.warn(`[DataProvider] Missing chunk ${idx} (${parsed._chunk_ids[idx]})`);
                         }
                     });
                     
                     if (!fullString) return parsed.data || null;

                     try {
                         const reassembled = JSON.parse(fullString);
                         // Handle v2 compression inside v8 payload if necessary
                         if (reassembled.v === 2 && reassembled.r) {
                             // Use v2 logic below
                             parsed.v = 2; 
                             parsed.r = reassembled.r;
                             parsed.d = reassembled.d;
                             parsed.ua = reassembled.ua;
                             // Fall through to v2 logic
                         } else {
                             return reassembled;
                         }
                     } catch(e) {
                         console.warn("Failed to parse reassembled v8 content", e);
                         return parsed.data || null;
                     }

                 } catch(e) {
                     console.error("[DataProvider] v8 Chunk retrieval failed", e);
                     return parsed.data || null;
                 }
            }

            // LÓGICA DE REENSAMBLADO DE CHUNKS (v3)
            if (parsed.v === 3 && parsed.is_chunked) {
                try {
                    // Fetch all chunks in parallel
                    const chunkPromises = [];
                    for(let i = 0; i < parsed.total_chunks; i++) {
                        chunkPromises.push(base44.entities.AppConfig.filter({ config_key: `roles_config_chunk_${i}` }));
                    }
                    
                    const chunkResults = await Promise.all(chunkPromises);
                    let fullString = "";
                    
                    chunkResults.forEach((res, idx) => {
                        if (res && res.length > 0 && res[0].value) {
                            fullString += res[0].value;
                        } else {
                            throw new Error(`Falta el chunk ${idx}`);
                        }
                    });
                    
                    // Parseamos el string completo (que debería ser un v2 compressed config)
                    const reassembled = JSON.parse(fullString);
                    
                    // Si es v2, lo procesamos con la lógica de v2
                    if (reassembled.v === 2) {
                         // Recursive call logic or just proceed to v2 block below?
                         // Better to just update parsed variable and fall through
                         // parsed = reassembled; // Can't reassign const
                         
                         // Quick hack: Execute v2 logic here
                         const dictionary = reassembled.d;
                         const roles = {};
                         Object.keys(reassembled.r).forEach(roleId => {
                            const cRole = reassembled.r[roleId];
                            const page_permissions = {};
                            if (cRole.pp) {
                                cRole.pp.forEach(idx => {
                                    if (dictionary[idx]) page_permissions[dictionary[idx]] = true;
                                });
                            }
                            roles[roleId] = {
                                name: cRole.n,
                                is_strict: !!cRole.s,
                                permissions: cRole.p || {},
                                page_permissions,
                                isSystem: cRole.sys
                            };
                        });
                        return { roles, user_assignments: reassembled.ua || {} };
                    }
                    
                    return reassembled;

                } catch (chunkError) {
                    console.error("DataProvider: Error reensamblando chunks", chunkError);
                    // Fallback a backup local si existe
                    const localBackup = typeof localStorage !== 'undefined' ? localStorage.getItem('roles_config_backup') : null;
                    if (localBackup) {
                         console.warn("DataProvider: Usando backup local tras fallo de chunks.");
                         // El backup local es el string v2 comprimido
                         const backupParsed = JSON.parse(localBackup);
                         if (backupParsed.v === 2) {
                             // Copiar lógica v2... (DRY violation but safe)
                             const dictionary = backupParsed.d;
                             const roles = {};
                             Object.keys(backupParsed.r).forEach(roleId => {
                                const cRole = backupParsed.r[roleId];
                                const page_permissions = {};
                                if (cRole.pp) {
                                    cRole.pp.forEach(idx => {
                                        if (dictionary[idx]) page_permissions[dictionary[idx]] = true;
                                    });
                                }
                                roles[roleId] = {
                                    name: cRole.n,
                                    is_strict: !!cRole.s,
                                    permissions: cRole.p || {},
                                    page_permissions,
                                    isSystem: cRole.sys
                                };
                            });
                            return { roles, user_assignments: backupParsed.ua || {} };
                         }
                    }
                    return null;
                }
            }

            // LÓGICA DE DESCOMPRESIÓN (v2)
            if (parsed.v === 2 && parsed.r && parsed.d) {
                console.log("DataProvider: Detectada configuración comprimida (v2). Descomprimiendo...");
                const dictionary = parsed.d;
                const roles = {};
                
                Object.keys(parsed.r).forEach(roleId => {
                    const cRole = parsed.r[roleId];
                    const page_permissions = {};
                    if (cRole.pp) {
                        cRole.pp.forEach(idx => {
                            if (dictionary[idx]) {
                                page_permissions[dictionary[idx]] = true;
                            }
                        });
                    }
                    
                    roles[roleId] = {
                        name: cRole.n,
                        is_strict: !!cRole.s,
                        permissions: cRole.p || {},
                        page_permissions,
                        isSystem: cRole.sys // Opcional, si lo guardamos
                    };
                });
                
                const decompressed = {
                    roles,
                    user_assignments: parsed.ua || {}
                };
                console.log(`DataProvider: Descompresión exitosa. Roles: ${Object.keys(roles).length}`);
                return decompressed;
            }

            console.log(`DataProvider: Configuración parseada correctamente. Roles: ${Object.keys(parsed.roles || {}).length}, Asignaciones: ${Object.keys(parsed.user_assignments || {}).length}`);
            return parsed;
          } catch (parseError) {
            console.error("CRITICAL: Error parsing roles_config JSON:", parseError, "Raw value:", config.value);
            // Intentar recuperar si es un problema de doble stringify
            try {
               const doubleParsed = JSON.parse(JSON.parse(config.value));
               console.warn("Recovered roles_config from double-stringified JSON");
               return doubleParsed;
            } catch(e) {
               // Fallback final: devolver null para evitar crash, pero loguear fuerte
               return null;
            }
          }
        } catch (err) {
          console.error('Error loading roles configuration:', err);
          return null;
        }
    },
    staleTime: 0, // Desactivar cache para asegurar que siempre se obtenga la última versión
    gcTime: 0,    // No mantener en memoria basura
    refetchOnWindowFocus: true, // Refrescar al volver a la ventana
  });

  // 14. BRANDING - Cache 1 hora (cambia poco) -> Ahora staleTime 0 para debug y reactividad inmediata
  const brandingConfigQuery = useQuery({
    queryKey: ['brandingConfig'],
    queryFn: async () => {
      if (isLocal) return null;
      try {
        const configs = await base44.entities.AppConfig.filter({ config_key: 'branding' });
        // Log para depuración
        // console.log("DataProvider: Branding Configs found:", configs);
        
        // Si hay múltiples, intentamos encontrar el más reciente por updated_at o created_at
        // O simplemente tomamos el último de la lista si asumimos orden de inserción
        // Pero para seguridad, tomamos el primero que suele ser el "activo" si la lógica de update es correcta.
        // MEJORA: Ordenar por fecha de actualización descendente para tomar siempre el último modificado.
        
        if (!configs || configs.length === 0) return null;

        const sortedConfigs = configs.sort((a, b) => {
            const getTs = (d) => {
                const date = new Date(d.updated_at || d.created_at || 0);
                return isNaN(date.getTime()) ? 0 : date.getTime();
            };
            return getTs(b) - getTs(a); // Descendente (más nuevo primero)
        });

        const config = sortedConfigs[0];
        
        if (!config) return null;

        // Priorizamos el campo 'value' con JSON
        if (config.value) {
          try {
            return JSON.parse(config.value);
          } catch (e) {
            console.warn('Error parsing branding config value', e);
            return null;
          }
        }
        
        // Fallback: retornamos el objeto completo si no tiene value (legacy o error)
        return config;
      } catch (err) {
        console.warn('No branding configuration found');
        return null;
      }
    },
    staleTime: 0, // Siempre fresco para asegurar cambios inmediatos
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: true,
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
