import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppData } from '@/components/data/DataProvider';
import { base44 } from '@/api/base44Client';
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
  // CORRECCIÓN CRÍTICA: Extraer la propiedad correcta de carga (rolesConfigLoading)
  // Antes se extraía 'isLoading' que no existe en useAppData, causando undefined y saltando la espera.
  const { rolesConfig, refetchRolesConfig, rolesConfigLoading: isDataLoading } = useAppData();
  const queryClient = useQueryClient();

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
      console.log("useRolesManager: Loaded remote configuration keys:", Object.keys(rolesConfig));
      
      // HIDRATACIÓN DEFENSIVA: Asegurar que existan todas las estructuras necesarias
      // Esto previene que una configuración remota incompleta sobrescriba datos locales válidos
      const hydratedConfig = {
          roles: { ...DEFAULT_ROLES_CONFIG.roles, ...(rolesConfig.roles || {}) },
          user_assignments: rolesConfig.user_assignments || {}, 
          ...rolesConfig 
      };

      // Doble verificación para user_assignments
      if (!hydratedConfig.user_assignments) hydratedConfig.user_assignments = {};

      // Verificar asignaciones cargadas
      const loadedAssignments = Object.keys(hydratedConfig.user_assignments).length;
      console.log(`useRolesManager: Hydrated config with ${loadedAssignments} assignments.`);

      setLocalConfig(JSON.parse(JSON.stringify(hydratedConfig)));
    } else {
      // Solo inicializar con defaults si NO tenemos nada local
      if (!localConfig) {
          console.log("useRolesManager: Initializing with default configuration");
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

  // Acción de Guardado SIMPLIFICADA
  const saveConfig = async () => {
    if (!isMountedRef.current) return;
    setIsSaving(true);
    
    try {
      if (!localConfig || Object.keys(localConfig).length === 0) {
        throw new Error("La configuración local está vacía. No se guardará.");
      }

      // SANITIZACIÓN Y OPTIMIZACIÓN PRE-GUARDADO:
      // Eliminar valores 'false' para reducir drásticamente el tamaño del payload.
      // Esto soluciona el error "Backend rechazó ambos campos" por exceso de tamaño.
      const configToSave = JSON.parse(JSON.stringify(localConfig));
      if (configToSave.roles) {
        Object.values(configToSave.roles).forEach(role => {
            if (role.page_permissions) {
                Object.keys(role.page_permissions).forEach(path => {
                    if (role.page_permissions[path] === false) {
                        delete role.page_permissions[path];
                    }
                });
                // Si tiene permisos configurados, asegurar modo estricto
                if (Object.keys(role.page_permissions).length > 0) {
                    role.is_strict = true;
                }
            }
        });
      }

      const configString = JSON.stringify(configToSave);
      const parsedCheck = JSON.parse(configString); // Validación simple
      
      console.log("useRolesManager: Saving config (Optimized)...", configString.length, "chars");

      // BACKUP DE EMERGENCIA EN LOCALSTORAGE
      try {
          localStorage.setItem('roles_config_backup', configString);
          console.log("useRolesManager: Backup de emergencia guardado en LocalStorage.");
      } catch (e) {
          console.warn("useRolesManager: No se pudo guardar backup en LocalStorage", e);
      }

      console.log("useRolesManager: Config payload:", {
          rolesCount: Object.keys(localConfig.roles || {}).length,
          assignmentsCount: Object.keys(localConfig.user_assignments || {}).length
      });

      // 1. Buscar si ya existe la configuración
      let existingId = null;
      try {
          const f1 = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
          if (f1 && f1.length > 0) {
            existingId = f1[0].id; // Tomamos el primero si hay duplicados
            
            // DIAGNÓSTICO: Verificar si el registro existente está corrupto
            if (!f1[0].value) {
                console.warn(`useRolesManager: Registro existente ${existingId} está IRRECUPERABLE (value vacío). ELIMINANDO para crear uno nuevo.`);
                try {
                    await base44.entities.AppConfig.delete(existingId);
                    console.log("useRolesManager: Registro corrupto eliminado correctamente.");
                    existingId = null; // Forzamos creación de uno nuevo
                } catch (delErr) {
                    console.error("useRolesManager: Falló la eliminación del registro corrupto", delErr);
                    // Si falla el borrado, intentamos actualizar de todos modos como último recurso
                }
            }
          }
      } catch(e) { 
          console.warn("Search failed, assuming create new", e); 
      }

      // 2. Upsert (Actualizar o Crear)
      // ESTRATEGIA DE PERSISTENCIA:
      // Usamos JSON plano (stringified) en 'value'. 
      // Base64 puede causar problemas en algunos backends si no se espera un string "opaco".
      // La longitud ya está optimizada eliminando los 'false'.
      
      // const base64Config = btoa(unescape(encodeURIComponent(configString)));
      // console.log("useRolesManager: Saving config as Base64...", base64Config.length, "chars");
      
      const payload = {
          key: 'roles_config',
          config_key: 'roles_config',
          value: configString, // JSON string directo
          description: `Roles Config - ${new Date().toISOString()} - ${Object.keys(configToSave.roles || {}).length} roles`,
          is_active: true
      };

      let savedRecord = null;
      if (existingId) {
        console.log(`useRolesManager: Updating ID ${existingId}`);
        savedRecord = await base44.entities.AppConfig.update(existingId, payload);
      } else {
        console.log("useRolesManager: Creating new record");
        savedRecord = await base44.entities.AppConfig.create(payload);
      }

      // VERIFICACIÓN INMEDIATA DE ESCRITURA
       if (savedRecord) {
           console.log("useRolesManager: Registro guardado. Verificando contenido...", savedRecord.id);
           
           // Esperar un momento por consistencia eventual
           await new Promise(r => setTimeout(r, 500));

           const checks = await base44.entities.AppConfig.filter({ id: savedRecord.id });
           const check = checks && checks.length > 0 ? checks[0] : null;

           // Verificamos si AL MENOS UNO de los campos se guardó
           const valueOk = check && check.value && check.value.length > 0;
           // const descOk = check && check.description && check.description.length > 0; 
           // Ya no verificamos descripción porque ahora es solo metadata

           if (!valueOk) {
               console.error("CRITICAL: Backend rechazó value.");
           } else {
               console.log(`useRolesManager: Verificación exitosa. Value: OK`);
           }
       }

      // 3. Actualización Optimista
      queryClient.setQueryData(['rolesConfig'], parsedCheck);
      setIsDirty(false); 
      toast.success("Configuración guardada correctamente.");
      
      // Opcional: Refetch en segundo plano para asegurar consistencia eventual
      if (refetchRolesConfig) {
        setTimeout(() => refetchRolesConfig(), 1000);
      }

    } catch (error) {
      console.error("useRolesManager: Save error", error);
      toast.error("Error al guardar: " + error.message);
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
    forceCleanup
  };
}
