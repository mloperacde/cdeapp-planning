import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ArrowLeft } from "lucide-react";

export default function ShiftManagersDashboardPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("ShiftManagers")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Jefes de Turno
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-blue-600" />
            Panel de Control - Jefes de Turno
          </h1>
          <p className="text-slate-600 mt-1">
            Vista general de equipos, turnos y estadísticas
          </p>
        </div>

        <Card className="bg-blue-50 border-2 border-blue-300">
          <CardContent className="p-8 text-center">
            <LayoutDashboard className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              Panel de Control en Desarrollo
            </h2>
            <p className="text-blue-800">
              Este módulo mostrará estadísticas y resumen de equipos, turnos y asignaciones.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}