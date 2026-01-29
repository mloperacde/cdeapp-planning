import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppData } from '@/components/data/DataProvider';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Roles por defecto (copia de seguridad del sistema anterior)
export const DEFAULT_ROLES_CONFIG = {
  roles: {
    admin: {
      name: "Administrador",
      permissions: {
        isAdmin: true,
        canViewSalary: true,
        canViewPersonalData: true,
        canViewBankingData: true,
        canEditEmployees: true,
        canApproveAbsences: true,
        canManageMachines: true,
        canViewReports: true,
        canConfigureSystem: true,
      },
      isSystem: true
    },
    hr_manager: {
      name: "Gerente RRHH",
      permissions: {
        isAdmin: false,
        canViewSalary: true,
        canViewPersonalData: true,
        canViewBankingData: true,
        canEditEmployees: true,
        canApproveAbsences: true,
        canManageMachines: false,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    shift_manager_production: {
      name: "Jefe Turno Producción",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: true,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: true,
        canManageMachines: true,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    shift_manager_quality: {
      name: "Jefe Turno Calidad",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: true,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: true,
        canManageMachines: false,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    shift_manager_maintenance: {
      name: "Jefe Turno Mantenimiento",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: true,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: true,
        canManageMachines: true,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    prod_supervisor: {
      name: "Supervisor Producción",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: true,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: true,
        canManageMachines: true,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    maintenance_tech: {
      name: "Técnico Mantenimiento",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: false,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: false,
        canManageMachines: true,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    operator: {
      name: "Operario",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: false,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: false,
        canManageMachines: false,
        canViewReports: true,
        canConfigureSystem: false,
      }
    },
    user: {
      name: "Usuario Estándar",
      permissions: {
        isAdmin: false,
        canViewSalary: false,
        canViewPersonalData: false,
        canViewBankingData: false,
        canEditEmployees: false,
        canApproveAbsences: false,
        canManageMachines: false,
        canViewReports: false,
        canConfigureSystem: false,
      },
      isSystem: true
    },
  },
  user_assignments: {} // email -> role_id
};

export function useRolesManager() {
  const { rolesConfig, refetchRolesConfig, isLoading: isDataLoading } = useAppData();
  const queryClient = useQueryClient();

  // Estado local
  const [localConfig, setLocalConfig] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Refs para control de concurrencia y seguridad
  const isMountedRef = useRef(true);
  const currentSaveIdRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Inicialización ÚNICA y CONTROLADA
  useEffect(() => {
    if (isDataLoading) return;

    // Si ya tenemos configuración local y está sucia, NO tocarla
    if (localConfig && isDirty) return;

    // GLOBAL GRACE PERIOD using localStorage to survive unmounts/reloads
    // Check if a save happened recently (across any instance/tab)
    const lastSaveStr = localStorage.getItem('lastRolesConfigSaveTime');
    const lastSaveTime = lastSaveStr ? parseInt(lastSaveStr, 10) : 0;
    const timeSinceSave = Date.now() - lastSaveTime;

    // Increased to 15s to ensure eventual consistency propagates
    if (timeSinceSave < 15000) {
        console.log("useRolesManager: Ignoring remote config update due to recent save (Grace Period - Global)");
        return;
    }

    if (rolesConfig && Object.keys(rolesConfig).length > 0) {
      console.log("useRolesManager: Loaded remote configuration");
      setLocalConfig(JSON.parse(JSON.stringify(rolesConfig)));
    } else {
      // Solo inicializar con defaults si NO tenemos nada local
      if (!localConfig) {
          console.log("useRolesManager: Initializing with default configuration");
          setLocalConfig(JSON.parse(JSON.stringify(DEFAULT_ROLES_CONFIG)));
      }
    }
    setIsLoading(false);
  }, [rolesConfig, isDataLoading]); // Quitamos isDirty y localConfig de deps para evitar bucles

  // Acciones de modificación
  const updatePermission = useCallback((roleId, permKey, checked) => {
    setLocalConfig(prev => {
      const role = prev.roles[roleId];
      return {
        ...prev,
        roles: {
          ...prev.roles,
          [roleId]: {
            ...role,
            permissions: {
              ...role.permissions,
              [permKey]: checked
            }
          }
        }
      };
    });
    setIsDirty(true);
  }, []);

  const updatePagePermission = useCallback((roleId, path, checked) => {
    setLocalConfig(prev => {
      const role = prev.roles[roleId];
      return {
        ...prev,
        roles: {
          ...prev.roles,
          [roleId]: {
            ...role,
            page_permissions: {
              ...(role.page_permissions || {}),
              [path]: checked
            }
          }
        }
      };
    });
    setIsDirty(true);
  }, []);

  const updateUserAssignment = useCallback((email, roleId) => {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    
    setLocalConfig(prev => {
      const newAssignments = { ...prev.user_assignments };
      if (roleId === "none") {
        delete newAssignments[cleanEmail];
      } else {
        newAssignments[cleanEmail] = roleId;
      }
      return { ...prev, user_assignments: newAssignments };
    });
    setIsDirty(true);
  }, []);

  const addRole = useCallback((newRoleName, newRoleId) => {
    const cleanId = newRoleId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    if (localConfig?.roles[cleanId]) {
      throw new Error("El ID del rol ya existe");
    }

    setLocalConfig(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        [cleanId]: {
          name: newRoleName,
          permissions: { ...DEFAULT_ROLES_CONFIG.roles.user.permissions },
          isSystem: false
        }
      }
    }));
    setIsDirty(true);
  }, [localConfig]);

  const deleteRole = useCallback((roleId) => {
    if (localConfig?.roles[roleId]?.isSystem) {
      throw new Error("No se pueden eliminar roles del sistema");
    }

    setLocalConfig(prev => {
      const newRoles = { ...prev.roles };
      delete newRoles[roleId];
      return { ...prev, roles: newRoles };
    });
    setIsDirty(true);
  }, [localConfig]);

  // Acción de Guardado
  const saveConfig = async () => {
    if (!isMountedRef.current) return;
    setIsSaving(true);
    
    // Increment save ID to invalidate previous verification loops
    currentSaveIdRef.current += 1;
    const thisSaveId = currentSaveIdRef.current;
    
    try {
      if (!localConfig || Object.keys(localConfig).length === 0) {
        throw new Error("La configuración local está vacía. No se guardará.");
      }

      // IMPORTANTE: Asegurar que el objeto a guardar sea válido y parseable
      const configString = JSON.stringify(localConfig);
      // Validación simple de integridad
      const parsedCheck = JSON.parse(configString); 
      
      console.log("useRolesManager: Saving config...", configString.length, "chars");

      // Update Global Grace Period Timestamp immediately
      localStorage.setItem('lastRolesConfigSaveTime', Date.now().toString());

      // 1. Encontrar registro existente (Búsqueda Exhaustiva y Limpieza)
      let matches = [];
      try {
          // Intento 1: Filtro directo (Rápido)
          const f1 = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
          if (f1 && f1.length > 0) matches = f1;
          
          // Intento 2: Fallback a listado si filtro falla o vacío
          if (matches.length === 0) {
             const all = await base44.entities.AppConfig.list('id', 2000) || [];
             matches = all.filter(c => c.config_key === 'roles_config' || c.key === 'roles_config');
          }
      } catch(e) { console.warn("Search failed", e); }

      // 2. ESTRATEGIA DE LIMPIEZA PREVENTIVA (Agresiva)
      // Si hay duplicados, borrar TODOS menos uno para sanear la base de datos antes de escribir.
      if (matches.length > 1) {
           console.warn(`Cleaning up ${matches.length - 1} duplicate configs BEFORE save`);
           const toKeep = matches[0]; 
           const toDelete = matches.slice(1);
           // Ejecutar borrado en paralelo y capturar errores individuales
           await Promise.all(toDelete.map(m => base44.entities.AppConfig.delete(m.id).catch(e => console.warn("Delete failed", e))));
           matches = [toKeep]; 
      }

      let savedRecordId = matches.length > 0 ? matches[0].id : null;
      let performCreate = false;

      // 3. OPERACIÓN DE ESCRITURA
      if (savedRecordId) {
        console.log(`useRolesManager: Updating existing config ID ${savedRecordId}`);
        try {
            await base44.entities.AppConfig.update(savedRecordId, { 
                config_key: 'roles_config',
                key: 'roles_config',
                value: configString 
            });
        } catch(e) {
            console.error("Update failed, switching to create strategy", e);
            performCreate = true; 
        }
      } else {
        performCreate = true;
      }

      if (performCreate) {
        console.log("useRolesManager: Creating new config record");
        const createResult = await base44.entities.AppConfig.create({ 
          config_key: 'roles_config', 
          key: 'roles_config',
          value: configString 
        });
        if (createResult && createResult.id) savedRecordId = createResult.id;
      }

      // --- ACTUALIZACIÓN OPTIMISTA UI ---
      // Actualizar caché INMEDIATAMENTE con los datos que acabamos de enviar.
      // No esperamos a la verificación del servidor para actualizar la vista.
      queryClient.setQueryData(['rolesConfig'], parsedCheck);
      localStorage.setItem('lastRolesConfigSaveTime', Date.now().toString()); // Update again after success
      setIsDirty(false); 
      toast.success("Configuración guardada.");

      // 4. VERIFICACIÓN SILENCIOSA EN SEGUNDO PLANO
      // Verificamos persistencia real sin bloquear la UI
      (async () => {
          let verified = false;
          let attempts = 0;
          const maxAttempts = 5;

          while (attempts < maxAttempts && !verified) {
            // Check if a new save has started or component unmounted, abort if so
            if (!isMountedRef.current || currentSaveIdRef.current !== thisSaveId) {
                console.log("Verification aborted due to new save operation or unmount.");
                return;
            }

            attempts++;
            const waitTime = 1000 + (attempts * 1500); // 2.5s, 4s, 5.5s...
            console.log(`Background Verification attempt ${attempts}/${maxAttempts}...`);
            await new Promise(r => setTimeout(r, waitTime));

            // Check again after wait
            if (!isMountedRef.current || currentSaveIdRef.current !== thisSaveId) return;

            let saved = null;
            try {
                if (savedRecordId) {
                    const direct = await base44.entities.AppConfig.filter({ id: savedRecordId });
                    if (direct && direct.length > 0) saved = direct[0];
                }
                if (!saved) {
                     const f = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
                     if (f && f.length > 0) saved = f[0];
                }
            } catch(e) {}

            const savedValue = saved?.value || "";
            // Margen de tolerancia pequeño por diferencias de encoding
            if (saved && Math.abs(savedValue.length - configString.length) <= 50) {
                verified = true;
                console.log("Verification SUCCESS");
            }
          }

          // Check one last time before nuclear
          if (!isMountedRef.current || currentSaveIdRef.current !== thisSaveId) return;

          // 5. ESTRATEGIA DE EMERGENCIA FINAL (NUCLEAR)
          if (!verified) {
            console.error("CRITICAL: Verification failed. Executing NUCLEAR OPTION.");
            toast.message("Sincronizando...", { description: "Detectada inconsistencia, re-guardando..." });

            try {
                // Borrar TODO lo relacionado para asegurar estado limpio
                const zombies = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
                if (zombies?.length) await Promise.all(zombies.map(z => base44.entities.AppConfig.delete(z.id)));
                
                // Crear de nuevo
                const newRec = await base44.entities.AppConfig.create({ 
                    config_key: 'roles_config', 
                    key: 'roles_config',
                    value: configString 
                });
                
                if (newRec?.id) {
                    console.log("Nuclear option success. New ID:", newRec.id);
                    toast.success("Sincronización completada.");
                    
                    // CRITICAL: Update cache with new data to prevent reversion
                    // If we don't do this, next refetch might get empty/old data and overwrite our work
                    queryClient.setQueryData(['rolesConfig'], parsedCheck);
                    localStorage.setItem('lastRolesConfigSaveTime', Date.now().toString()); // Extend protection
                    
                    // Trigger refetch just to be sure, but we are protected by localStorage
                    if (refetchRolesConfig) refetchRolesConfig();
                }
            } catch(e) {
                console.error("Nuclear option failed", e);
                toast.error("Error de sincronización. Por favor recarga la página.");
            }
          }
      })(); // Ejecución asíncrona background

    } catch (error) {
      console.error("useRolesManager: Save error", error);
      toast.error("Error al guardar: " + error.message);
      setIsDirty(true); // Permitir reintentar
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  };

  const resetConfig = useCallback(() => {
    if (rolesConfig) {
      setLocalConfig(JSON.parse(JSON.stringify(rolesConfig)));
    } else {
      setLocalConfig(JSON.parse(JSON.stringify(DEFAULT_ROLES_CONFIG)));
    }
    setIsDirty(false);
    toast.info("Cambios descartados");
  }, [rolesConfig]);

  const forceCleanup = async () => {
    if (!isMountedRef.current) return;
    setIsSaving(true);
    try {
        toast.info("Iniciando limpieza de registros obsoletos...");
        
        // 1. Buscar todos los registros
        let matches = [];
        try {
            const f1 = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
            if (f1 && f1.length > 0) matches = f1;
            
            if (matches.length === 0) {
                const all = await base44.entities.AppConfig.list('id', 2000) || [];
                matches = all.filter(c => c.config_key === 'roles_config' || c.key === 'roles_config');
            }
        } catch(e) { 
            console.warn("Search failed", e);
            throw new Error("No se pudieron buscar los registros: " + e.message);
        }

        if (matches.length <= 1) {
            toast.info("El sistema está limpio. No se encontraron duplicados.");
            return;
        }

        // 2. Ordenar por fecha de creación (o ID si no hay fecha) para conservar el más reciente
        // Asumimos que ID más alto es más reciente si son autoincrementales, o usamos created_at si existe
        matches.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
            const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
            return dateB - dateA; // Descending (newest first)
        });

        const toKeep = matches[0];
        const toDelete = matches.slice(1);

        console.log(`Keeping ID ${toKeep.id}, deleting ${toDelete.length} duplicates`);
        
        // 3. Borrar
        let deletedCount = 0;
        await Promise.all(toDelete.map(async (m) => {
            try {
                await base44.entities.AppConfig.delete(m.id);
                deletedCount++;
            } catch (e) {
                console.warn(`Failed to delete ${m.id}`, e);
            }
        }));

        if (deletedCount > 0) {
            toast.success(`Limpieza completada: ${deletedCount} registros eliminados.`);
            // Refetch to ensure we have the latest data
            if (refetchRolesConfig) refetchRolesConfig();
        } else {
            toast.warning("No se pudieron eliminar los registros duplicados.");
        }

    } catch (e) {
        console.error("Cleanup failed", e);
        toast.error("Error durante la limpieza: " + e.message);
    } finally {
        if (isMountedRef.current) setIsSaving(false);
    }
  };

  return {
    localConfig,
    isDirty,
    isSaving,
    isLoading,
    updatePermission,
    updatePagePermission,
    updateUserAssignment,
    addRole,
    deleteRole,
    saveConfig,
    resetConfig,
    forceCleanup
  };
}
