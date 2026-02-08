import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppData } from '@/components/data/DataProvider';
import { base44 } from '@/api/base44Client';
import { usePersistentAppConfig } from './usePersistentAppConfig';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { MENU_STRUCTURE } from '@/config/menuConfig';

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
      is_strict: true,
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
      },
      page_permissions: {
        '/Dashboard': true,
        '/AdvancedHRDashboard': true,
        '/MasterEmployeeDatabase': true,
        '/AbsenceManagement': true,
        '/SkillMatrix': true,
        '/EmployeeOnboarding': true,
        '/AttendanceManagement': true,
        '/CommitteeManagement': true,
        '/IncentiveManagement': true,
        '/Reports': true,
        '/EmployeeAbsenceInfo': true
      }
    },
    shift_manager_production: {
      name: "Jefe Turno Producción",
      is_strict: true,
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
      },
      page_permissions: {
        '/Dashboard': true,
        '/DailyPlanning': true,
        '/EmployeesShiftManager': true,
        '/ProductionPlanning': true,
        '/OrderImport': true,
        '/ShiftManagers': true,
        '/ShiftAssignmentsPage': true,
        '/MachineManagement': true,
        '/QualityControl': true,
        '/Reports': true,
        '/DailyShiftPlanning': true,
        '/MachineAssignments': true
      }
    },
    shift_manager_quality: {
      name: "Jefe Turno Calidad",
      is_strict: true,
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
      },
      page_permissions: {
        '/Dashboard': true,
        '/QualityControl': true,
        '/Reports': true,
        '/CalidadSkills': true
      }
    },
    shift_manager_maintenance: {
      name: "Jefe Turno Mantenimiento",
      is_strict: true,
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
      },
      page_permissions: {
        '/Dashboard': true,
        '/MaintenanceTracking': true,
        '/MachineManagement': true,
        '/Reports': true,
        '/MantenimientoSkills': true
      }
    },
    prod_supervisor: {
      name: "Supervisor Producción",
      is_strict: true,
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
        canConfigureSystem: false,
      },
      page_permissions: {
        '/Dashboard': true,
        '/DailyProductionPlanningPage': true,
        '/EmployeesShiftManager': true,
        '/DailyPlanning': true,
        '/ProductionPlanning': true,
        '/Reports': true,
        '/PlanificacionSkills': true
      }
    },
    maintenance_tech: {
      name: "Técnico Mantenimiento",
      is_strict: true,
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
      },
      page_permissions: {
        '/Dashboard': true,
        '/MaintenanceTracking': true,
        '/MachineManagement': true
      }
    },
    operator: {
      name: "Operario",
      is_strict: true,
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
      },
      page_permissions: {
        '/Dashboard': true,
        '/ShiftAssignmentsPage': true
      }
    },
    user: {
      name: "Usuario Estándar",
      is_strict: true,
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
      page_permissions: {
        '/Dashboard': true
      },
      isSystem: true
    },
  },
  user_assignments: {} // email -> role_id
};

