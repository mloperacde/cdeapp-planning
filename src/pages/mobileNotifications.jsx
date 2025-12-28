import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Bell, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ErrorBoundary from "@/components/common/ErrorBoundary";

export default function MobileNotifications() {
  return (
    <ErrorBoundary>
      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Notificaciones
          </h1>
          <Link to={createPageUrl("Mobile")}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver
            </Button>
          </Link>
        </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferencias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ausencias</Label>
              <p className="text-xs text-slate-500">Estado de mis solicitudes</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Turnos</Label>
              <p className="text-xs text-slate-500">Cambios en mi planning</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Chat</Label>
              <p className="text-xs text-slate-500">Nuevos mensajes</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
      </div>
    </ErrorBoundary>
  );
}