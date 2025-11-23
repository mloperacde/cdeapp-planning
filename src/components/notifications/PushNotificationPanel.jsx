import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, MessageSquare, Calendar, FileText, AlertCircle, 
  CheckCircle2, Clock, X 
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { markNotificationsAsRead } from "./NotificationService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function PushNotificationPanel({ employeeId, mobile = false }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['pushNotifications', employeeId],
    queryFn: async () => {
      const notifs = await base44.entities.PushNotification.filter(
        { destinatario_id: employeeId },
        '-created_date'
      );
      return notifs;
    },
    enabled: !!employeeId,
    refetchInterval: 10000
  });

  const unreadNotifications = useMemo(() => {
    return notifications.filter(n => !n.leida);
  }, [notifications]);

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds) => {
      await markNotificationsAsRead(notificationIds);
    },
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

  const handleNotificationClick = async (notification) => {
    if (!notification.leida) {
      await markAsReadMutation.mutateAsync([notification.id]);
    }
    
    if (notification.accion_url) {
      navigate(notification.accion_url);
    }
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = unreadNotifications.map(n => n.id);
    if (unreadIds.length > 0) {
      markAsReadMutation.mutate(unreadIds);
      toast.success("Todas las notificaciones marcadas como leídas");
    }
  };

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'mensaje': return <MessageSquare className="w-4 h-4" />;
      case 'calendario': return <Calendar className="w-4 h-4" />;
      case 'documento': return <FileText className="w-4 h-4" />;
      case 'ausencia': return <Clock className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case 'urgente': return 'bg-red-600';
      case 'alta': return 'bg-orange-600';
      case 'media': return 'bg-blue-600';
      default: return 'bg-slate-600';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Cargando notificaciones...</div>;
  }

  return (
    <Card className={mobile ? "border-0 shadow-none" : ""}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Notificaciones
            {unreadNotifications.length > 0 && (
              <Badge className="bg-red-600">{unreadNotifications.length}</Badge>
            )}
          </CardTitle>
          {unreadNotifications.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Marcar todas leídas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={mobile ? "p-0" : "p-0"}>
        <ScrollArea className={mobile ? "h-[calc(100vh-12rem)]" : "h-96"}>
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                    !notif.leida ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full ${getPriorityColor(notif.prioridad)} flex items-center justify-center text-white flex-shrink-0`}>
                      {getIcon(notif.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm font-semibold ${!notif.leida ? 'font-bold' : ''}`}>
                          {notif.titulo}
                        </h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notif.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{notif.mensaje}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500">
                          {format(new Date(notif.created_date), "dd/MM HH:mm", { locale: es })}
                        </p>
                        {!notif.leida && (
                          <Badge variant="outline" className="text-xs">Nueva</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}