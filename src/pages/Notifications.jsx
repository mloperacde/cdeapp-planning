
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Settings, MessageSquare, Calendar, FileText, Wrench, Check, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import NotificationPreferencesDialog from "../components/notifications/NotificationPreferencesDialog";

export default function NotificationsPage() {
  const [showPreferences, setShowPreferences] = useState(false);
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const currentEmployee = employees.find(e => e.email === user?.email);

  const { data: notifications = [] } = useQuery({
    queryKey: ['pushNotifications', currentEmployee?.id],
    queryFn: () => currentEmployee 
      ? base44.entities.PushNotification.filter({ destinatario_id: currentEmployee.id }, '-created_date')
      : Promise.resolve([]),
    initialData: [],
    enabled: !!currentEmployee,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.PushNotification.update(id, { 
      leida: true, 
      fecha_leida: new Date().toISOString() 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushNotifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.PushNotification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushNotifications'] });
      toast.success("Notificación eliminada");
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.leida);
      await Promise.all(unread.map(n => 
        base44.entities.PushNotification.update(n.id, { 
          leida: true, 
          fecha_leida: new Date().toISOString() 
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushNotifications'] });
      toast.success("Todas marcadas como leídas");
    }
  });

  const filteredNotifications = notifications.filter(n => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.leida;
    return n.tipo === filter;
  });

  const unreadCount = notifications.filter(n => !n.leida).length;

  const getNotificationIcon = (tipo) => {
    switch (tipo) {
      case "mensaje": return MessageSquare;
      case "planificacion": return Calendar;
      case "ausencia": return Calendar;
      case "documento": return FileText;
      case "formacion": return FileText;
      case "sistema": return Bell;
      default: return Bell;
    }
  };

  const getNotificationColor = (tipo) => {
    switch (tipo) {
      case "mensaje": return "blue";
      case "planificacion": return "purple";
      case "ausencia": return "orange";
      case "documento": return "green";
      case "formacion": return "indigo";
      default: return "slate";
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-600" />
              Notificaciones
              {unreadCount > 0 && (
                <Badge className="bg-red-600 text-white">
                  {unreadCount} nuevas
                </Badge>
              )}
            </h1>
            <p className="text-slate-600 mt-1">
              Gestiona tus notificaciones y preferencias
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                variant="outline"
              >
                <Check className="w-4 h-4 mr-2" />
                Marcar todas leídas
              </Button>
            )}
            <Button onClick={() => setShowPreferences(true)} className="bg-blue-600">
              <Settings className="w-4 h-4 mr-2" />
              Preferencias
            </Button>
          </div>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread">No Leídas</TabsTrigger>
            <TabsTrigger value="mensaje">Mensajes</TabsTrigger>
            <TabsTrigger value="planificacion">Planificación</TabsTrigger>
            <TabsTrigger value="ausencia">Ausencias</TabsTrigger>
            <TabsTrigger value="documento">Documentos</TabsTrigger>
            <TabsTrigger value="sistema">Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-6">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay notificaciones</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notif) => {
                  const Icon = getNotificationIcon(notif.tipo);
                  const color = getNotificationColor(notif.tipo);
                  
                  return (
                    <Card 
                      key={notif.id} 
                      className={`border-2 hover:shadow-lg transition-all cursor-pointer ${
                        notif.leida ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-300'
                      }`}
                      onClick={() => !notif.leida && markAsReadMutation.mutate(notif.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-5 h-5 text-${color}-600`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-slate-900">{notif.titulo}</h4>
                              <div className="flex items-center gap-2">
                                {!notif.leida && (
                                  <Badge className="bg-blue-600 text-white text-xs">Nueva</Badge>
                                )}
                                {notif.prioridad === "urgente" && (
                                  <Badge className="bg-red-600 text-white text-xs">Urgente</Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{notif.mensaje}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-slate-500">
                                {format(new Date(notif.created_date), "dd/MM/yyyy HH:mm", { locale: es })}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotificationMutation.mutate(notif.id);
                                }}
                                className="hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {showPreferences && user && (
        <NotificationPreferencesDialog
          userId={currentEmployee?.id}
          onClose={() => setShowPreferences(false)}
        />
      )}
    </div>
  );
}
