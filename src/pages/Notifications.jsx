import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BellOff, CheckCircle, AlertTriangle, Trash2, Settings as SettingsIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function NotificationsPage() {
  const [preferences, setPreferences] = useState({
    operadores_insuficientes: true,
    mantenimiento_proximo: true,
    dias_anticipacion_mantenimiento: 7,
    tarea_vencida: true,
    ausencia_finalizada: true,
    contrato_proximo_vencer: true,
    dias_anticipacion_contrato: 30,
  });

  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-fecha_creacion'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: maintenances } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => base44.entities.MaintenanceSchedule.list(),
    initialData: [],
  });

  const { data: absences } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const { data: plannings } = useQuery({
    queryKey: ['machinePlannings'],
    queryFn: () => base44.entities.MachinePlanning.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { leida: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: (data) => base44.entities.Notification.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Generar notificaciones automáticas
  useEffect(() => {
    const generateNotifications = () => {
      const now = new Date();

      // Verificar operadores insuficientes
      if (preferences.operadores_insuficientes) {
        teams.forEach(team => {
          const teamEmployees = employees.filter(e => e.equipo === team.team_name && e.disponibilidad === "Disponible");
          const todayPlannings = plannings.filter(p => 
            p.activa_planning && 
            p.team_key === team.team_key && 
            p.fecha_planificacion === format(now, 'yyyy-MM-dd')
          );
          const totalNeeded = todayPlannings.reduce((sum, p) => sum + (p.operadores_necesarios || 0), 0);

          if (totalNeeded > teamEmployees.length) {
            const existingNotif = notifications.find(n => 
              n.tipo === "Operadores Insuficientes" && 
              !n.leida &&
              n.datos_relacionados?.team === team.team_key &&
              n.datos_relacionados?.fecha === format(now, 'yyyy-MM-dd')
            );

            if (!existingNotif) {
              createNotificationMutation.mutate({
                tipo: "Operadores Insuficientes",
                prioridad: "Crítica",
                titulo: `Faltan operadores en ${team.team_name}`,
                mensaje: `Se necesitan ${totalNeeded} operadores pero solo hay ${teamEmployees.length} disponibles.`,
                fecha_creacion: now.toISOString(),
                datos_relacionados: { team: team.team_key, fecha: format(now, 'yyyy-MM-dd') }
              });
            }
          }
        });
      }

      // Verificar mantenimientos próximos
      if (preferences.mantenimiento_proximo) {
        maintenances.filter(m => m.estado === "Pendiente").forEach(maint => {
          const daysUntil = differenceInDays(new Date(maint.fecha_programada), now);
          if (daysUntil <= preferences.dias_anticipacion_mantenimiento && daysUntil >= 0) {
            const existingNotif = notifications.find(n => 
              n.tipo === "Mantenimiento Próximo" && 
              !n.leida &&
              n.datos_relacionados?.maintenanceId === maint.id
            );

            if (!existingNotif) {
              createNotificationMutation.mutate({
                tipo: "Mantenimiento Próximo",
                prioridad: daysUntil <= 2 ? "Alta" : "Media",
                titulo: `Mantenimiento programado en ${daysUntil} días`,
                mensaje: `Mantenimiento ${maint.tipo} programado para ${format(new Date(maint.fecha_programada), "dd/MM/yyyy HH:mm")}`,
                fecha_creacion: now.toISOString(),
                enlace: "/MaintenanceTracking",
                datos_relacionados: { maintenanceId: maint.id }
              });
            }
          }
        });
      }

      // Verificar ausencias finalizadas
      if (preferences.ausencia_finalizada) {
        absences.forEach(abs => {
          const endDate = new Date(abs.fecha_fin);
          const daysSinceEnd = differenceInDays(now, endDate);
          if (daysSinceEnd === 0) {
            const existingNotif = notifications.find(n => 
              n.tipo === "Ausencia Finalizada" && 
              !n.leida &&
              n.datos_relacionados?.absenceId === abs.id
            );

            if (!existingNotif) {
              createNotificationMutation.mutate({
                tipo: "Ausencia Finalizada",
                prioridad: "Media",
                titulo: "Ausencia finalizada",
                mensaje: `La ausencia de un empleado ha finalizado hoy. Verificar disponibilidad.`,
                fecha_creacion: now.toISOString(),
                enlace: "/AbsenceManagement",
                datos_relacionados: { absenceId: abs.id }
              });
            }
          }
        });
      }

      // Verificar contratos próximos a vencer
      if (preferences.contrato_proximo_vencer) {
        employees.filter(e => e.fecha_fin_contrato).forEach(emp => {
          const daysUntil = differenceInDays(new Date(emp.fecha_fin_contrato), now);
          if (daysUntil <= preferences.dias_anticipacion_contrato && daysUntil >= 0) {
            const existingNotif = notifications.find(n => 
              n.tipo === "Contrato Próximo a Vencer" && 
              !n.leida &&
              n.datos_relacionados?.employeeId === emp.id
            );

            if (!existingNotif) {
              createNotificationMutation.mutate({
                tipo: "Contrato Próximo a Vencer",
                prioridad: daysUntil <= 7 ? "Alta" : "Media",
                titulo: `Contrato próximo a vencer: ${emp.nombre}`,
                mensaje: `El contrato vence en ${daysUntil} días (${format(new Date(emp.fecha_fin_contrato), "dd/MM/yyyy")})`,
                fecha_creacion: now.toISOString(),
                enlace: "/Employees",
                datos_relacionados: { employeeId: emp.id }
              });
            }
          }
        });
      }
    };

    generateNotifications();
    const interval = setInterval(generateNotifications, 300000); // Cada 5 minutos

    return () => clearInterval(interval);
  }, [preferences, employees, maintenances, absences, plannings, teams, notifications]);

  const unreadNotifications = useMemo(() => {
    return notifications.filter(n => !n.leida);
  }, [notifications]);

  const readNotifications = useMemo(() => {
    return notifications.filter(n => n.leida);
  }, [notifications]);

  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case "Crítica": return "bg-red-100 text-red-800 border-red-300";
      case "Alta": return "bg-orange-100 text-orange-800 border-orange-300";
      case "Media": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Baja": return "bg-blue-100 text-blue-800 border-blue-300";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-600" />
              Notificaciones
            </h1>
            <p className="text-slate-600 mt-1">
              Alertas y eventos importantes del sistema
            </p>
          </div>
          {unreadNotifications.length > 0 && (
            <Badge className="bg-red-500 text-white text-lg px-3 py-1">
              {unreadNotifications.length} sin leer
            </Badge>
          )}
        </div>

        <Tabs defaultValue="unread" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="unread">
              Sin Leer ({unreadNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="read">
              Leídas ({readNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="settings">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread">
            <Card>
              <CardContent className="p-6">
                {unreadNotifications.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <BellOff className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No hay notificaciones sin leer</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unreadNotifications.map((notif) => (
                      <div key={notif.id} className={`border-2 rounded-lg p-4 ${getPriorityColor(notif.prioridad)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getPriorityColor(notif.prioridad)}>
                                {notif.prioridad}
                              </Badge>
                              <Badge variant="outline">{notif.tipo}</Badge>
                              <span className="text-xs text-slate-500">
                                {format(new Date(notif.fecha_creacion), "dd/MM/yyyy HH:mm", { locale: es })}
                              </span>
                            </div>
                            <h3 className="font-semibold text-lg mb-1">{notif.titulo}</h3>
                            <p className="text-sm text-slate-700">{notif.mensaje}</p>
                            {notif.enlace && (
                              <Link to={notif.enlace}>
                                <Button variant="link" className="p-0 h-auto mt-2 text-blue-600">
                                  Ver detalles →
                                </Button>
                              </Link>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => markAsReadMutation.mutate(notif.id)}
                              title="Marcar como leída"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => deleteNotificationMutation.mutate(notif.id)}
                              className="hover:bg-red-50 hover:text-red-600"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="read">
            <Card>
              <CardContent className="p-6">
                {readNotifications.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay notificaciones leídas
                  </div>
                ) : (
                  <div className="space-y-3">
                    {readNotifications.map((notif) => (
                      <div key={notif.id} className="border rounded-lg p-4 bg-slate-50 opacity-70">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{notif.tipo}</Badge>
                              <span className="text-xs text-slate-500">
                                {format(new Date(notif.fecha_creacion), "dd/MM/yyyy HH:mm", { locale: es })}
                              </span>
                            </div>
                            <h3 className="font-semibold mb-1">{notif.titulo}</h3>
                            <p className="text-sm text-slate-600">{notif.mensaje}</p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteNotificationMutation.mutate(notif.id)}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Preferencias de Notificaciones</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="text-base font-semibold">Operadores Insuficientes</Label>
                      <p className="text-sm text-slate-600">Alertar cuando falten operadores para la planificación</p>
                    </div>
                    <Switch
                      checked={preferences.operadores_insuficientes}
                      onCheckedChange={(checked) => setPreferences({...preferences, operadores_insuficientes: checked})}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-semibold">Mantenimiento Próximo</Label>
                        <p className="text-sm text-slate-600">Alertar sobre mantenimientos programados</p>
                      </div>
                      <Switch
                        checked={preferences.mantenimiento_proximo}
                        onCheckedChange={(checked) => setPreferences({...preferences, mantenimiento_proximo: checked})}
                      />
                    </div>
                    {preferences.mantenimiento_proximo && (
                      <div className="ml-6 flex items-center gap-3">
                        <Label>Días de anticipación:</Label>
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          value={preferences.dias_anticipacion_mantenimiento}
                          onChange={(e) => setPreferences({...preferences, dias_anticipacion_mantenimiento: parseInt(e.target.value)})}
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="text-base font-semibold">Tareas Vencidas</Label>
                      <p className="text-sm text-slate-600">Alertar sobre tareas o mantenimientos vencidos</p>
                    </div>
                    <Switch
                      checked={preferences.tarea_vencida}
                      onCheckedChange={(checked) => setPreferences({...preferences, tarea_vencida: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="text-base font-semibold">Ausencias Finalizadas</Label>
                      <p className="text-sm text-slate-600">Alertar cuando finalice una ausencia de empleado</p>
                    </div>
                    <Switch
                      checked={preferences.ausencia_finalizada}
                      onCheckedChange={(checked) => setPreferences({...preferences, ausencia_finalizada: checked})}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-base font-semibold">Contratos Próximos a Vencer</Label>
                        <p className="text-sm text-slate-600">Alertar sobre contratos que están por finalizar</p>
                      </div>
                      <Switch
                        checked={preferences.contrato_proximo_vencer}
                        onCheckedChange={(checked) => setPreferences({...preferences, contrato_proximo_vencer: checked})}
                      />
                    </div>
                    {preferences.contrato_proximo_vencer && (
                      <div className="ml-6 flex items-center gap-3">
                        <Label>Días de anticipación:</Label>
                        <Input
                          type="number"
                          min="1"
                          max="90"
                          value={preferences.dias_anticipacion_contrato}
                          onChange={(e) => setPreferences({...preferences, dias_anticipacion_contrato: parseInt(e.target.value)})}
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Guardar Preferencias
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}