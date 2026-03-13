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
        // Sistema
        isAdmin: true,
        canConfigureSystem: true,
        canManageUsers: true,
        canViewAuditLogs: true,
        canModifySecuritySettings: true,
        canAccessBackendFunctions: true,
        // HR
        canViewPersonalData: true,
        canEditPersonalData: true,
        canViewSalary: true,
        canEditSalary: true,
        canViewBankingData: true,
        canEditBankingData: true,
        canEditEmployees: true,
        canViewSensitiveDocuments: true,
        canManageContracts: true,
        canViewPerformanceReviews: true,
        canEditPerformanceReviews: true,
        canManageTraining: true,
        // Ausencias
        canViewOwnAbsences: true,
        canCreateOwnAbsences: true,
        canViewAllAbsences: true,
        canApproveAbsences: true,
        canDeleteAbsences: true,
        canViewAttendance: true,
        canManageVacationBalance: true,
        canOverrideAbsenceRules: true,
        // Producción
        canViewPlanning: true,
        canEditPlanning: true,
        canScheduleProduction: true,
        canModifyProductionOrders: true,
        canViewProductionCosts: true,
        canAssignOperators: true,
        // Máquinas
        canViewMachines: true,
        canManageMachines: true,
        canViewMachineCosts: true,
        canScheduleMaintenance: true,
        canApproveMaintenance: true,
        canViewMaintenanceHistory: true,
        canEditMaintenanceRecords: true,
        canAccessMachineDiagnostics: true,
        // Calidad
        canViewQualityData: true,
        canRecordQualityInspections: true,
        canApproveQualityReports: true,
        canAccessNonConformities: true,
        // Almacén
        canViewInventory: true,
        canManageInventory: true,
        canViewInventoryCosts: true,
        canApproveOrders: true,
        canReceiveGoods: true,
        canShipGoods: true,
        // Informes
        canViewReports: true,
        canViewAdvancedReports: true,
        canViewFinancialReports: true,
        canAccessAnalytics: true,
        canExportData: true,
        canAccessRealTimeData: true
      },
      page_permissions: {},
      field_permissions: {},
      parent_role: null,
      isSystem: true
    },
    user: {
      name: "Usuario",
      is_strict: true,
      permissions: {
        // Sistema - Mínimos
        isAdmin: false,
        canConfigureSystem: false,
        canManageUsers: false,
        canViewAuditLogs: false,
        canModifySecuritySettings: false,
        canAccessBackendFunctions: false,
        // HR - Solo lo básico propio
        canViewPersonalData: false,
        canEditPersonalData: false,
        canViewSalary: false,
        canEditSalary: false,
        canViewBankingData: false,
        canEditBankingData: false,
        canEditEmployees: false,
        canViewSensitiveDocuments: false,
        canManageContracts: false,
        canViewPerformanceReviews: false,
        canEditPerformanceReviews: false,
        canManageTraining: false,
        // Ausencias - Solo propias
        canViewOwnAbsences: true,
        canCreateOwnAbsences: true,
        canViewAllAbsences: false,
        canApproveAbsences: false,
        canDeleteAbsences: false,
        canViewAttendance: false,
        canManageVacationBalance: false,
        canOverrideAbsenceRules: false,
        // Producción - Solo lectura básica
        canViewPlanning: true,
        canEditPlanning: false,
        canScheduleProduction: false,
        canModifyProductionOrders: false,
        canViewProductionCosts: false,
        canAssignOperators: false,
        // Máquinas - Solo lectura
        canViewMachines: true,
        canManageMachines: false,
        canViewMachineCosts: false,
        canScheduleMaintenance: false,
        canApproveMaintenance: false,
        canViewMaintenanceHistory: false,
        canEditMaintenanceRecords: false,
        canAccessMachineDiagnostics: false,
        // Calidad - Lectura básica
        canViewQualityData: true,
        canRecordQualityInspections: false,
        canApproveQualityReports: false,
        canAccessNonConformities: false,
        // Almacén - Sin acceso
        canViewInventory: false,
        canManageInventory: false,
        canViewInventoryCosts: false,
        canApproveOrders: false,
        canReceiveGoods: false,
        canShipGoods: false,
        // Informes - Básico
        canViewReports: true,
        canViewAdvancedReports: false,
        canViewFinancialReports: false,
        canAccessAnalytics: false,
        canExportData: false,
        canAccessRealTimeData: false
      },
      page_permissions: { "/Dashboard": true },
      field_permissions: {},
      parent_role: null,
      isSystem: true
    },
    display: {
      name: "Pantalla",
      is_strict: true,
      permissions: {
        isAdmin: false,
        canConfigureSystem: false,
        canManageUsers: false,
        canViewAuditLogs: false,
        canModifySecuritySettings: false,
        canAccessBackendFunctions: false,
        canViewPersonalData: false,
        canEditPersonalData: false,
        canViewSalary: false,
        canEditSalary: false,
        canViewBankingData: false,
        canEditBankingData: false,
        canEditEmployees: false,
        canViewSensitiveDocuments: false,
        canManageContracts: false,
        canViewPerformanceReviews: false,
        canEditPerformanceReviews: false,
        canManageTraining: false,
        canViewOwnAbsences: false,
        canCreateOwnAbsences: false,
        canViewAllAbsences: false,
        canApproveAbsences: false,
        canDeleteAbsences: false,
        canViewAttendance: false,
        canManageVacationBalance: false,
        canOverrideAbsenceRules: false,
        canViewPlanning: true,
        canEditPlanning: false,
        canScheduleProduction: false,
        canModifyProductionOrders: false,
        canViewProductionCosts: false,
        canAssignOperators: false,
        canViewMachines: true,
        canManageMachines: false,
        canViewMachineCosts: false,
        canScheduleMaintenance: false,
        canApproveMaintenance: false,
        canViewMaintenanceHistory: false,
        canEditMaintenanceRecords: false,
        canAccessMachineDiagnostics: false,
        canViewQualityData: false,
        canRecordQualityInspections: false,
        canApproveQualityReports: false,
        canAccessNonConformities: false,
        canViewInventory: false,
        canManageInventory: false,
        canViewInventoryCosts: false,
        canApproveOrders: false,
        canReceiveGoods: false,
        canShipGoods: false,
        canViewReports: false,
        canViewAdvancedReports: false,
        canViewFinancialReports: false,
        canAccessAnalytics: false,
        canExportData: false,
        canAccessRealTimeData: false
      },
      page_permissions: { "/ShiftAssignmentsDisplay": true },
      field_permissions: {},
      parent_role: null,
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
    const ensureDisplayRole = (cfg) => {
      if (!cfg || !cfg.roles) return cfg;
      if (!cfg.roles.display) {
        cfg.roles.display = JSON.parse(JSON.stringify(DEFAULT_CONFIG.roles.display));
      }
      return cfg;
    };
    if (rolesConfig) {
      setLocalConfig(ensureDisplayRole(JSON.parse(JSON.stringify(rolesConfig))));
      setServerConfig(ensureDisplayRole(JSON.parse(JSON.stringify(rolesConfig))));
      setIsDirty(false);
    } else if (!rolesConfigLoading) {
      // No hay config, usar defaults
      setLocalConfig(ensureDisplayRole(JSON.parse(JSON.stringify(DEFAULT_CONFIG))));
      setServerConfig(ensureDisplayRole(JSON.parse(JSON.stringify(DEFAULT_CONFIG))));
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

  // NEW: Update module permission
  const updateModulePermission = useCallback((roleId, pageName, moduleName, value) => {
    setLocalConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next.roles[roleId]) {
        if (!next.roles[roleId].module_permissions) {
          next.roles[roleId].module_permissions = {};
        }
        if (!next.roles[roleId].module_permissions[pageName]) {
          next.roles[roleId].module_permissions[pageName] = {};
        }
        next.roles[roleId].module_permissions[pageName][moduleName] = value;
      }
      return next;
    });
    setIsDirty(true);
  }, []);

  // NEW: Update field permission
  const updateFieldPermission = useCallback((roleId, entityName, fieldName, permissionType, value) => {
    setLocalConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next.roles[roleId]) {
        if (!next.roles[roleId].field_permissions) {
          next.roles[roleId].field_permissions = {};
        }
        if (!next.roles[roleId].field_permissions[entityName]) {
          next.roles[roleId].field_permissions[entityName] = {};
        }
        if (!next.roles[roleId].field_permissions[entityName][fieldName]) {
          next.roles[roleId].field_permissions[entityName][fieldName] = {};
        }
        next.roles[roleId].field_permissions[entityName][fieldName][permissionType] = value;
      }
      return next;
    });
    setIsDirty(true);
  }, []);

  // NEW: Update parent role (cambiar herencia)
  const updateParentRole = useCallback((roleId, parentRoleId) => {
    setLocalConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next.roles[roleId]) {
        // Prevenir ciclos de herencia
        let checkCycle = parentRoleId;
        while (checkCycle) {
          if (checkCycle === roleId) {
            throw new Error("No puedes crear ciclos de herencia");
          }
          checkCycle = next.roles[checkCycle]?.parent_role;
        }
        
        next.roles[roleId].parent_role = parentRoleId || null;
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

  // Add role con soporte de herencia
  const addRole = useCallback((name, id, parentRole = null) => {
    if (!name || !id) throw new Error("Nombre e ID son obligatorios");
    if (!/^[a-z0-9_]+$/.test(id)) throw new Error("ID solo puede contener letras minúsculas, números y guiones bajos");
    
    setLocalConfig(prev => {
      if (prev.roles[id]) throw new Error("Ya existe un rol con ese ID");
      const next = JSON.parse(JSON.stringify(prev));
      
      // Configuración base
      let baseConfig = {
        permissions: {},
        page_permissions: { "/Dashboard": true },
        field_permissions: {}
      };
      
      // Si hay rol padre, heredar su configuración
      if (parentRole && next.roles[parentRole]) {
        baseConfig = {
          permissions: { ...next.roles[parentRole].permissions },
          page_permissions: { ...next.roles[parentRole].page_permissions },
          field_permissions: { ...next.roles[parentRole].field_permissions }
        };
      }
      
      next.roles[id] = {
        name,
        is_strict: true,
        ...baseConfig,
        parent_role: parentRole,
        isSystem: false
      };
      return next;
    });
    setIsDirty(true);
  }, []);

  // Clone role - clonar rol existente
  const cloneRole = useCallback((sourceRoleId, newName, newId) => {
    if (!newName || !newId) throw new Error("Nombre e ID son obligatorios");
    if (!/^[a-z0-9_]+$/.test(newId)) throw new Error("ID solo puede contener letras minúsculas, números y guiones bajos");
    
    setLocalConfig(prev => {
      if (prev.roles[newId]) throw new Error("Ya existe un rol con ese ID");
      if (!prev.roles[sourceRoleId]) throw new Error("Rol origen no existe");
      
      const next = JSON.parse(JSON.stringify(prev));
      const sourceRole = next.roles[sourceRoleId];
      
      // Clonar todo excepto isSystem y nombre
      next.roles[newId] = {
        ...JSON.parse(JSON.stringify(sourceRole)),
        name: newName,
        isSystem: false,
        parent_role: null // Los clones no heredan automáticamente
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

  // SAVE - Ultra simple y directo
  const saveConfig = useCallback(async () => {
    if (!localConfig) return;
    
    setIsSaving(true);
    console.log("💾 Guardando configuración...", localConfig);
    
    try {
      // 1. Buscar registro existente
      const existing = await base44.entities.AppConfig.filter({ config_key: 'roles_config' });
      console.log("📦 Registros existentes:", existing);
      
      // 2. Preparar payload - usar app_subtitle como fallback por limitación del backend
      const configJson = JSON.stringify(localConfig);
      const payload = {
        config_key: 'roles_config',
        app_name: 'Roles Configuration',
        app_subtitle: configJson, // Backend acepta este campo para JSON grandes
        value: configJson.length < 1000 ? configJson : null // Solo si es pequeño
      };

      let savedRecord = null;
      if (existing && existing.length > 0) {
        // Update
        console.log("📝 Actualizando registro existente:", existing[0].id);
        savedRecord = await base44.entities.AppConfig.update(existing[0].id, payload);
      } else {
        // Create
        console.log("✨ Creando nuevo registro");
        savedRecord = await base44.entities.AppConfig.create(payload);
      }
      
      console.log("✅ Guardado exitoso:", savedRecord);

      // 3. Actualizar estado local como servidor
      setServerConfig(JSON.parse(JSON.stringify(localConfig)));
      setIsDirty(false);
      
      // 4. Refrescar desde servidor para confirmar
      setTimeout(() => refetchRolesConfig(), 500);
      
      toast.success("✓ Configuración guardada correctamente");
    } catch (error) {
      console.error("❌ Error guardando:", error);
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
    updateModulePermission, // NEW
    updateFieldPermission, // NEW
    updateParentRole, // NEW
    setRoleMode,
    updateUserAssignment,
    addRole,
    cloneRole, // NEW
    deleteRole,
    saveConfig,
    resetConfig,
    restoreDefaults,
  };
}
