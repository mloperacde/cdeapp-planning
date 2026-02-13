import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  DollarSign, 
  FileText, 
  AlertTriangle, 
  Settings,
  CalendarX,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { markNotificationsAsRead } from "./NotificationService";
import { Link } from "react-router-dom";

export default function NotificationCenter({ currentEmployee }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['hrNotifications', currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      const allNotifications = await base44.entities.PushNotification.filter({
        destinatario_id: currentEmployee.id
      }, '-created_date', 100);
      
      return allNotifications.filter(n => 
        ['salario', 'nomina', 'alerta', 'sistema', 'ausencia'].includes(n.tipo)
      );
    },
    enabled: !!currentEmployee?.id,
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.PushNotification.update(notificationId, {
        leida: true,
        fecha_leida: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrNotifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.leida);
      await markNotificationsAsRead(unread.map(n => n.id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrNotifications'] });
      toast.success("Todas las notificaciones marcadas como leídas");
    },
  });

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.leida;
    return n.tipo === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.leida).length;

  const getNotificationIcon = (tipo) => {
    switch (tipo) {
      case "salario": return <DollarSign className="w-5 h-5 text-emerald-600" />;
      case "nomina": return <FileText className="w-5 h-5 text-blue-600" />;
      case "alerta": return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case "sistema": return <Settings className="w-5 h-5 text-slate-600" />;
      case "ausencia": return <CalendarX className="w-5 h-5 text-purple-600" />;
      default: return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case "alta": return "bg-red-100 text-red-700 border-red-200";
      case "media": return "bg-amber-100 text-amber-700 border-amber-200";
      case "baja": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.leida) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-slate-500 mt-2">Cargando notificaciones...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Centro de Notificaciones
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar todas como leídas
            </Button>
          )}
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-4">
          <TabsList className="w-full grid grid-cols-6">
            <TabsTrigger value="all" className="text-xs">
              Todas {notifications.length > 0 && `(${notifications.length})`}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              No leídas {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="salario" className="text-xs">
              💰 Salarios
            </TabsTrigger>
            <TabsTrigger value="nomina" className="text-xs">
              📊 Nóminas
            </TabsTrigger>
            <TabsTrigger value="alerta" className="text-xs">
              ⚠️ Alertas
            </TabsTrigger>
            <TabsTrigger value="ausencia" className="text-xs">
              📅 Ausencias
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`hover:shadow-md transition-all cursor-pointer ${
                    !notification.leida ? 'border-l-4 border-l-blue-600 bg-blue-50/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-semibold text-sm">
                            {notification.titulo}
                          </h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ml-2 ${getPriorityColor(notification.prioridad)}`}
                          >
                            {notification.prioridad}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {notification.mensaje}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(notification.created_date), { 
                              addSuffix: true,
                              locale: es 
                            })}
                          </div>
                          {notification.accion_url && (
                            <Link to={notification.accion_url}>
                              <Button variant="ghost" size="sm" className="h-7">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Ver más
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                      {!notification.leida && (
                        <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </Tabs>
    </Card>
  );
}