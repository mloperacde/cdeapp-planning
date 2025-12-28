import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LockerDataCleanup() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to={createPageUrl("LockerManagement")}>
          <Button variant="outline">Volver a Gestión de Taquillas</Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-red-600" />
            Limpieza de Datos de Taquillas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-4">
            Utilidad para limpiar y corregir datos inconsistentes en el registro de taquillas.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-yellow-800 mb-4">
            <p>Esta herramienta está en mantenimiento. Por favor contacte con soporte si necesita realizar una limpieza masiva.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}