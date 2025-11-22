import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Save, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function AbsenceNotificationConfig() {
  const [configs, setConfigs] = useState({});
  const queryClient = useQueryClient();

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

  const { data: notificationConfigs = [] } = useQuery({
    queryKey: ['absenceNotificationConfigs'],
    queryFn: () => base44.entities.EmailNotificationConfig.filter({ tipo_notificacion: 'ausencia' }),
    initialData: [],
  });

  React.useEffect(() => {
    const configMap = {};
    notificationConfigs.forEach(config => {
      configMap[config.absence_type_id || 'default'] = config;
    });
    setConfigs(configMap);
  }, [notificationConfigs]);

  const saveMutation = useMutation({
    mutationFn: async (configsToSave) => {
      const promises = Object.entries(configsToSave).map(([typeId, config]) => {
        const data = {
          ...config,
          tipo_notificacion: 'ausencia',
          absence_type_id: typeId === 'default' ? null : typeId
        };

        if (config.id) {
          return base44.entities.EmailNotificationConfig.update(config.id, data);
        } else {
          return base44.entities.EmailNotificationConfig.create(data);
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceNotificationConfigs'] });
      toast.success("Configuración de notificaciones guardada");
    },
  });

  const updateConfig = (typeId, field, value) => {
    setConfigs(prev => ({
      ...prev,
      [typeId]: {
        ...(prev[typeId] || {}),
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(configs);
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ Información:</strong> Configura quién recibe notificaciones automáticas cuando se solicita, 
            aprueba o rechaza una ausencia. Puedes configurar notificaciones generales y específicas por tipo.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Configuración General (Todas las Ausencias)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Notificaciones por Email
              </Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="default-email-request"
                    checked={configs.default?.email_en_solicitud || false}
                    onCheckedChange={(checked) => updateConfig('default', 'email_en_solicitud', checked)}
                  />
                  <label htmlFor="default-email-request" className="text-sm cursor-pointer">
                    Enviar email al solicitar ausencia
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="default-email-approval"
                    checked={configs.default?.email_en_aprobacion || false}
                    onCheckedChange={(checked) => updateConfig('default', 'email_en_aprobacion', checked)}
                  />
                  <label htmlFor="default-email-approval" className="text-sm cursor-pointer">
                    Enviar email al aprobar ausencia
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="default-email-reject"
                    checked={configs.default?.email_en_rechazo || false}
                    onCheckedChange={(checked) => updateConfig('default', 'email_en_rechazo', checked)}
                  />
                  <label htmlFor="default-email-reject" className="text-sm cursor-pointer">
                    Enviar email al rechazar ausencia
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Notificaciones In-App
              </Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="default-inapp-request"
                    checked={configs.default?.inapp_en_solicitud || false}
                    onCheckedChange={(checked) => updateConfig('default', 'inapp_en_solicitud', checked)}
                  />
                  <label htmlFor="default-inapp-request" className="text-sm cursor-pointer">
                    Notificación in-app al solicitar
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="default-inapp-approval"
                    checked={configs.default?.inapp_en_aprobacion || false}
                    onCheckedChange={(checked) => updateConfig('default', 'inapp_en_aprobacion', checked)}
                  />
                  <label htmlFor="default-inapp-approval" className="text-sm cursor-pointer">
                    Notificación in-app al aprobar
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="default-inapp-reject"
                    checked={configs.default?.inapp_en_rechazo || false}
                    onCheckedChange={(checked) => updateConfig('default', 'inapp_en_rechazo', checked)}
                  />
                  <label htmlFor="default-inapp-reject" className="text-sm cursor-pointer">
                    Notificación in-app al rechazar
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Destinatarios Adicionales</Label>
            <Select
              value={configs.default?.destinatarios_rol || "ninguno"}
              onValueChange={(value) => updateConfig('default', 'destinatarios_rol', value === "ninguno" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguno">Sin destinatarios adicionales</SelectItem>
                <SelectItem value="admin">Todos los Admin</SelectItem>
                <SelectItem value="supervisor">Todos los Supervisores</SelectItem>
                <SelectItem value="rrhh">Equipo RRHH</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base">Configuración por Tipo de Ausencia</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Tipo de Ausencia</TableHead>
                  <TableHead className="text-center">Email Solicitud</TableHead>
                  <TableHead className="text-center">Email Aprobación</TableHead>
                  <TableHead className="text-center">In-App</TableHead>
                  <TableHead>Destinatarios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {absenceTypes.map((type) => {
                  const config = configs[type.id] || {};
                  
                  return (
                    <TableRow key={type.id}>
                      <TableCell className="font-semibold">{type.nombre}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={config.email_en_solicitud || false}
                          onCheckedChange={(checked) => updateConfig(type.id, 'email_en_solicitud', checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={config.email_en_aprobacion || false}
                          onCheckedChange={(checked) => updateConfig(type.id, 'email_en_aprobacion', checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={config.inapp_en_solicitud || false}
                          onCheckedChange={(checked) => updateConfig(type.id, 'inapp_en_solicitud', checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={config.destinatarios_rol || "default"}
                          onValueChange={(value) => updateConfig(type.id, 'destinatarios_rol', value === "default" ? null : value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Usar configuración general</SelectItem>
                            <SelectItem value="admin">Todos los Admin</SelectItem>
                            <SelectItem value="supervisor">Supervisores</SelectItem>
                            <SelectItem value="rrhh">Equipo RRHH</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </div>
  );
}