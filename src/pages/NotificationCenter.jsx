import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare, Smartphone, Check, Trash2, Settings as SettingsIcon, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import NotificationTemplateManager from "../components/notifications/NotificationTemplateManager";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NotificationCenter() {
  const [activeTab, setActiveTab] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employee } = useQuery({
    queryKey: ['currentEmployee', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const employees = await base44.entities.Employee.filter({ email: user.email });
      return employees[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['pushNotifications', employee?.id],
    queryFn: async () => {
      if (!employee?.id) return [];
      return await base44.entities.PushNotification.filter(
        { employee_id: employee.id },
        '-created_date',
        100
      );
    },
    initialData: [],
    enabled: !!employee?.id,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.PushNotification.update(id, { leida: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushNotifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PushNotification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushNotifications'] });
      toast.success('Notificación eliminada');
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.leida);
      for (const notif of unread) {
        await base44.entities.PushNotification.update(notif.id, { leida: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushNotifications'] });
      toast.success('Todas las notificaciones marcadas como leídas');
    },
  });

  const filteredNotifications = notifications.filter(n => {
    // Tab filter
    let tabMatch = true;
    if (activeTab === 'unread') tabMatch = !n.leida;
    else if (activeTab === 'absence') tabMatch = n.tipo?.toLowerCase().includes('ausencia');
    else if (activeTab === 'sync') tabMatch = n.tipo?.toLowerCase().includes('sincronización');
    
    // Priority filter
    const priorityMatch = priorityFilter === 'all' || n.prioridad === priorityFilter;
    
    return tabMatch && priorityMatch;
  });

  const unreadCount = notifications.filter(n => !n.leida).length;

  const getTypeIcon = (tipo) => {
    if (tipo?.toLowerCase().includes('email')) return <Mail className="w-4 h-4" />;
    if (tipo?.toLowerCase().includes('sms')) return <Smartphone className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />;
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-600" />
              Centro de Notificaciones
              {unreadCount > 0 && (
                <Badge className="bg-red-600">{unreadCount}</Badge>
              )}
            </h1>
            <p className="text-slate-600 mt-1">
              Gestiona tus notificaciones y configura plantillas
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("NotificationSettings")}>
              <Button variant="outline">
                <SettingsIcon className="w-4 h-4 mr-2" />
                Preferencias
              </Button>
            </Link>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="w-4 h-4 mr-2" />
                Marcar todas como leídas
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <Label className="text-sm">Prioridad:</Label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Crítica">Crítica</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              Todas ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              No Leídas ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="absence">
              Ausencias
            </TabsTrigger>
            <TabsTrigger value="sync">
              Sincronización
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-slate-500">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg">No hay notificaciones</p>
                  <p className="text-sm mt-2">Las notificaciones aparecerán aquí cuando se generen</p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notif) => (
                <Card 
                  key={notif.id} 
                  className={`shadow-md transition-all hover:shadow-lg ${
                    !notif.leida ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'bg-white'
                  } ${
                    notif.prioridad === 'Crítica' ? 'border-red-500 border-2' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getTypeIcon(notif.tipo)}
                          <Badge variant="outline" className="text-xs">
                            {notif.tipo}
                          </Badge>
                          <Badge className={`text-xs ${
                            notif.prioridad === 'Crítica' ? 'bg-red-600' :
                            notif.prioridad === 'Alta' ? 'bg-orange-600' :
                            notif.prioridad === 'Media' ? 'bg-blue-600' :
                            'bg-slate-600'
                          }`}>
                            {notif.prioridad}
                          </Badge>
                          {!notif.leida && (
                            <Badge className="bg-green-600 text-xs">Nueva</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1">{notif.titulo}</h3>
                        <p className="text-sm text-slate-600">{notif.mensaje}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {(() => {
                            try {
                              if (!notif.created_date) return '';
                              const date = new Date(notif.created_date);
                              if (isNaN(date.getTime())) return '';
                              return format(date, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
                            } catch {
                              return '';
                            }
                          })()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!notif.leida && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markAsReadMutation.mutate(notif.id)}
                            title="Marcar como leída"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('¿Eliminar esta notificación?')) {
                              deleteMutation.mutate(notif.id);
                            }
                          }}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <NotificationTemplateManager />
        </div>
      </div>
    </div>
  );
}