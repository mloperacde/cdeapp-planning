
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

export default function RoleForm({ role, onClose }) {
  const [formData, setFormData] = useState(role || {
    role_name: "",
    description: "",
    is_admin: false,
    nivel_prioridad: 1,
    permissions: {
      modulos_acceso: [],
      acciones_empleados: { ver: false, crear: false, editar: false, eliminar: false },
      acciones_ausencias: { ver_propias: true, crear_propias: true, ver_todas: false, aprobar: false },
      acciones_maquinas: { ver: false, actualizar_estado: false, planificar: false },
      acciones_mantenimiento: { ver: false, crear: false, actualizar: false, completar: false },
      acciones_comites: { ver: false, gestionar_miembros: false, gestionar_documentos: false },
      acciones_prl: {
        ver_equipo_emergencias: false,
        gestionar_equipo_emergencias: false,
        ver_formaciones: false,
        asignar_formaciones: false,
        ver_documentacion: false,
        subir_documentacion: false
      },
      ui_visibilidad: {
        timeline: {
          botones_configuracion: false,
          filtros_avanzados: false
        },
        empleados: {
          boton_nuevo: false,
          boton_editar: false,
          boton_eliminar: false
        },
        maquinas: {
          boton_nuevo: false,
          boton_editar: false,
          cambiar_estado: false
        },
        ausencias: {
          boton_nueva: true,
          boton_aprobar: false,
          ver_todas: false
        }
      }
    }
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (role?.id) {
        return base44.entities.UserRole.update(role.id, data);
      }
      return base44.entities.UserRole.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      toast.success(role ? "Rol actualizado" : "Rol creado");
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.role_name.trim()) {
      toast.error("El nombre del rol es obligatorio");
      return;
    }
    saveMutation.mutate(formData);
  };

  const allModulos = ["Dashboard", "Empleados", "Planning", "Maquinas", "Mantenimiento", "Ausencias", "Comites", "PRL", "Taquillas", "Habilidades", "Informes", "Configuracion", "Usuarios"];

  const toggleModulo = (modulo) => {
    const current = formData.permissions?.modulos_acceso || [];
    const updated = current.includes(modulo)
      ? current.filter(m => m !== modulo)
      : [...current, modulo];
    setFormData({
      ...formData,
      permissions: { ...formData.permissions, modulos_acceso: updated }
    });
  };

  const updatePermission = (category, key, value) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [category]: {
          ...(formData.permissions?.[category] || {}),
          [key]: value
        }
      }
    });
  };

  const updateUIPermission = (module, key, value) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        ui_visibilidad: {
          ...(formData.permissions?.ui_visibilidad || {}),
          [module]: {
            ...(formData.permissions?.ui_visibilidad?.[module] || {}),
            [key]: value
          }
        }
      }
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose} modal={false}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{role ? "Editar Rol" : "Crear Nuevo Rol"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Rol *</Label>
            <Input
              value={formData.role_name}
              onChange={(e) => setFormData({...formData, role_name: e.target.value})}
              placeholder="ej. Supervisor, Técnico..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descripción del rol"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nivel de Prioridad (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={formData.nivel_prioridad}
                onChange={(e) => setFormData({...formData, nivel_prioridad: parseInt(e.target.value)})}
              />
            </div>
            <div className="flex items-center gap-2 pt-8">
              <Checkbox
                checked={formData.is_admin}
                onCheckedChange={(checked) => setFormData({...formData, is_admin: checked})}
              />
              <label className="text-sm font-medium cursor-pointer" onClick={() => setFormData({...formData, is_admin: !formData.is_admin})}>
                Administrador (acceso completo)
              </label>
            </div>
          </div>

          <Tabs defaultValue="modulos">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="modulos">Módulos</TabsTrigger>
              <TabsTrigger value="acciones">Acciones</TabsTrigger>
              <TabsTrigger value="ui">Visibilidad UI</TabsTrigger>
            </TabsList>

            <TabsContent value="modulos" className="space-y-3 mt-4">
              <Label>Módulos de Acceso</Label>
              <div className="grid grid-cols-2 gap-2">
                {allModulos.map(mod => (
                  <div key={mod} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.modulos_acceso?.includes(mod)}
                      onCheckedChange={() => toggleModulo(mod)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => toggleModulo(mod)}>
                      {mod}
                    </label>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="acciones" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Empleados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.keys(formData.permissions?.acciones_empleados || {}).map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.permissions?.acciones_empleados?.[key] || false}
                        onCheckedChange={(checked) => updatePermission('acciones_empleados', key, checked)}
                      />
                      <label className="text-sm cursor-pointer capitalize" onClick={() => updatePermission('acciones_empleados', key, !(formData.permissions?.acciones_empleados?.[key]))}>
                        {key.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ausencias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.keys(formData.permissions?.acciones_ausencias || {}).map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.permissions?.acciones_ausencias?.[key] || false}
                        onCheckedChange={(checked) => updatePermission('acciones_ausencias', key, checked)}
                      />
                      <label className="text-sm cursor-pointer capitalize" onClick={() => updatePermission('acciones_ausencias', key, !(formData.permissions?.acciones_ausencias?.[key]))}>
                        {key.replace(/_/g, ' ')}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Máquinas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.keys(formData.permissions?.acciones_maquinas || {}).map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.permissions?.acciones_maquinas?.[key] || false}
                        onCheckedChange={(checked) => updatePermission('acciones_maquinas', key, checked)}
                      />
                      <label className="text-sm cursor-pointer capitalize" onClick={() => updatePermission('acciones_maquinas', key, !(formData.permissions?.acciones_maquinas?.[key]))}>
                        {key.replace(/_/g, ' ')}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Mantenimiento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.keys(formData.permissions?.acciones_mantenimiento || {}).map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.permissions?.acciones_mantenimiento?.[key] || false}
                        onCheckedChange={(checked) => updatePermission('acciones_mantenimiento', key, checked)}
                      />
                      <label className="text-sm cursor-pointer capitalize" onClick={() => updatePermission('acciones_mantenimiento', key, !(formData.permissions?.acciones_mantenimiento?.[key]))}>
                        {key}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">PRL (Prevención de Riesgos Laborales)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.acciones_prl?.ver_equipo_emergencias || false}
                      onCheckedChange={(checked) => updatePermission('acciones_prl', 'ver_equipo_emergencias', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updatePermission('acciones_prl', 'ver_equipo_emergencias', !(formData.permissions?.acciones_prl?.ver_equipo_emergencias))}>
                      Ver Equipo de Emergencias
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.acciones_prl?.gestionar_equipo_emergencias || false}
                      onCheckedChange={(checked) => updatePermission('acciones_prl', 'gestionar_equipo_emergencias', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updatePermission('acciones_prl', 'gestionar_equipo_emergencias', !(formData.permissions?.acciones_prl?.gestionar_equipo_emergencias))}>
                      Gestionar Equipo de Emergencias
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.acciones_prl?.ver_formaciones || false}
                      onCheckedChange={(checked) => updatePermission('acciones_prl', 'ver_formaciones', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updatePermission('acciones_prl', 'ver_formaciones', !(formData.permissions?.acciones_prl?.ver_formaciones))}>
                      Ver Formaciones PRL
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.acciones_prl?.asignar_formaciones || false}
                      onCheckedChange={(checked) => updatePermission('acciones_prl', 'asignar_formaciones', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updatePermission('acciones_prl', 'asignar_formaciones', !(formData.permissions?.acciones_prl?.asignar_formaciones))}>
                      Asignar Formaciones
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.acciones_prl?.ver_documentacion || false}
                      onCheckedChange={(checked) => updatePermission('acciones_prl', 'ver_documentacion', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updatePermission('acciones_prl', 'ver_documentacion', !(formData.permissions?.acciones_prl?.ver_documentacion))}>
                      Ver Documentación PRL
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.acciones_prl?.subir_documentacion || false}
                      onCheckedChange={(checked) => updatePermission('acciones_prl', 'subir_documentacion', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updatePermission('acciones_prl', 'subir_documentacion', !(formData.permissions?.acciones_prl?.subir_documentacion))}>
                      Subir Documentación PRL
                    </label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ui" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Timeline / Planning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.ui_visibilidad?.timeline?.botones_configuracion || false}
                      onCheckedChange={(checked) => updateUIPermission('timeline', 'botones_configuracion', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updateUIPermission('timeline', 'botones_configuracion', !(formData.permissions?.ui_visibilidad?.timeline?.botones_configuracion))}>
                      Botones de configuración (Festivos/Vacaciones)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.ui_visibilidad?.timeline?.filtros_avanzados || false}
                      onCheckedChange={(checked) => updateUIPermission('timeline', 'filtros_avanzados', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updateUIPermission('timeline', 'filtros_avanzados', !(formData.permissions?.ui_visibilidad?.timeline?.filtros_avanzados))}>
                      Filtros avanzados
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Empleados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.ui_visibilidad?.empleados?.boton_nuevo || false}
                      onCheckedChange={(checked) => updateUIPermission('empleados', 'boton_nuevo', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updateUIPermission('empleados', 'boton_nuevo', !(formData.permissions?.ui_visibilidad?.empleados?.boton_nuevo))}>
                      Botón Nuevo Empleado
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.ui_visibilidad?.empleados?.boton_editar || false}
                      onCheckedChange={(checked) => updateUIPermission('empleados', 'boton_editar', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updateUIPermission('empleados', 'boton_editar', !(formData.permissions?.ui_visibilidad?.empleados?.boton_editar))}>
                      Botón Editar
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.ui_visibilidad?.empleados?.boton_eliminar || false}
                      onCheckedChange={(checked) => updateUIPermission('empleados', 'boton_eliminar', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updateUIPermission('empleados', 'boton_eliminar', !(formData.permissions?.ui_visibilidad?.empleados?.boton_eliminar))}>
                      Botón Eliminar
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Máquinas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.ui_visibilidad?.maquinas?.boton_nuevo || false}
                      onCheckedChange={(checked) => updateUIPermission('maquinas', 'boton_nuevo', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updateUIPermission('maquinas', 'boton_nuevo', !(formData.permissions?.ui_visibilidad?.maquinas?.boton_nuevo))}>
                      Botón Nueva Máquina
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.ui_visibilidad?.maquinas?.boton_editar || false}
                      onCheckedChange={(checked) => updateUIPermission('maquinas', 'boton_editar', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updateUIPermission('maquinas', 'boton_editar', !(formData.permissions?.ui_visibilidad?.maquinas?.boton_editar))}>
                      Botón Editar
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.ui_visibilidad?.maquinas?.cambiar_estado || false}
                      onCheckedChange={(checked) => updateUIPermission('maquinas', 'cambiar_estado', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updateUIPermission('maquinas', 'cambiar_estado', !(formData.permissions?.ui_visibilidad?.maquinas?.cambiar_estado))}>
                      Cambiar Estado
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Ausencias
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.ui_visibilidad?.ausencias?.boton_nueva || false}
                      onCheckedChange={(checked) => updateUIPermission('ausencias', 'boton_nueva', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updateUIPermission('ausencias', 'boton_nueva', !(formData.permissions?.ui_visibilidad?.ausencias?.boton_nueva))}>
                      Botón Nueva Ausencia
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.ui_visibilidad?.ausencias?.boton_aprobar || false}
                      onCheckedChange={(checked) => updateUIPermission('ausencias', 'boton_aprobar', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updateUIPermission('ausencias', 'boton_aprobar', !(formData.permissions?.ui_visibilidad?.ausencias?.boton_aprobar))}>
                      Botón Aprobar
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.permissions?.ui_visibilidad?.ausencias?.ver_todas || false}
                      onCheckedChange={(checked) => updateUIPermission('ausencias', 'ver_todas', checked)}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => updateUIPermission('ausencias', 'ver_todas', !(formData.permissions?.ui_visibilidad?.ausencias?.ver_todas))}>
                      Ver Todas las Ausencias
                    </label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : role ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
