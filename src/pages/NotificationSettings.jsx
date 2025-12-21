import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Smartphone, Clock, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const DEFAULT_PREFERENCES = {
  notification_types: {
    absences: { enabled: true, push: true, email: false },
    planning: { enabled: true, push: true, email: false },
    maintenance: { enabled: true, push: true, email: false },
    machines: { enabled: true, push: true, email: false },
    employees: { enabled: true, push: false, email: false },
    system: { enabled: true, push: true, email: true }
  },
  quiet_hours: {
    enabled: false,
    start: "22:00",
    end: "08:00"
  }
};

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: savedPreferences, isLoading } = useQuery({
    queryKey: ['notificationPreferences', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const prefs = await base44.entities.NotificationPreference.filter({ user_email: user.email });
      return prefs[0] || null;
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (savedPreferences) {
      setPreferences({
        notification_types: savedPreferences.notification_types || DEFAULT_PREFERENCES.notification_types,
        quiet_hours: savedPreferences.quiet_hours || DEFAULT_PREFERENCES.quiet_hours
      });
    }
  }, [savedPreferences]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (savedPreferences?.id) {
        return await base44.entities.NotificationPreference.update(savedPreferences.id, data);
      } else {
        return await base44.entities.NotificationPreference.create({
          ...data,
          user_email: user.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Preferencias guardadas correctamente');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(preferences);
  };

  const updateNotificationType = (category, field, value) => {
    setPreferences(prev => ({
      ...prev,
      notification_types: {
        ...prev.notification_types,
        [category]: {
          ...prev.notification_types[category],
          [field]: value
        }
      }
    }));
  };

  const updateQuietHours = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      quiet_hours: {
        ...prev.quiet_hours,
        [field]: value
      }
    }));
  };

  const categories = [
    { key: 'absences', label: 'Ausencias', desc: 'Solicitudes, aprobaciones y rechazos' },
    { key: 'planning', label: 'Planificación', desc: 'Cambios en turnos y asignaciones' },
    { key: 'maintenance', label: 'Mantenimiento', desc: 'Alertas de mantenimiento urgente' },
    { key: 'machines', label: 'Máquinas', desc: 'Estado y alertas de máquinas' },
    { key: 'employees', label: 'Empleados', desc: 'Actualizaciones de personal' },
    { key: 'system', label: 'Sistema', desc: 'Notificaciones importantes del sistema' }
  ];

  if (isLoading) {
    return <div className="p-8 text-center">Cargando...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Preferencias de Notificaciones</h1>
            <p className="text-sm text-slate-500 mt-1">Personaliza cómo recibes las notificaciones</p>
          </div>
        </div>
        <Link to={createPageUrl("NotificationCenter")}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de Notificaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {categories.map((category) => (
            <div key={category.key} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{category.label}</h3>
                  <p className="text-xs text-slate-500">{category.desc}</p>
                </div>
                <Switch
                  checked={preferences.notification_types[category.key]?.enabled}
                  onCheckedChange={(checked) => updateNotificationType(category.key, 'enabled', checked)}
                />
              </div>

              {preferences.notification_types[category.key]?.enabled && (
                <div className="flex gap-6 ml-4 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-slate-500" />
                    <Label className="text-sm">Push</Label>
                    <Switch
                      checked={preferences.notification_types[category.key]?.push}
                      onCheckedChange={(checked) => updateNotificationType(category.key, 'push', checked)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <Label className="text-sm">Email</Label>
                    <Switch
                      checked={preferences.notification_types[category.key]?.email}
                      onCheckedChange={(checked) => updateNotificationType(category.key, 'email', checked)}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Horario de Silencio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Activar horario de silencio</Label>
              <p className="text-xs text-slate-500 mt-1">
                No recibirás notificaciones durante este período
              </p>
            </div>
            <Switch
              checked={preferences.quiet_hours?.enabled}
              onCheckedChange={(checked) => updateQuietHours('enabled', checked)}
            />
          </div>

          {preferences.quiet_hours?.enabled && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Hora de inicio</Label>
                <Input
                  type="time"
                  value={preferences.quiet_hours?.start || "22:00"}
                  onChange={(e) => updateQuietHours('start', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora de fin</Label>
                <Input
                  type="time"
                  value={preferences.quiet_hours?.end || "08:00"}
                  onChange={(e) => updateQuietHours('end', e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Guardando...' : 'Guardar Preferencias'}
        </Button>
      </div>
    </div>
  );
}