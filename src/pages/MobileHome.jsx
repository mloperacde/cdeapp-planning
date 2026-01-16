import React, { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Calendar, 
  User, 
  Bell, 
  MessageSquare, 
  ClipboardList,
  LogOut,
  Settings,
  Lock
} from "lucide-react";


export default function MobileHome() {


  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['unreadNotifications', user?.email],
    queryFn: () => base44.entities.PushNotification.filter({ 
      user_email: user.email, 
      leida: false 
    }),
    enabled: !!user?.email,
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['myPendingAbsences', user?.email],
    queryFn: () => base44.entities.Absence.filter({ 
      solicitado_por: user.email,
      estado_aprobacion: 'Pendiente'
    }),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      const host = window.location.hostname;
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      if (!isLocal) {
        base44.auth.redirectToLogin(window.location.pathname);
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  const allMenuItems = [
    {
      title: "Mis Ausencias",
      description: "Solicitar y gestionar ausencias",
      icon: Calendar,
      color: "from-blue-500 to-blue-600",
      link: createPageUrl("MobileAbsences"),
      moduleKey: "absences",
      badge: absences.length > 0 ? absences.length : null,
      badgeColor: "bg-blue-600"
    },
    {
      title: "Mi Planificación",
      description: "Ver mi horario y turnos",
      icon: ClipboardList,
      color: "from-purple-500 to-purple-600",
      link: createPageUrl("MobilePlanning"),
      moduleKey: "daily_planning"
    },
    {
      title: "Notificaciones",
      description: "Ver mis notificaciones",
      icon: Bell,
      color: "from-orange-500 to-orange-600",
      link: createPageUrl("MobileNotifications"),
      moduleKey: "notifications",
      badge: notifications.length > 0 ? notifications.length : null,
      badgeColor: "bg-orange-600"
    },
    {
      title: "Mensajes",
      description: "Chat con el equipo",
      icon: MessageSquare,
      color: "from-green-500 to-green-600",
      link: createPageUrl("MobileChat"),
      moduleKey: "messaging"
    },
    {
      title: "Mi Perfil",
      description: "Configuración y datos",
      icon: User,
      color: "from-indigo-500 to-indigo-600",
      link: createPageUrl("MobileProfile"),
      moduleKey: null // Always accessible
    }
  ];

  const menuItems = allMenuItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ¡Hola, {user.full_name?.split(' ')[0] || 'Usuario'}!
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{user.email}</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {user.full_name?.charAt(0) || "U"}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item) => (
            <Link key={item.title} to={item.link}>
              <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg relative`}>
                      <item.icon className="w-6 h-6" />
                      {item.badge && (
                        <Badge className={`absolute -top-2 -right-2 ${item.badgeColor} text-white text-xs px-2 py-0.5`}>
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>



        {/* Quick Actions */}
        <div className="mt-6 space-y-2">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" className="w-full">
              Ver Versión Escritorio
            </Button>
          </Link>
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 mt-8 pb-4">
          CdeApp Planning © 2025
        </div>
      </div>
    </div>
  );
}
