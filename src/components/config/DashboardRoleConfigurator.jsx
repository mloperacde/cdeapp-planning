import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Save, Eye } from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_WIDGETS = [
  { id: "total_empleados", label: "Total Empleados", category: "kpi" },
  { id: "empleados_disponibles", label: "Empleados Disponibles", category: "kpi" },
  { id: "ausencias_activas", label: "Ausencias Activas", category: "kpi" },
  { id: "solicitudes_pendientes", label: "Solicitudes Pendientes", category: "kpi" },
  { id: "cumpleanos", label: "Próximos Cumpleaños", category: "widget" },
  { id: "aniversarios", label: "Aniversarios Laborales", category: "widget" },
  { id: "vacaciones", label: "Resumen de Vacaciones", category: "widget" },
  { id: "onboarding", label: "Estado de Onboarding", category: "widget" },
  { id: "departamentos", label: "Distribución por Departamento", category: "widget" },
  { id: "solicitudes_ausencia", label: "Solicitudes de Ausencia Pendientes", category: "widget" },
  { id: "contratos_vencer", label: "Contratos Próximos a Vencer", category: "widget" }
];

export default function DashboardRoleConfigurator() {
  const [selectedRole, setSelectedRole] = useState("");
  const queryClient = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    initialData: [],
  });

  const { data: roleConfig } = useQuery({
    queryKey: ['dashboardRoleConfig', selectedRole],
    queryFn: async () => {
      if (!selectedRole) return null;
      const configs = await base44.entities.DashboardRoleConfig.filter({ role_id: selectedRole });
      return configs[0] || {
        role_id: selectedRole,
        widgets_visibles: ["total_empleados", "empleados_disponibles", "ausencias_activas"],
        orden_widgets: [],
        layout: "grid",
        mostrar_kpis: true,
        kpis_visibles: ["total_empleados", "empleados_disponibles", "ausencias_activas", "solicitudes_pendientes"]
      };
    },
    enabled: !!selectedRole
  });

  const [formData, setFormData] = useState(roleConfig || {});

  React.useEffect(() => {
    if (roleConfig) {
      setFormData(roleConfig);
    }
  }, [roleConfig]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (roleConfig?.id) {
        return base44.entities.DashboardRoleConfig.update(roleConfig.id, data);
      }
      return base44.entities.DashboardRoleConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardRoleConfig'] });
      toast.success("Configuración de dashboard guardada");
    }
  });

  const handleSave = () => {
    if (!selectedRole) {
      toast.error("Selecciona un rol");
      return;
    }
    saveMutation.mutate(formData);
  };

  const toggleWidget = (widgetId) => {
    const current = formData.widgets_visibles || [];
    const updated = current.includes(widgetId)
      ? current.filter(w => w !== widgetId)
      : [...current, widgetId];
    setFormData({ ...formData, widgets_visibles: updated });
  };

  const toggleKPI = (kpiId) => {
    const current = formData.kpis_visibles || [];
    const updated = current.includes(kpiId)
      ? current.filter(k => k !== kpiId)
      : [...current, kpiId];
    setFormData({ ...formData, kpis_visibles: updated });
  };

  const kpis = AVAILABLE_WIDGETS.filter(w => w.category === "kpi");
  const widgets = AVAILABLE_WIDGETS.filter(w => w.category === "widget");

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle>Configuración de Dashboard por Roles</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Define qué widgets y KPIs verá cada rol en su dashboard principal
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Seleccionar Rol</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol para configurar" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.role_name} {role.is_admin && "(Admin)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRole && formData && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">KPIs Principales</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.mostrar_kpis}
                        onCheckedChange={(checked) => setFormData({ ...formData, mostrar_kpis: checked })}
                      />
                      <label className="text-sm cursor-pointer" onClick={() => setFormData({ ...formData, mostrar_kpis: !formData.mostrar_kpis })}>
                        Mostrar KPIs
                      </label>
                    </div>
                  </div>

                  {formData.mostrar_kpis && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {kpis.map(kpi => (
                        <div key={kpi.id} className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                          <Checkbox
                            checked={formData.kpis_visibles?.includes(kpi.id)}
                            onCheckedChange={() => toggleKPI(kpi.id)}
                          />
                          <label className="text-sm cursor-pointer flex-1" onClick={() => toggleKPI(kpi.id)}>
                            {kpi.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4 border-t pt-4">
                  <Label className="text-base font-semibold">Widgets del Dashboard</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {widgets.map(widget => (
                      <div key={widget.id} className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                        <Checkbox
                          checked={formData.widgets_visibles?.includes(widget.id)}
                          onCheckedChange={() => toggleWidget(widget.id)}
                        />
                        <label className="text-sm cursor-pointer flex-1" onClick={() => toggleWidget(widget.id)}>
                          {widget.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <Label className="text-base font-semibold">Layout del Dashboard</Label>
                  <Select
                    value={formData.layout}
                    onValueChange={(value) => setFormData({ ...formData, layout: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid (Tarjetas)</SelectItem>
                      <SelectItem value="list">Lista</SelectItem>
                      <SelectItem value="compact">Compacto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-blue-600">
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                  </Button>
                </div>
              </>
            )}

            {!selectedRole && (
              <div className="text-center py-12">
                <Eye className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Selecciona un rol para configurar su dashboard</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}