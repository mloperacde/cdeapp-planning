import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, List, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ShiftManagerEmployees() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Panel de Control - Jefes de Turno
          </h1>
          <p className="text-slate-600 mt-1">
            Gestión y consulta de información del personal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Módulo de Gestión */}
          <Card className="shadow-lg border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="border-b border-blue-200">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Módulo de Gestión
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-700 mb-4">
                Accede al listado completo de empleados con filtros avanzados
              </p>
              <Link to={createPageUrl("ShiftManagerEmployeesList")}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                  <List className="w-5 h-5 mr-2" />
                  Listado de Empleados
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Módulo de Información */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-slate-700" />
                Información Adicional
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600">
                Más funcionalidades disponibles próximamente
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}