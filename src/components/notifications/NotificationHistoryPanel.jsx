import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Trash2, MessageSquare, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function NotificationHistoryPanel({ notifications = [], showActions = true }) {
  const [expandedId, setExpandedId] = useState(null);
  const queryClient = useQueryClient();

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.PushNotification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushNotifications'] });
      toast.success("Notificación eliminada");
    }
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

  const getNotificationColorClass = (tipo) => {
    switch (tipo) {
      case "mensaje": return "bg-blue-100 text-blue-600";
      case "planificacion": return "bg-purple-100 text-purple-600";
      case "ausencia": return "bg-orange-100 text-orange-600";
      case "documento": return "bg-green-100 text-green-600";
      case "formacion": return "bg-indigo-100 text-indigo-600";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const getPriorityBadge = (prioridad) => {
    switch (prioridad) {
      case "urgente":
        return <Badge className="bg-red-600 text-white">Urgente</Badge>;
      case "alta":
        return <Badge className="bg-orange-600 text-white">Alta</Badge>;
      case "media":
        return <Badge className="bg-blue-600 text-white">Media</Badge>;
      default:
        return <Badge variant="outline">Baja</Badge>;
    }
  };

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay notificaciones</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notif) => {
        const Icon = getNotificationIcon(notif.tipo);
        const colorClass = getNotificationColorClass(notif.tipo);
        const isExpanded = expandedId === notif.id;
        
        return (
          <Card 
            key={notif.id} 
            className={`border-2 transition-all cursor-pointer ${
              notif.leida ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-300 shadow-md'
            }`}
            onClick={() => {
              if (!notif.leida) {
                markAsReadMutation.mutate(notif.id);
              }
              setExpandedId(isExpanded ? null : notif.id);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">{notif.titulo}</h4>
                    <div className="flex items-center gap-2">
                      {!notif.leida && (
                        <Badge className="bg-blue-600 text-white text-xs">Nueva</Badge>
                      )}
                      {getPriorityBadge(notif.prioridad)}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{notif.mensaje}</p>
                  
                  {isExpanded && notif.datos_adicionales && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs">
                      <p className="font-semibold text-slate-700 mb-1">Detalles adicionales:</p>
                      <pre className="text-slate-600 whitespace-pre-wrap">
                        {JSON.stringify(notif.datos_adicionales, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-500">
                      {format(new Date(notif.created_date), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                    {showActions && (
                      <div className="flex gap-2">
                        {notif.leida && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Leída
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notif.id);
                          }}
                          className="hover:text-red-600 h-6 px-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}