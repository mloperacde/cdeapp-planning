import React from "react";
import TeamManagementConfig from "@/components/config/TeamManagementConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TeamManagementPage() {
  return (
    <div className="container mx-auto py-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/Configuration">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Equipos</h1>
          <p className="text-slate-500 mt-1">
            Configuración de turnos rotativos, composición de equipos y calendarios
          </p>
        </div>
      </div>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Configuración de Equipos y Rotación
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <TeamManagementConfig />
        </CardContent>
      </Card>
    </div>
  );
}
