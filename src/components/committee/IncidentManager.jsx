import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function IncidentManager({ incidents, employees }) {
  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Desconocido";
  };

  const getGravedadBadge = (gravedad) => {
    const config = {
      "Leve": { className: "bg-green-100 text-green-800", icon: CheckCircle2 },
      "Grave": { className: "bg-amber-100 text-amber-800", icon: AlertTriangle },
      "Muy Grave": { className: "bg-red-100 text-red-800", icon: AlertTriangle },
      "Mortal": { className: "bg-red-600 text-white", icon: XCircle }
    }[gravedad] || { className: "bg-slate-100 text-slate-800", icon: AlertTriangle };

    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {gravedad}
      </Badge>
    );
  };

  const activeIncidents = incidents.filter(i => i.estado_investigacion !== "Cerrada");
  const recentIncidents = incidents.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 font-medium">Activos</p>
                <p className="text-2xl font-bold text-red-900">{activeIncidents.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-medium">Total Registrados</p>
                <p className="text-2xl font-bold text-blue-900">{incidents.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-medium">Accidentes con Baja</p>
                <p className="text-2xl font-bold text-amber-900">
                  {incidents.filter(i => i.dias_baja > 0).length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">Incidentes Recientes</h3>
        {recentIncidents.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No hay incidentes registrados
          </div>
        ) : (
          recentIncidents.map((incident) => (
            <Card key={incident.id} className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={
                        incident.tipo === "Accidente" ? "bg-red-600" :
                        incident.tipo === "Incidente" ? "bg-amber-600" :
                        "bg-yellow-600"
                      }>
                        {incident.tipo}
                      </Badge>
                      {getGravedadBadge(incident.gravedad)}
                    </div>
                    <div className="font-semibold text-slate-900">
                      {getEmployeeName(incident.employee_id)}
                    </div>
                    <div className="text-sm text-slate-600">
                      {incident.departamento} - {incident.lugar}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {format(new Date(incident.fecha_hora), "dd/MM/yyyy", { locale: es })}
                    </div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(incident.fecha_hora), "HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-700 mb-2">{incident.descripcion}</p>

                <div className="flex items-center justify-between text-xs">
                  <Badge variant="outline" className={
                    incident.estado_investigacion === "Completada" ? "border-green-600 text-green-600" :
                    incident.estado_investigacion === "En Curso" ? "border-blue-600 text-blue-600" :
                    incident.estado_investigacion === "Cerrada" ? "border-slate-600 text-slate-600" :
                    "border-amber-600 text-amber-600"
                  }>
                    {incident.estado_investigacion}
                  </Badge>
                  
                  {incident.dias_baja > 0 && (
                    <span className="text-red-600 font-semibold">
                      {incident.dias_baja} días de baja
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}