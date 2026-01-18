import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, UserX, Calendar, CheckSquare, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AbsenceNotifications({ absences, employees, absenceTypes, masterEmployees = [] }) {
  const pendingAbsences = useMemo(() => {
    return absences
      .filter(a => a.estado_aprobacion === 'Pendiente')
      .map(absence => {
        const employee = employees.find(e => e.id === absence.employee_id) || masterEmployees.find(e => e.id === absence.employee_id);
        const absenceType = absenceTypes?.find(t => t.id === absence.absence_type_id || t.nombre === absence.tipo);
        const startDate = new Date(absence.fecha_inicio);
        const endDate = absence.fecha_fin_desconocida ? null : new Date(absence.fecha_fin);
        const duration = endDate ? differenceInDays(endDate, startDate) + 1 : 'Indefinido';
        
        return {
          id: absence.id,
          employeeName: employee?.nombre || "Empleado desconocido",
          type: absenceType?.nombre || absence.tipo || "Sin especificar",
          dates: `${format(startDate, 'dd/MM/yyyy', { locale: es })} - ${endDate ? format(endDate, 'dd/MM/yyyy', { locale: es }) : 'Indefinido'}`,
          duration: duration === 'Indefinido' ? 'Indefinido' : `${duration} días`,
          reason: absence.motivo || "Sin motivo especificado",
          requestedBy: absence.solicitado_por || "Usuario",
          isCritical: absenceType?.es_critica || false
        };
      })
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }, [absences, employees, masterEmployees, absenceTypes]);

  const count = pendingAbsences.length;

  if (count === 0) {
    return (
      <Card className="shadow-lg border-green-200 bg-green-50/50 h-full">
        <CardHeader className="border-b border-green-100 pb-2">
          <CardTitle className="flex items-center gap-2 text-green-900 text-sm">
            <CheckSquare className="w-4 h-4" />
            Bandeja de Consolidación
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex flex-col items-center justify-center text-center h-[200px]">
          <CheckSquare className="w-12 h-12 text-green-300 mb-2" />
          <p className="text-sm font-medium text-green-800">Todo al día</p>
          <p className="text-xs text-green-600">No hay ausencias pendientes de consolidar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-orange-200 bg-orange-50/40 h-full flex flex-col">
      <CardHeader className="border-b border-orange-200 bg-orange-100/50 pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-orange-900 text-base">
            <Bell className="w-5 h-5 animate-pulse text-orange-600" />
            Notificaciones de Ausencias
          </CardTitle>
          <Badge className="bg-orange-600 text-white hover:bg-orange-700">
            {count} pendientes
          </Badge>
        </div>
        <p className="text-xs text-orange-700 mt-1">
          Ausencias notificadas por usuarios pendientes de aprobar y consolidar
        </p>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {pendingAbsences.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg border border-orange-200 bg-white shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-sm text-slate-900 truncate pr-2">
                  {item.employeeName}
                </p>
                {item.isCritical && (
                  <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-[10px] px-1 py-0 h-5">
                    Crítica
                  </Badge>
                )}
              </div>
              
              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-orange-800 bg-orange-100 px-1.5 rounded">
                    {item.type}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{item.dates} ({item.duration})</span>
                </div>
                {item.reason && (
                  <p className="text-slate-500 italic truncate pl-4 border-l-2 border-slate-200 mt-1">
                    "{item.reason}"
                  </p>
                )}
                <div className="text-xs text-slate-400 mt-1 pt-1 border-t border-slate-100 flex justify-between items-center">
                   <span>Solicitado por: <span className="font-medium text-slate-600">{item.requestedBy}</span></span>
                </div>
              </div>
            </div>
          ))}
          
          {count > 5 && (
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                +{count - 5} ausencias más pendientes...
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-orange-200 bg-orange-50/50 mt-auto">
          <Link to={`${createPageUrl("AbsenceManagement")}?tab=approval`}>
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-sm">
              <CheckSquare className="w-4 h-4 mr-2" />
              Ir a Bandeja de Consolidación
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}