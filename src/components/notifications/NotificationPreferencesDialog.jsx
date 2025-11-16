import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, MessageSquare, Calendar, FileText, Wrench, UserX } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPreferencesDialog({ userId, onClose }) {
  const queryClient = useQueryClient();

  const { data: preferences } = useQuery({
    queryKey: ['notificationPreferences', userId],
    queryFn: async () => {
      const prefs = await base44.entities.NotificationPreference.filter({ user_id: userId });
      return prefs[0] || {
        user_id: userId,
        mensajes_directos: true,
        mensajes_canales: true,
        cambios_planificacion_maquinas: true,
        ausencias_aprobadas: true,
        ausencias_rechazadas: true,
        solicitudes_ausencia_pendientes: true,
        operadores_insuficientes: true,
        mantenimiento_proximo: true,
        dias_anticipacion_mantenimiento: 7,
        tarea_vencida: true,
        ausencia_finalizada: true,
        contrato_proximo_vencer: true,
        dias_anticipacion_contrato: 30,
        documentos_nuevos: true,
        formaciones_asignadas: true,
        vacaciones_proximas: true,
        festivos_proximos: true
      };
    }
  });

  const [formData, setFormData] = useState(preferences || {});

  React.useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (preferences?.id) {
        return base44.entities.NotificationPreference.update(preferences.id, data);
      }
      return base44.entities.NotificationPreference.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success("Preferencias guardadas");
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const togglePreference = (key) => {
    setFormData({ ...formData, [key]: !formData[key] });
  };

  const sections = [
    {
      title: "Mensajería",
      icon: MessageSquare,
      color: "blue",
      preferences: [
        { key: "mensajes_directos", label: "Mensajes Directos" },
        { key: "mensajes_canales", label: "Mensajes en Canales" }
      ]
    },
    {
      title: "Planificación",
      icon: Calendar,
      color: "purple",
      preferences: [
        { key: "cambios_planificacion_maquinas", label: "Cambios en Planificación de Máquinas" },
        { key: "operadores_insuficientes", label: "Operadores Insuficientes" }
      ]
    },
    {
      title: "Ausencias",
      icon: UserX,
      color: "red",
      preferences: [
        { key: "ausencias_aprobadas", label: "Ausencias Aprobadas" },
        { key: "ausencias_rechazadas", label: "Ausencias Rechazadas" },
        { key: "solicitudes_ausencia_pendientes", label: "Solicitudes Pendientes (Supervisores)" },
        { key: "ausencia_finalizada", label: "Ausencias Finalizadas" }
      ]
    },
    {
      title: "Mantenimiento",
      icon: Wrench,
      color: "orange",
      preferences: [
        { key: "mantenimiento_proximo", label: "Mantenimientos Próximos" },
        { key: "tarea_vencida", label: "Tareas Vencidas" }
      ]
    },
    {
      title: "Documentos y Formación",
      icon: FileText,
      color: "green",
      preferences: [
        { key: "documentos_nuevos", label: "Documentos Nuevos" },
        { key: "formaciones_asignadas", label: "Formaciones Asignadas" }
      ]
    },
    {
      title: "Calendario",
      icon: Calendar,
      color: "indigo",
      preferences: [
        { key: "vacaciones_proximas", label: "Vacaciones Próximas" },
        { key: "festivos_proximos", label: "Festivos Próximos" },
        { key: "contrato_proximo_vencer", label: "Contratos por Vencer" }
      ]
    }
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Preferencias de Notificaciones
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title} className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className={`w-5 h-5 text-${section.color}-600`} />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.preferences.map((pref) => (
                    <div key={pref.key} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData[pref.key]}
                        onCheckedChange={() => togglePreference(pref.key)}
                      />
                      <label className="text-sm cursor-pointer flex-1" onClick={() => togglePreference(pref.key)}>
                        {pref.label}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          <Card className="border-2 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Anticipación de Alertas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Días antes - Mantenimiento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.dias_anticipacion_mantenimiento || 7}
                    onChange={(e) => setFormData({...formData, dias_anticipacion_mantenimiento: parseInt(e.target.value) || 7})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Días antes - Contratos</Label>
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    value={formData.dias_anticipacion_contrato || 30}
                    onChange={(e) => setFormData({...formData, dias_anticipacion_contrato: parseInt(e.target.value) || 30})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar Preferencias"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}