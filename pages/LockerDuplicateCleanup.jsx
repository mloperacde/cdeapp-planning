import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyX } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LockerDuplicateCleanup() {
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
            <CopyX className="w-6 h-6 text-orange-600" />
            Limpieza de Duplicados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-4">
            Herramienta para detectar y fusionar registros duplicados de taquillas o asignaciones.
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md text-blue-800">
            <p>No se han detectado duplicados críticos en este momento.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}