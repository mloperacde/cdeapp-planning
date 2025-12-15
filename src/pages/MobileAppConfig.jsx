import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Smartphone, Check } from "lucide-react";

export default function MobileAppConfig() {
  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-blue-600" />
          Configuración App Móvil
        </h1>
        <Link to={createPageUrl("Configuration")}>
          <Button variant="ghost">Volver</Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Estado del Servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
            <Check className="w-5 h-5" />
            <span className="font-medium">App Móvil Activa</span>
          </div>
          <p className="text-sm text-slate-500 mt-4">
            La versión móvil está disponible para todos los empleados. Pueden acceder a través de la URL de la aplicación en sus dispositivos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}