import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function NotificationBadge({ currentEmployee }) {
  const { data: notifications = [] } = useQuery({
    queryKey: ['headerNotifications', currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      const allNotifications = await base44.entities.PushNotification.filter({
        destinatario_id: currentEmployee.id,
        leida: false
      }, '-created_date', 10);
      
      return allNotifications.filter(n => 
        ['salario', 'nomina', 'alerta', 'sistema', 'ausencia'].includes(n.tipo)
      );
    },
    enabled: !!currentEmployee?.id,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Notificaciones</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} nuevas</Badge>
            )}
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No hay notificaciones nuevas</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  to={notification.accion_url || '/Dashboard'}
                  className="block"
                >
                  <div className="p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border">
                    <p className="text-sm font-medium mb-1">
                      {notification.titulo}
                    </p>
                    <p className="text-xs text-slate-600 mb-2">
                      {notification.mensaje}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(notification.created_date), { 
                        addSuffix: true,
                        locale: es 
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
        {unreadCount > 0 && (
          <div className="border-t p-2">
            <Link to="/Dashboard?notifications=true">
              <Button variant="ghost" className="w-full text-sm">
                Ver todas las notificaciones
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}