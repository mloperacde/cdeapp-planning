import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function EmployeePlanningPage() {
  const { data: shifts = [] } = useQuery({
    queryKey: ['myShifts'],
    queryFn: () => base44.entities.ShiftAssignment.list(), // Should filter by my ID in real app
    initialData: []
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-600 p-4 text-white">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Mi Planning
        </h1>
      </div>
      <div className="p-4 space-y-4">
        {shifts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              No tienes turnos asignados próximos.
            </CardContent>
          </Card>
        ) : (
          shifts.map(shift => (
            <Card key={shift.id} className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 capitalize">
                    {format(new Date(shift.fecha), "EEEE d MMMM", { locale: es })}
                  </p>
                  <p className="text-sm text-slate-600">{shift.turno}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-blue-600">
                    <Clock className="w-4 h-4" />
                    {shift.hora_inicio} - {shift.hora_fin}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}