export function useRolesManager() {
  // CORRECCIÓN CRÍTICA: Extraer la propiedad correcta de carga (rolesConfigLoading)
  // Antes se extraía 'isLoading' que no existe en useAppData, causando undefined y saltando la espera.
  const { rolesConfig, refetchRolesConfig, rolesConfigLoading: isDataLoading } = useAppData();
  const queryClient = useQueryClient();

  // v8 Persistence Hook (Writer Only)
  const { save: saveRolesV8 } = usePersistentAppConfig(
      'roles_config', 
      null, 
      'rolesConfig_v8_writer', 
      false, 
      { enabled: false }
  );

  // Estado local
  const [localConfig, setLocalConfig] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const isMountedRef = useRef(true);

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

    // Si ya tenemos configuración local y está sucia, NO tocarla para no perder trabajo
    if (localConfig && isDirty) return;

    if (rolesConfig && Object.keys(rolesConfig).length > 0) {
      // console.log("useRolesManager: Loaded remote configuration keys:", Object.keys(rolesConfig));
      
      // HIDRATACIÓN DEFENSIVA: Asegurar que existan todas las estructuras necesarias
      // Esto previene que una configuración remota incompleta sobrescriba datos locales válidos
      const hydratedConfig = {
          ...rolesConfig,
          roles: { ...DEFAULT_ROLES_CONFIG.roles, ...(rolesConfig.roles || {}) },
          user_assignments: rolesConfig.user_assignments || {}
      };

      // Doble verificación para user_assignments
      if (!hydratedConfig.user_assignments) hydratedConfig.user_assignments = {};

      // Verificar asignaciones cargadas
      const loadedAssignments = Object.keys(hydratedConfig.user_assignments).length;
      // console.log(`useRolesManager: Hydrated config with ${loadedAssignments} assignments.`);

      setLocalConfig(JSON.parse(JSON.stringify(hydratedConfig)));
    } else {
      // Solo inicializar con defaults si NO tenemos nada local
      if (!localConfig) {
          // console.log("useRolesManager: Initializing with default configuration");
          setLocalConfig(JSON.parse(JSON.stringify(DEFAULT_ROLES_CONFIG)));
      }
    }
    setIsLoading(false);
  }, [rolesConfig, isDataLoading]); 

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
      
      // Lógica de Hidratación Inteligente:
      // Si el rol no tiene permisos definidos (modo permisivo legacy),
      // al hacer el primer cambio debemos explicitar TODOS los permisos existentes
      // para no bloquear accidentalmente todo el resto de la app al pasar a modo estricto.
      let currentPermissions = role.page_permissions;
      let isStrict = role.is_strict;

      if (!currentPermissions && !isStrict) {
        currentPermissions = {};
        // Poblar con todos los items del menú como TRUE (excepto Configuración)
        MENU_STRUCTURE.forEach(item => {
            if (item.category !== 'Configuración') {
                currentPermissions[item.path] = true;
            }
        });
      } else {
          currentPermissions = { ...(currentPermissions || {}) };
      }

      // OPTIMIZACIÓN DE ESPACIO: Solo guardamos 'true'. Borramos keys en 'false'.
      if (checked) {
          currentPermissions[path] = true;
      } else {
          delete currentPermissions[path];
      }

      return {
        ...prev,
        roles: {
          ...prev.roles,
          [roleId]: {
            ...role,
            is_strict: true, // Forzamos modo estricto al editar
            page_permissions: currentPermissions
          }
        }
      };
    });
    setIsDirty(true);
  }, []);

  // Nueva función para acciones en lote (Todo / Nada)
  const setRoleMode = useCallback((roleId, mode) => {
      setLocalConfig(prev => {
          const role = prev.roles[roleId];
          let newPermissions = {};

          if (mode === 'allow_all') {
             MENU_STRUCTURE.forEach(item => {
                 if (item.category !== 'Configuración') {
                     newPermissions[item.path] = true;
                 }
             });
          } else if (mode === 'block_all') {
             newPermissions = {}; // Vacío = Bloqueo total (en modo estricto)
          }

          return {
              ...prev,
              roles: {
                  ...prev.roles,
                  [roleId]: {
                      ...role,
                      is_strict: true,
                      page_permissions: newPermissions
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
          isSystem: false,
          is_strict: true,
          page_permissions: {
              '/Dashboard': true
          }
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

  // Acción de Guardado SIMPLIFICADA (v8 Integrated)
  const saveConfig = async () => {
    if (!isMountedRef.current) return;
    setIsSaving(true);
    
    try {
      if (!localConfig || Object.keys(localConfig).length === 0) {
        throw new Error("La configuración local está vacía. No se guardará.");
      }

      // COMPRESIÓN (v2) - Mantenida por eficiencia
      const dictionary = [];
      const getPathIndex = (path) => {
        let idx = dictionary.indexOf(path);
        if (idx === -1) {
          idx = dictionary.length;
          dictionary.push(path);
        }
        return idx;
      };

      const compressedRoles = {};
      Object.keys(localConfig.roles || {}).forEach(roleId => {
        const role = localConfig.roles[roleId];
        const compressedRole = {
          n: role.name,
          s: role.is_strict ? 1 : 0,
          p: role.permissions || {},
          pp: [],
          sys: role.isSystem
        };
        
        if (role.page_permissions) {
          Object.keys(role.page_permissions).forEach(path => {
            if (role.page_permissions[path] === true) { // Solo guardar permisos TRUE
               compressedRole.pp.push(getPathIndex(path));
            }
          });
          
          if (compressedRole.pp.length > 0) {
             compressedRole.s = 1;
          }
        }
        compressedRoles[roleId] = compressedRole;
      });

      const compressedConfig = {
        v: 2,
        d: dictionary,
        r: compressedRoles,
        ua: localConfig.user_assignments || {}
      };

      // DELEGACIÓN A ESTRATEGIA v8 (Direct ID Linking)
      // Esto maneja automáticamente: Chunking, Triple Write, Verificación y Limpieza.
      await saveRolesV8(compressedConfig);
      
      // Actualización Optimista
      queryClient.setQueryData(['rolesConfig'], localConfig);
      queryClient.invalidateQueries(['rolesConfig']);
      
      setIsDirty(false); 
      
      if (refetchRolesConfig) {
        setTimeout(() => refetchRolesConfig(), 1000);
      }

    } catch (error) {
      console.error("useRolesManager: Save error", error);
      setIsDirty(true);
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

  const restoreDefaults = useCallback(() => {
    if (confirm("¿Estás seguro de que quieres RESTAURAR los roles por defecto? Esto sobrescribirá la configuración actual.")) {
        setLocalConfig(JSON.parse(JSON.stringify(DEFAULT_ROLES_CONFIG)));
        setIsDirty(true);
        toast.info("Roles restaurados a valores por defecto. No olvides guardar.");
    }
  }, []);

  const forceCleanup = async () => {
    // Versión simplificada de limpieza manual
    if (!isMountedRef.current) return;
    if (!confirm("Esta acción eliminará duplicados en la base de datos dejando solo el más reciente. ¿Continuar?")) return;

    setIsSaving(true);
    try {
        toast.info("Analizando registros...");
        const matches = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
        
        if (!matches || matches.length <= 1) {
            toast.info("No se encontraron duplicados.");
            return;
        }

        // Ordenar por ID descendente (asumiendo ID más alto = más reciente)
        // O usar created_at si está disponible
        matches.sort((a, b) => {
             const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
             const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
             return dateB - dateA;
        });

        const toKeep = matches[0];
        const toDelete = matches.slice(1);
        
        toast.info(`Manteniendo ID: ${toKeep.id}, eliminando ${toDelete.length} duplicados...`);

        await Promise.all(toDelete.map(m => base44.entities.AppConfig.delete(m.id)));
        
        toast.success("Limpieza completada.");
        if (refetchRolesConfig) refetchRolesConfig();

    } catch (e) {
        toast.error("Error en limpieza: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  return {
    localConfig,
    isDirty,
    isSaving,
    isLoading,
    updatePermission,
    updatePagePermission,
    setRoleMode,
    updateUserAssignment,
    addRole,
    deleteRole,
    saveConfig,
    resetConfig,
    restoreDefaults,
    forceCleanup
  };
}
