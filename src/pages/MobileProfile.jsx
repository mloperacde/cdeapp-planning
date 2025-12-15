import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function MobileProfile() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Mi Perfil
        </h1>
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="ghost" size="sm">Volver</Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold">
            {user?.full_name?.charAt(0) || "U"}
          </div>
          <div>
            <CardTitle>{user?.full_name || "Usuario"}</CardTitle>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mt-4">
            <Link to={createPageUrl("MobileNotifications")}>
              <Button variant="outline" className="w-full justify-start">
                Configurar Notificaciones
              </Button>
            </Link>
            <Button variant="destructive" className="w-full" onClick={() => base44.auth.logout()}>
              Cerrar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}