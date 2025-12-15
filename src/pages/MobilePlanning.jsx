import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MobilePlanningPage() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  
  const { data: myShifts = [] } = useQuery({
    queryKey: ['myShifts', currentUser?.email],
    queryFn: async () => {
      const employee = (await base44.entities.EmployeeMasterDatabase.list()).find(e => e.email === currentUser?.email);
      if (!employee) return [];
      return base44.entities.ShiftAssignment.filter({ employee_id: employee.id }, '-fecha', 20);
    },
    enabled: !!currentUser
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Calendar className="w-6 h-6 text-blue-600" />
        Mi Planning
      </h1>
      
      <div className="space-y-3">
        {myShifts.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No tienes turnos asignados próximamente.</p>
        ) : (
          myShifts.map(shift => (
            <Card key={shift.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 capitalize">
                    {format(new Date(shift.fecha), 'EEEE d MMMM', { locale: es })}
                  </p>
                  <p className="text-sm text-slate-600">{shift.turno}</p>
                </div>
                <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  {shift.hora_inicio} - {shift.hora_fin}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}