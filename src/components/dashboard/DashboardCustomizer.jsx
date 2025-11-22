import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_WIDGETS = [
  { id: 'absence_trends', name: 'Tendencias de Ausencias', description: 'Gráfico de tendencias de 6 meses' },
  { id: 'approval_times', name: 'Tiempos de Aprobación', description: 'Métricas de tiempos de respuesta' },
  { id: 'absence_distribution', name: 'Distribución de Ausencias', description: 'Gráfico circular por tipo' },
  { id: 'absenteeism_rate', name: 'Tasa de Absentismo', description: 'KPI de absentismo general' },
  { id: 'sync_status', name: 'Estado de Sincronización', description: 'Estado de BD Maestra' },
  { id: 'upcoming_absences', name: 'Próximas Ausencias', description: 'Ausencias programadas' },
];

export default function DashboardCustomizer({ open, onClose, currentRole }) {
  const [dashboardName, setDashboardName] = useState('Dashboard Personalizado');
  const [selectedWidgets, setSelectedWidgets] = useState(AVAILABLE_WIDGETS.map(w => ({
    widget_id: w.id,
    enabled: true,
    position: 0,
    size: 'medium'
  })));
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (configData) => {
      const user = await base44.auth.me();
      return base44.entities.DashboardWidgetConfig.create({
        user_id: user.id,
        role: currentRole,
        dashboard_name: configData.dashboardName,
        widgets: configData.widgets,
        activo: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardConfig'] });
      toast.success('Configuración guardada correctamente');
      onClose();
    },
  });

  const toggleWidget = (widgetId) => {
    setSelectedWidgets(prev => prev.map(w => 
      w.widget_id === widgetId ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const updateWidgetSize = (widgetId, size) => {
    setSelectedWidgets(prev => prev.map(w => 
      w.widget_id === widgetId ? { ...w, size } : w
    ));
  };

  const handleSave = () => {
    saveMutation.mutate({
      dashboardName,
      widgets: selectedWidgets.filter(w => w.enabled)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Personalizar Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Nombre del Dashboard</Label>
            <Input
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              placeholder="Mi Dashboard Personalizado"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Widgets Disponibles</Label>
            <div className="space-y-3">
              {AVAILABLE_WIDGETS.map(widget => {
                const config = selectedWidgets.find(w => w.widget_id === widget.id);
                return (
                  <div key={widget.id} className="p-4 border rounded-lg bg-slate-50">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={config?.enabled}
                        onCheckedChange={() => toggleWidget(widget.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{widget.name}</div>
                        <div className="text-xs text-slate-600 mt-1">{widget.description}</div>
                        
                        {config?.enabled && (
                          <div className="mt-3">
                            <Label className="text-xs">Tamaño</Label>
                            <Select 
                              value={config.size} 
                              onValueChange={(value) => updateWidgetSize(widget.id, value)}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Pequeño</SelectItem>
                                <SelectItem value="medium">Mediano</SelectItem>
                                <SelectItem value="large">Grande</SelectItem>
                                <SelectItem value="full">Ancho completo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Guardar Configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}