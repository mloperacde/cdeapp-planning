import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Settings, Check } from "lucide-react";
import { toast } from "sonner";
import NotificationPreferencesDialog from "../components/notifications/NotificationPreferencesDialog";
import NotificationHistoryPanel from "../components/notifications/NotificationHistoryPanel";

export default function NotificationsPage() {
  const [showPreferences, setShowPreferences] = useState(false);
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const currentEmployee = employees.find(e => e?.email === user?.email);

  const { data: notifications = [] } = useQuery({
    queryKey: ['pushNotifications', currentEmployee?.id],
    queryFn: () => currentEmployee 
      ? base44.entities.PushNotification.filter({ destinatario_id: currentEmployee.id }, '-created_date')
      : Promise.resolve([]),
    initialData: [],
    enabled: !!currentEmployee,
    refetchInterval: 5000,
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n?.leida);
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
    if (filter === "unread") return !n?.leida;
    return n?.tipo === filter;
  });

  const unreadCount = notifications.filter(n => !n?.leida).length;

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
            <NotificationHistoryPanel 
              notifications={filteredNotifications} 
              showActions={true}
            />
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