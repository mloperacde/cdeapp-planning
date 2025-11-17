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
    <Card className="bg-amber-50 border-2 border-amber-300 h-full">
      <CardHeader className="border-b border-amber-200 pb-2">
        <CardTitle className="flex items-center gap-2 text-amber-900 text-sm">
          <AlertTriangle className="w-4 h-4" />
          Ausencias Prolongadas ({longAbsences.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-xs text-amber-800 mb-3">
          Más de 30 días ausentes. Considera reasignar taquilla.
        </p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {longAbsences.slice(0, 3).map(({ absence, employee, locker, hasLocker, daysAbsent }) => (
            <div key={absence.id} className="bg-white border border-amber-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 truncate">{employee?.nombre || "Desconocido"}</div>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Badge className="bg-red-600 text-white text-xs">{daysAbsent}d</Badge>
                    {hasLocker && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        <KeyRound className="w-3 h-3 mr-1" />
                        {hasLocker}
                      </Badge>
                    )}
                  </div>
                </div>
                {hasLocker && (
                  <Link to={createPageUrl("LockerManagement")}>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                      Gestionar
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
        {longAbsences.length > 3 && (
          <Link to={createPageUrl("AbsenceManagement")}>
            <Button size="sm" variant="outline" className="w-full mt-2 text-xs">
              Ver {longAbsences.length - 3} más
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}