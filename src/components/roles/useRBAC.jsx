import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useMemo } from "react";

// Definición de valores por defecto para evitar undefined
const DEFAULT_PERMISSIONS = {
  modulos_acceso: [],
  empleados: { ver: false, crear: false, editar: false, eliminar: false, departamentos_visibles: [] },
  empleados_detalle: { pestanas: {} },
  campos_empleado: { ver_salario: false, ver_bancarios: false, ver_dni: false, editar_sensible: false },
  contrato: { ver: false, editar: false },
};

export function useRBAC() {
  // 1. Obtener Usuario Actual
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  // 2. Obtener Asignaciones de Roles del Usuario
  const { data: assignments = [] } = useQuery({
    queryKey: ['userRoleAssignments', user?.email],
    queryFn: () => user?.email ? base44.entities.UserRoleAssignment.filter({ user_email: user.email }) : [],
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  // 3. Obtener Todos los Roles (para cruzar datos)
  const { data: allRoles = [] } = useQuery({
    queryKey: ['allRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    staleTime: 5 * 60 * 1000,
  });

  // 4. CÁLCULO DE PERMISOS (Memoizado para Estabilidad Referencial)
  const rbac = useMemo(() => {
    if (!user) return { loading: true, isAdmin: false, effectivePermissions: DEFAULT_PERMISSIONS, hasRole: () => false };

    const isAdmin = user.role === 'admin';
    
    // Si es admin de sistema, tiene acceso total (bypass)
    if (isAdmin) {
      return {
        loading: false,
        isAdmin: true,
        hasRole: () => true,
        can: () => true, // Admin puede hacer todo
        effectivePermissions: { ...DEFAULT_PERMISSIONS, _isAdmin: true } // Marca interna
      };
    }

    // Encontrar los roles activos del usuario
    const userRoleIds = assignments.map(a => a.role_id);
    const activeRoles = allRoles.filter(r => userRoleIds.includes(r.id));

    // Mezclar permisos (Estrategia: OR inclusivo - si un rol lo permite, es true)
    // Empezamos con una copia profunda de los defaults para no mutar
    const finalPerms = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
    const roleNames = activeRoles.map(r => r.role_name);

    activeRoles.forEach(role => {
      const p = role.permissions || {};

      // Módulos
      if (p.modulos_acceso) {
        finalPerms.modulos_acceso = [...new Set([...finalPerms.modulos_acceso, ...p.modulos_acceso])];
      }

      // Empleados CRUD
      if (p.empleados) {
        if (p.empleados.ver) finalPerms.empleados.ver = true;
        if (p.empleados.crear) finalPerms.empleados.crear = true;
        if (p.empleados.editar) finalPerms.empleados.editar = true;
        if (p.empleados.eliminar) finalPerms.empleados.eliminar = true;
        
        // Departamentos: Si alguno tiene '*', es todo. Si no, suma de arrays.
        const currentDepts = finalPerms.empleados.departamentos_visibles || [];
        const newDepts = p.empleados.departamentos_visibles || [];
        
        // Convert to uppercase for consistent comparison
        const currentDeptsUpper = currentDepts.map(d => String(d).toUpperCase());
        const newDeptsUpper = newDepts.map(d => String(d).toUpperCase());
        
        if (currentDepts.includes('*') || newDepts.includes('*')) {
          finalPerms.empleados.departamentos_visibles = ['*'];
        } else {
          // Store original casing or normalized? Let's normalize to uppercase to be safe
          finalPerms.empleados.departamentos_visibles = [...new Set([...currentDeptsUpper, ...newDeptsUpper])];
        }
      }

      // Campos Sensibles
      if (p.campos_empleado) {
        if (p.campos_empleado.ver_salario) finalPerms.campos_empleado.ver_salario = true;
        if (p.campos_empleado.ver_bancarios) finalPerms.campos_empleado.ver_bancarios = true;
        if (p.campos_empleado.ver_dni) finalPerms.campos_empleado.ver_dni = true;
        if (p.campos_empleado.editar_sensible) finalPerms.campos_empleado.editar_sensible = true;
        // ... mapear el resto explícitamente para evitar errores de estructura
        if (p.campos_empleado.ver_contacto) finalPerms.campos_empleado.ver_contacto = true;
        if (p.campos_empleado.ver_direccion) finalPerms.campos_empleado.ver_direccion = true;
        if (p.campos_empleado.editar_contacto) finalPerms.campos_empleado.editar_contacto = true;
      }

      // Pestañas
      if (p.empleados_detalle?.pestanas) {
        Object.entries(p.empleados_detalle.pestanas).forEach(([key, val]) => {
          if (val === true) finalPerms.empleados_detalle.pestanas[key] = true;
        });
      }
      
      // Contrato
      if (p.contrato) {
          if (p.contrato.ver) finalPerms.contrato.ver = true;
          if (p.contrato.editar) finalPerms.contrato.editar = true;
      }
    });

    // Función Helper 'can'
    // Uso: can('empleados.ver') o can('campos_empleado.ver_salario')
    const can = (path) => {
      const parts = path.split('.');
      let current = finalPerms;
      for (const part of parts) {
        if (current === undefined || current === null) return false;
        current = current[part];
      }
      return !!current;
    };

    const hasRole = (name) => roleNames.includes(name);

    return {
      loading: false,
      isAdmin: false,
      user,
      activeRoles, 
      effectivePermissions: finalPerms,
      can,
      hasRole
    };

  }, [user, assignments, allRoles]); 

  return rbac;
}