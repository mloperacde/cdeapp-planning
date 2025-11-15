
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, KeyRound, Calendar } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LongAbsenceAlert({ employees, absences }) {
  const { data: lockerAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    initialData: [],
  });

  const longAbsences = useMemo(() => {
    const today = new Date();
    
    return absences.filter(abs => {
      if (!abs.fecha_inicio) return false;
      
      try {
        const start = new Date(abs.fecha_inicio);
        if (isNaN(start.getTime())) return false;
        
        const end = abs.fecha_fin_desconocida ? today : (abs.fecha_fin ? new Date(abs.fecha_fin) : today);
        if (isNaN(end.getTime())) return false;
        
        const days = differenceInDays(today, start);
        
        const isActive = today >= start && today <= end;
        return isActive && days > 30;
      } catch {
        return false;
      }
    }).map(abs => {
      const employee = employees.find(e => e.id === abs.employee_id);
      const locker = lockerAssignments.find(la => la.employee_id === abs.employee_id);
      const hasLocker = locker?.numero_taquilla_actual?.replace(/['"]/g, '').trim();
      
      let days = 0;
      try {
        const startDate = new Date(abs.fecha_inicio);
        if (!isNaN(startDate.getTime())) {
          days = differenceInDays(new Date(), startDate);
        }
      } catch {
        days = 0;
      }
      
      return {
        absence: abs,
        employee,
        locker,
        hasLocker,
        daysAbsent: days
      };
    }).sort((a, b) => b.daysAbsent - a.daysAbsent);
  }, [absences, employees, lockerAssignments]);

  if (longAbsences.length === 0) return null;

  return (
    <Card className="bg-amber-50 border-2 border-amber-300">
      <CardHeader className="border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <AlertTriangle className="w-5 h-5" />
          Ausencias Prolongadas - Revisar Taquillas ({longAbsences.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <p className="text-sm text-amber-800 mb-4">
          Los siguientes empleados llevan más de 30 días ausentes. Considera reasignar su taquilla temporalmente.
        </p>
        <div className="space-y-3">
          {longAbsences.map(({ absence, employee, locker, hasLocker, daysAbsent }) => (
            <div key={absence.id} className="bg-white border-2 border-amber-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{employee?.nombre || "Desconocido"}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {employee?.departamento} - {employee?.puesto}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-red-600">{daysAbsent} días ausente</Badge>
                    <Badge variant="outline">{absence.tipo}</Badge>
                    {hasLocker && (
                      <Badge className="bg-orange-100 text-orange-800">
                        <KeyRound className="w-3 h-3 mr-1" />
                        {locker.vestuario} - {hasLocker}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Desde: {format(new Date(absence.fecha_inicio), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
                {hasLocker && (
                  <Link to={createPageUrl("LockerManagement")}>
                    <Button size="sm" variant="outline">
                      Gestionar Taquilla
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
