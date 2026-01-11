import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Check, Trash2, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { useAppData } from "../data/DataProvider";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Usar datos compartidos del provider
  const { user, currentEmployee: employee } = useAppData();

  const { data: notifications = [] } = useQuery({
    queryKey: ['pushNotifications', employee?.id],
    queryFn: async () => {
      if (!employee?.id) return [];
      return await base44.entities.PushNotification.filter(
        { employee_id: employee.id },
        '-created_date',
        50
      );
    },
    enabled: !!employee?.id,
    staleTime: 2 * 60 * 1000, // Cache 2 minutos
    refetchInterval: false, // Desactivar polling automático
    refetchOnWindowFocus: true, // Solo refetch al volver a la ventana
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.PushNotification.update(id, { 
      leida: true,
      fecha_lectura: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushNotifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PushNotification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushNotifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.leida).length;
  const recentNotifications = notifications.slice(0, 5);

  // Show toast for new notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const newest = notifications[0];
      if (!newest.leida && newest.prioridad === 'Crítica') {
        const isRecent = new Date() - new Date(newest.created_date) < 10000; // Within 10 seconds
        if (isRecent) {
          toast.error(newest.titulo, { description: newest.mensaje });
        }
      }
    }
  }, [notifications]);

  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case 'Crítica': return 'bg-red-600';
      case 'Alta': return 'bg-orange-600';
      case 'Media': return 'bg-blue-600';
      default: return 'bg-slate-600';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Notificaciones</h3>
          <div className="flex gap-2">
            <Link to={createPageUrl("NotificationSettings")}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <ScrollArea className="h-96">
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay notificaciones</p>
            </div>
          ) : (
            <div className="p-2">
              {recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-lg mb-2 border ${
                    !notif.leida ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs ${getPriorityColor(notif.prioridad)}`}>
                          {notif.tipo}
                        </Badge>
                        {!notif.leida && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                      </div>
                      <h4 className="font-semibold text-sm text-slate-900 truncate">
                        {notif.titulo}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                        {notif.mensaje}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(notif.created_date), "HH:mm, d MMM", { locale: es })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!notif.leida && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => markAsReadMutation.mutate(notif.id)}
                        >
                          <Check className="w-3 h-3 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteMutation.mutate(notif.id)}
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 5 && (
          <div className="p-3 border-t">
            <Link to={createPageUrl("NotificationCenter")}>
              <Button variant="outline" className="w-full" size="sm" onClick={() => setOpen(false)}>
                Ver todas las notificaciones
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}