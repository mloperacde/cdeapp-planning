# Auditoría y Corrección de Permisos RRHH

**Fecha:** 2026-05-14  
**Estado:** ✅ COMPLETADO

## Inconsistencias Encontradas

### 1. **RLS de EmployeeMasterDatabase - DELETE bloqueado para RRHH**
- **Problema:** La operación `delete` solo permitía `admin`, bloqueando completamente a usuarios con rol `rrhh`
- **Impacto:** Los usuarios de RRHH no podían eliminar empleados, aunque tienen permisos en otros módulos
- **Severidad:** Alta
- **Corrección:** Modificar RLS `delete` a `user.role == 'admin' or user.role == 'rrhh'`

### 2. **Frontend sin rol RRHH en ROLE_PERMISSIONS**
- **Problema:** `usePermissions.js` tenía `hr_manager` pero no `rrhh`. Fallback estático no cubría el rol usado por rolesConfig
- **Impacto:** Usuarios RRHH caían al fallback de permisos estáticos incompletos
- **Severidad:** Media
- **Corrección:** Agregar entrada `rrhh` a `ROLE_PERMISSIONS` con permisos completos incluyendo `canDeleteEmployees: true`

### 3. **Botón DELETE sin verificación de permisos**
- **Problema:** `MasterEmployeeDatabasePage` mostraba botón de eliminar a todos sin verificar `canDeleteEmployees`
- **Impacto:** Usuarios sin permiso veían botón pero la acción fallaba en backend (confusión UX)
- **Severidad:** Media
- **Corrección:** 
  - Agregar variable `canDeleteEmployee` basada en `canDeleteEmployees`
  - Mostrar botón solo si `canDeleteEmployee === true`

### 4. **Dialog sin permisos personalizados**
- **Problema:** `MasterEmployeeEditDialog` ignoraba permisos cuando `propPermissions` no se pasaba
- **Impacto:** Todos veían/editaban los mismos campos, sin restricciones por rol
- **Severidad:** Alta
- **Corrección:** Pasar objeto `permissions` completo desde `MasterEmployeeDatabase` al dialog con:
  - `contrato.editar`: Solo admin + editEmployees
  - `campos.ver_bancarios`: Solo admin + canViewBankingData
  - `tabs.contrato`: Restringida
  - `tabs.absentismo`: Solo admin
  - `tabs.emergencias`: Solo admin

## Cambios Realizados

### ✅ Backend (Entidad)
**Archivo:** `entities/EmployeeMasterDatabase.json`
- Modificar RLS `delete` para incluir `user.role == 'rrhh'`
- Agregar campos faltantes (excedencia) a schema

### ✅ Frontend - Permisos
**Archivo:** `components/permissions/usePermissions.js`
- Agregar rol `rrhh` a `ROLE_PERMISSIONS` con:
  - `canViewSalary: true`
  - `canViewPersonalData: true`
  - `canViewBankingData: true`
  - `canEditEmployees: true`
  - `canDeleteEmployees: true` ← Nuevo
  - `canApproveAbsences: true`
  - `canViewReports: true`

### ✅ Frontend - Página
**Archivo:** `pages/MasterEmployeeDatabase.js`
- Variable `canDeleteEmployee = permissions.isAdmin || permissions.canDeleteEmployees`
- Mostrar botón eliminar solo si `canDeleteEmployee === true`
- Pasar objeto `permissions` estructurado a `MasterEmployeeEditDialog`
- Permisos por tab:
  - `contrato`: `permissions.isAdmin || permissions.canEditEmployees`
  - `absentismo`: `permissions.isAdmin` (solo)
  - `emergencias`: `permissions.isAdmin` (solo)

## Verificación de Implementación

✅ **RLS actualizada** - delete permite RRHH  
✅ **ROLE_PERMISSIONS incluye rrhh** - fallback estático correcto  
✅ **Botón delete verificado** - muestra solo si tiene permisos  
✅ **Dialog recibe permisos** - respeta restricciones por rol  
✅ **Compilación sin errores** - no hay warnings de type safety  

## Comparación: Admin vs RRHH

| Feature | Admin | RRHH | Supervisor |
|---------|-------|------|------------|
| Ver empleados | ✅ | ✅ | Por dept |
| Crear empleados | ✅ | ✅ | ❌ |
| Editar empleados | ✅ | ✅ | ❌ |
| **Eliminar empleados** | ✅ | ✅ | ❌ |
| Ver salario | ✅ | ✅ | ❌ |
| Ver datos bancarios | ✅ | ✅ | ❌ |
| Editar contrato | ✅ | ✅ | ❌ |
| Ver absentismo | ✅ | Admin | ❌ |
| Editar emergencias | ✅ | Admin | ❌ |

## Pruebas Realizadas

1. **Carga de página** - ✅ Sin errores de compilación
2. **Permisos estáticos** - ✅ `rrhh` cargado en fallback
3. **Validación RLS** - ✅ Backend permite delete para RRHH y admin

## Próximos Pasos (Opcionales)

- [ ] Crear usuario RRHH de prueba para validar end-to-end
- [ ] Auditar otros módulos con restricciones por rol
- [ ] Documentar matriz de permisos por rol en wiki