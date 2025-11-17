import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  UserX,
  Calendar,
  Cog,
  Cake,
  Wrench,
  Users,
  GripVertical,
} from "lucide-react";

const AVAILABLE_WIDGETS = [
  { id: 'absence_kpis', name: 'KPIs de Ausencias', icon: UserX, color: 'red' },
  { id: 'daily_planning_summary', name: 'Resumen Planning Diario', icon: Calendar, color: 'blue' },
  { id: 'machine_status', name: 'Estado de Máquinas', icon: Cog, color: 'green' },
  { id: 'upcoming_birthdays', name: 'Próximos Cumpleaños', icon: Cake, color: 'purple' },
  { id: 'maintenance_alerts', name: 'Alertas de Mantenimiento', icon: Wrench, color: 'orange' },
  { id: 'team_summary', name: 'Resumen de Equipos', icon: Users, color: 'indigo' }
];

export default function DashboardWidgetConfig({ currentUser, onClose }) {
  const [selectedRole, setSelectedRole] = useState(currentUser?.role || 'user');
  const [widgetStates, setWidgetStates] = useState({});
  const queryClient = useQueryClient();

  const { data: roleWidgets = [] } = useQuery({
    queryKey: ['dashboardWidgets', selectedRole],
    queryFn: () => base44.entities.DashboardWidget.filter({ role: selectedRole }),
    initialData: [],
  });

  useEffect(() => {
    const states = {};
    AVAILABLE_WIDGETS.forEach(widget => {
      const existing = roleWidgets.find(w => w.widget_id === widget.id);
      states[widget.id] = {
        enabled: existing?.enabled ?? true,
        order: existing?.order ?? 0,
        id: existing?.id
      };
    });
    setWidgetStates(states);
  }, [roleWidgets]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [];
      const creates = [];

      for (const [widgetId, state] of Object.entries(widgetStates)) {
        const data = {
          role: selectedRole,
          widget_id: widgetId,
          enabled: state.enabled,
          order: state.order
        };

        if (state.id) {
          updates.push(base44.entities.DashboardWidget.update(state.id, data));
        } else {
          creates.push(base44.entities.DashboardWidget.create(data));
        }
      }

      await Promise.all([...updates, ...creates]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardWidgets'] });
      toast.success("Configuración guardada");
      onClose();
    },
  });

  const toggleWidget = (widgetId) => {
    setWidgetStates(prev => ({
      ...prev,
      [widgetId]: { ...prev[widgetId], enabled: !prev[widgetId].enabled }
    }));
  };

  const updateOrder = (widgetId, order) => {
    setWidgetStates(prev => ({
      ...prev,
      [widgetId]: { ...prev[widgetId], order: parseInt(order) || 0 }
    }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Configurar Widgets del Dashboard</DialogTitle>
        </DialogHeader>

        {currentUser?.role === 'admin' && (
          <div className="mb-4">
            <Label>Configurar para Rol:</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3">
          {AVAILABLE_WIDGETS.map(widget => {
            const Icon = widget.icon;
            const state = widgetStates[widget.id] || { enabled: true, order: 0 };
            
            return (
              <Card key={widget.id} className={`p-4 ${state.enabled ? 'bg-blue-50' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-4">
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <Checkbox
                    checked={state.enabled}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                  <Icon className={`w-5 h-5 text-${widget.color}-600`} />
                  <Label className="flex-1 cursor-pointer" onClick={() => toggleWidget(widget.id)}>
                    {widget.name}
                  </Label>
                  <div className="w-24">
                    <Select
                      value={String(state.order)}
                      onValueChange={(val) => updateOrder(widget.id, val)}
                      disabled={!state.enabled}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5].map(num => (
                          <SelectItem key={num} value={String(num)}>
                            Orden {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}