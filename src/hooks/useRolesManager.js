import { useState, useEffect, useCallback } from 'react';
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

  // Inicialización ÚNICA y CONTROLADA
  useEffect(() => {
    if (isDataLoading) return;

    // Si ya tenemos configuración local y está sucia, NO tocarla
    if (localConfig && isDirty) return;

    if (rolesConfig && Object.keys(rolesConfig).length > 0) {
      console.log("useRolesManager: Loaded remote configuration");
      setLocalConfig(JSON.parse(JSON.stringify(rolesConfig)));
    } else {
      console.log("useRolesManager: Initializing with default configuration");
      setLocalConfig(JSON.parse(JSON.stringify(DEFAULT_ROLES_CONFIG)));
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
    setIsSaving(true);
    try {
      if (!localConfig || Object.keys(localConfig).length === 0) {
        throw new Error("La configuración local está vacía. No se guardará.");
      }

      const configString = JSON.stringify(localConfig);
      console.log("useRolesManager: Saving config...", configString.length, "chars");

      // 1. Encontrar registro existente
      let allConfigs = [];
      try {
        allConfigs = await base44.entities.AppConfig.list('id', 1000) || [];
      } catch (e) {
        console.error("Error listing AppConfig:", e);
        allConfigs = [];
      }

      let matches = allConfigs.filter(c => c.config_key === 'roles_config' || c.key === 'roles_config');

      // Fallback filter
      if (matches.length === 0) {
         try {
             const f1 = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
             const f2 = await base44.entities.AppConfig.filter({ key: 'roles_config' });
             matches = [...(f1 || []), ...(f2 || [])];
             // Deduplicate by ID
             matches = matches.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
         } catch(e) { console.warn("Filter fallback failed", e); }
      }

      // 2. Limpiar duplicados y guardar
      let savedRecordId = null;

      if (matches.length > 0) {
        const targetId = matches[0].id;
        savedRecordId = targetId;
        
        if (matches.length > 1) {
          console.warn(`Cleaning up ${matches.length - 1} duplicate configs`);
          try {
             await Promise.all(matches.slice(1).map(m => base44.entities.AppConfig.delete(m.id)));
          } catch(e) { console.error("Error cleaning duplicates:", e); }
        }
        
        console.log(`useRolesManager: Updating existing config ID ${targetId}`);
        const updateResult = await base44.entities.AppConfig.update(targetId, { 
          config_key: 'roles_config',
          key: 'roles_config',
          value: configString 
        });
        console.log("Update result:", updateResult);
      } else {
        console.log("useRolesManager: Creating new config record");
        const createResult = await base44.entities.AppConfig.create({ 
          config_key: 'roles_config', 
          key: 'roles_config',
          value: configString 
        });
        console.log("Create result:", createResult);
        if (createResult && createResult.id) savedRecordId = createResult.id;
      }

      // 3. Espera de seguridad y Verificación INTELIGENTE
      await new Promise(r => setTimeout(r, 2000)); // Aumentado a 2s

      // Intentar leer ESPECÍFICAMENTE el registro guardado si tenemos ID
      let saved = null;
      if (savedRecordId) {
          try {
              // Intento de lectura directa por filtro de ID (más fiable que list)
              const direct = await base44.entities.AppConfig.filter({ id: savedRecordId });
              if (direct && direct.length > 0) {
                  saved = direct[0];
              } else {
                  // Fallback a list si filter falla
                   const allItems = await base44.entities.AppConfig.list('id', 2000) || [];
                   saved = allItems.find(i => i.id === savedRecordId);
              }
          } catch(e) { 
              console.warn("Direct read failed", e); 
              // Last resort list
              try {
                  const allItems = await base44.entities.AppConfig.list('id', 2000) || [];
                  saved = allItems.find(i => i.id === savedRecordId);
              } catch(ex) { console.error("List fallback failed", ex); }
          }
      }

      if (!saved) {
         // Fallback a búsqueda general por clave
         try {
             const f1 = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
             if (f1 && f1.length > 0) saved = f1[0];
         } catch(e) {}
         
         if (!saved) {
             const verifyList = await base44.entities.AppConfig.list('id', 1000) || [];
             saved = verifyList.find(c => c.config_key === 'roles_config' || c.key === 'roles_config');
         }
      }
      
      const savedValue = saved && saved.value ? saved.value : "";
      const savedId = saved ? saved.id : "unknown";
      console.log(`Verification: Expected ${configString.length} chars, Got ${savedValue.length} chars. ID: ${savedId}`);

      if (!saved || Math.abs(savedValue.length - configString.length) > 50) {
        console.error("CRITICAL: Save verification failed. Data not persisted correctly.");
        console.log("Sent length:", configString.length);
        console.log("Received length:", savedValue.length);
        
        // Reintento de emergencia (fuerza bruta)
        if (savedRecordId) {
            console.warn("Attempting emergency retry update...");
            try {
              await base44.entities.AppConfig.update(savedRecordId, { value: configString });
            } catch(e) { console.error("Retry failed", e); }
        }
        
        toast.warning("Posible error de sincronización. Por favor espera unos segundos y vuelve a guardar si los cambios no persisten.");
      } else {
        toast.success("Configuración guardada y verificada.");
      }

      // 5. Invalidación
      await queryClient.invalidateQueries({ queryKey: ['rolesConfig'] });
      if (refetchRolesConfig) {
          console.log("Refetching roles config...");
          await refetchRolesConfig();
      }
      
      setIsDirty(false);

    } catch (error) {
      console.error("useRolesManager: Save error", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
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
    resetConfig
  };
}
