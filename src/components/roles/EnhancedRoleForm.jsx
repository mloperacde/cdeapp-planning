import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Save } from "lucide-react";
import { toast } from "sonner";
import RolePermissionsMatrix from "./RolePermissionsMatrix";

export default function EnhancedRoleForm({ role, onClose }) {
  const [formData, setFormData] = useState({
    role_name: role?.role_name || "",
    description: role?.description || "",
    nivel_prioridad: role?.nivel_prioridad || 5,
    is_admin: role?.is_admin || false,
    es_rol_sistema: role?.es_rol_sistema || false,
    permissions: role?.permissions || {
      modulos_acceso: [],
      chat: { ver_canales: true, crear_canales: false, mensajes_directos: true },
      ausencias: { ver_propias: true, crear_propias: true, ver_todas: false, aprobar: false, rechazar: false, eliminar: false },
      perfil: { ver_propio: true, editar_propio: true, ver_otros: false, editar_otros: false },
      documentos: { ver: true, descargar: true, subir: false, editar: false, eliminar: false, gestionar_permisos: false },
      empleados: { ver: true, crear: false, editar: false, eliminar: false, departamentos_visibles: [] },
      maquinas: { ver: true, actualizar_estado: false, planificar: false },
      mantenimiento: { ver: false, crear: false, actualizar: false, completar: false },
      comites: { ver: false, gestionar_miembros: false, gestionar_documentos: false }
    }
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Log de auditoría
      const auditLog = {
        tipo_accion: role ? "editar_rol" : "crear_rol",
        usuario_ejecutor: currentUser?.email,
        role_id: role?.id,
        role_name: data.role_name,
        descripcion: role 
          ? `Rol "${data.role_name}" actualizado`
          : `Nuevo rol "${data.role_name}" creado`,
        fecha_accion: new Date().toISOString(),
        detalles_cambios: role ? {
          antes: role,
          despues: data
        } : { despues: data }
      };

      await base44.entities.RoleAuditLog.create(auditLog);

      if (role) {
        return base44.entities.UserRole.update(role.id, data);
      } else {
        return base44.entities.UserRole.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      queryClient.invalidateQueries({ queryKey: ['roleAuditLogs'] });
      toast.success(role ? "Rol actualizado" : "Rol creado");
      onClose();
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const availableModules = [
    "Dashboard", "Empleados", "Planning", "Maquinas", "Mantenimiento", 
    "Ausencias", "Comites", "PRL", "Taquillas", "Habilidades", 
    "Informes", "Configuracion", "Usuarios"
  ];

  const availableDepartments = [
    "FABRICACION", "MANTENIMIENTO", "ALMACEN", "CALIDAD", 
    "OFICINA", "PLANIFICACION", "LIMPIEZA"
  ];

  const toggleDepartment = (dept) => {
    const current = formData.permissions.empleados?.departamentos_visibles || [];
    const updated = current.includes(dept)
      ? current.filter(d => d !== dept)
      : [...current, dept];
    
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        empleados: {
          ...formData.permissions.empleados,
          departamentos_visibles: updated
        }
      }
    });
  };

  const toggleAllDepartments = (checked) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        empleados: {
          ...formData.permissions.empleados,
          departamentos_visibles: checked ? ["*"] : []
        }
      }
    });
  };

  const toggleModule = (module) => {
    const current = formData.permissions.modulos_acceso || [];
    const updated = current.includes(module)
      ? current.filter(m => m !== module)
      : [...current, module];
    
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        modulos_acceso: updated
      }
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            {role ? "Editar Rol" : "Crear Nuevo Rol"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre del Rol *</Label>
              <Input
                value={formData.role_name}
                onChange={(e) => setFormData({...formData, role_name: e.target.value})}
                required
                disabled={formData.es_rol_sistema}
              />
            </div>

            <div className="space-y-2">
              <Label>Nivel de Prioridad: {formData.nivel_prioridad}</Label>
              <Slider
                value={[formData.nivel_prioridad]}
                onValueChange={([value]) => setFormData({...formData, nivel_prioridad: value})}
                min={1}
                max={10}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-slate-500">
                Nivel 1 = permisos mínimos, Nivel 10 = permisos máximos
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2}
              placeholder="Describe las responsabilidades de este rol..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_admin"
              checked={formData.is_admin}
              onCheckedChange={(checked) => setFormData({...formData, is_admin: checked})}
            />
            <label htmlFor="is_admin" className="text-sm font-medium">
              Rol de Administrador (acceso completo a todo)
            </label>
          </div>

          {/* Módulos de Acceso */}
          <div className="space-y-3">
            <Label className="text-base">Módulos de Acceso</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableModules.map(module => (
                <div key={module} className="flex items-center space-x-2">
                  <Checkbox
                    id={`module-${module}`}
                    checked={formData.permissions.modulos_acceso?.includes(module)}
                    onCheckedChange={() => toggleModule(module)}
                  />
                  <label htmlFor={`module-${module}`} className="text-sm cursor-pointer">
                    {module}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Configuración de Departamentos Visibles (Solo si tiene permiso de ver empleados) */}
          {formData.permissions.empleados?.ver && (
            <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
              <Label className="text-base font-semibold">Departamentos Visibles en Lista de Empleados</Label>
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="dept-all"
                  checked={formData.permissions.empleados?.departamentos_visibles?.includes("*")}
                  onCheckedChange={toggleAllDepartments}
                />
                <label htmlFor="dept-all" className="text-sm font-medium">
                  Ver Todos los Departamentos
                </label>
              </div>
              
              {!formData.permissions.empleados?.departamentos_visibles?.includes("*") && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-4">
                  {availableDepartments.map(dept => (
                    <div key={dept} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${dept}`}
                        checked={formData.permissions.empleados?.departamentos_visibles?.includes(dept)}
                        onCheckedChange={() => toggleDepartment(dept)}
                      />
                      <label htmlFor={`dept-${dept}`} className="text-sm cursor-pointer">
                        {dept}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Matriz de Permisos */}
          <RolePermissionsMatrix
            role={formData}
            onPermissionChange={(newPermissions) => setFormData({...formData, permissions: newPermissions})}
            editable={true}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Guardando..." : "Guardar Rol"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}