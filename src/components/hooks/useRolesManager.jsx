import { useState, useEffect, useCallback } from 'react';
import { useAppData } from '@/components/data/DataProvider';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const DEFAULT_CONFIG = {
  roles: {
    admin: {
      name: "Administrador",
      is_strict: true,
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
      page_permissions: {},
      isSystem: true
    },
    user: {
      name: "Usuario",
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
      page_permissions: { "/Dashboard": true },
      isSystem: true
    }
  },
  user_assignments: {}
};

export function useRolesManager() {
  const { rolesConfig, rolesConfigLoading, refetchRolesConfig } = useAppData();
  
  const [localConfig, setLocalConfig] = useState(null);
  const [serverConfig, setServerConfig] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Inicializar config
  useEffect(() => {
    if (rolesConfig) {
      setLocalConfig(JSON.parse(JSON.stringify(rolesConfig)));
      setServerConfig(JSON.parse(JSON.stringify(rolesConfig)));
      setIsDirty(false);
    } else if (!rolesConfigLoading) {
      // No hay config, usar defaults
      setLocalConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
      setServerConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
      setIsDirty(false);
    }
  }, [rolesConfig, rolesConfigLoading]);

  // Update permission
  const updatePermission = useCallback((roleId, permKey, value) => {
    setLocalConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next.roles[roleId]) {
        next.roles[roleId].permissions[permKey] = value;
      }
      return next;
    });
    setIsDirty(true);
  }, []);

  // Update page permission
  const updatePagePermission = useCallback((roleId, page, value) => {
    setLocalConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next.roles[roleId]) {
        if (!next.roles[roleId].page_permissions) {
          next.roles[roleId].page_permissions = {};
        }
        next.roles[roleId].page_permissions[page] = value;
      }
      return next;
    });
    setIsDirty(true);
  }, []);

  // Set role mode (strict/permissive)
  const setRoleMode = useCallback((roleId, isStrict) => {
    setLocalConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next.roles[roleId]) {
        next.roles[roleId].is_strict = isStrict;
      }
      return next;
    });
    setIsDirty(true);
  }, []);

  // Update user assignment
  const updateUserAssignment = useCallback((email, roleId) => {
    if (!email) return;
    setLocalConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (roleId === "none") {
        delete next.user_assignments[email.toLowerCase()];
      } else {
        next.user_assignments[email.toLowerCase()] = roleId;
      }
      return next;
    });
    setIsDirty(true);
  }, []);

  // Add role
  const addRole = useCallback((name, id) => {
    if (!name || !id) throw new Error("Nombre e ID son obligatorios");
    if (!/^[a-z0-9_]+$/.test(id)) throw new Error("ID solo puede contener letras minúsculas, números y guiones bajos");
    
    setLocalConfig(prev => {
      if (prev.roles[id]) throw new Error("Ya existe un rol con ese ID");
      const next = JSON.parse(JSON.stringify(prev));
      next.roles[id] = {
        name,
        is_strict: true,
        permissions: {},
        page_permissions: { "/Dashboard": true },
        isSystem: false
      };
      return next;
    });
    setIsDirty(true);
  }, []);

  // Delete role
  const deleteRole = useCallback((roleId) => {
    setLocalConfig(prev => {
      if (prev.roles[roleId]?.isSystem) throw new Error("No puedes eliminar roles del sistema");
      const next = JSON.parse(JSON.stringify(prev));
      delete next.roles[roleId];
      // Limpiar asignaciones
      Object.keys(next.user_assignments).forEach(email => {
        if (next.user_assignments[email] === roleId) {
          delete next.user_assignments[email];
        }
      });
      return next;
    });
    setIsDirty(true);
  }, []);

  // SAVE - Simplificado sin chunks ni v8
  const saveConfig = useCallback(async () => {
    if (!localConfig) return;
    
    setIsSaving(true);
    try {
      // Buscar registro existente
      const existing = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
      
      // Preparar payload simple
      const payload = {
        config_key: 'roles_config',
        value: JSON.stringify(localConfig)
      };

      if (existing && existing.length > 0) {
        // Update
        await base44.entities.AppConfig.update(existing[0].id, payload);
      } else {
        // Create
        await base44.entities.AppConfig.create(payload);
      }

      // Refrescar desde servidor
      await refetchRolesConfig();
      
      toast.success("✓ Configuración guardada exitosamente");
      setIsDirty(false);
    } catch (error) {
      console.error("Error guardando configuración:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }, [localConfig, refetchRolesConfig]);

  // Reset config
  const resetConfig = useCallback(() => {
    if (serverConfig) {
      setLocalConfig(JSON.parse(JSON.stringify(serverConfig)));
      setIsDirty(false);
      toast.info("Cambios descartados");
    }
  }, [serverConfig]);

  // Restore defaults
  const restoreDefaults = useCallback(async () => {
    if (!window.confirm("¿Estás seguro de restaurar la configuración por defecto? Se perderán todos los cambios.")) return;
    
    setIsSaving(true);
    try {
      const payload = {
        config_key: 'roles_config',
        value: JSON.stringify(DEFAULT_CONFIG)
      };

      const existing = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
      if (existing && existing.length > 0) {
        await base44.entities.AppConfig.update(existing[0].id, payload);
      } else {
        await base44.entities.AppConfig.create(payload);
      }

      await refetchRolesConfig();
      toast.success("Configuración restaurada a defaults");
      setIsDirty(false);
    } catch (error) {
      console.error("Error restaurando defaults:", error);
      toast.error("Error al restaurar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }, [refetchRolesConfig]);

  return {
    localConfig,
    isDirty,
    isSaving,
    isLoading: rolesConfigLoading,
    updatePermission,
    updatePagePermission,
    setRoleMode,
    updateUserAssignment,
    addRole,
    deleteRole,
    saveConfig,
    resetConfig,
    restoreDefaults,
  };
}