import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Sunrise, Sunset, Plus, Save } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

export default function ShiftAssignmentsPage() {
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: assignments } = useQuery({
    queryKey: ['shiftAssignments', format(selectedWeek, 'yyyy-MM-dd')],
    queryFn: () => base44.entities.ShiftAssignment.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftAssignments'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftAssignment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftAssignments'] });
    },
  });

  const rotativeEmployees = employees.filter(emp => emp.tipo_turno === "Rotativo");
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeek, i));

  const getAssignment = (employeeId, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return assignments.find(a => a.employee_id === employeeId && a.fecha === dateStr);
  };

  const handleShiftChange = async (employeeId, date, turno) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const existing = getAssignment(employeeId, date);

    if (existing) {
      updateMutation.mutate({ id: existing.id, data: { turno } });
    } else {
      saveMutation.mutate({ employee_id: employeeId, fecha: dateStr, turno });
    }
  };

  const handleQuickAssign = (pattern) => {
    rotativeEmployees.forEach((emp, empIndex) => {
      weekDays.forEach((day, dayIndex) => {
        let turno = "Mañana";
        if (pattern === "alternate") {
          turno = (empIndex + dayIndex) % 2 === 0 ? "Mañana" : "Tarde";
        } else if (pattern === "weekly") {
          turno = empIndex % 2 === 0 ? "Mañana" : "Tarde";
        }
        handleShiftChange(emp.id, day, turno);
      });
    });
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              Asignación de Turnos
            </h1>
            <p className="text-slate-600 mt-1">
              Configura los turnos semanales para empleados rotativos
            </p>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="border-b border-slate-100">
            <div className="flex justify-between items-center">
              <CardTitle>Semana del {format(selectedWeek, "d 'de' MMMM", { locale: es })}</CardTitle>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={format(selectedWeek, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedWeek(startOfWeek(new Date(e.target.value), { weekStartsOn: 1 }))}
                  className="w-48"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAssign('alternate')}
                >
                  Asignar Alternado
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAssign('weekly')}
                >
                  Asignar Semanal
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {rotativeEmployees.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No hay empleados con turno rotativo
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Empleado
                      </th>
                      {weekDays.map((day, i) => (
                        <th key={i} className="text-center py-3 px-2 font-semibold text-slate-700">
                          <div className="text-xs">{format(day, "EEE", { locale: es })}</div>
                          <div className="text-sm">{format(day, "d MMM", { locale: es })}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rotativeEmployees.map((employee) => (
                      <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{employee.nombre}</div>
                          <div className="text-xs text-slate-500">{employee.equipo}</div>
                        </td>
                        {weekDays.map((day, i) => {
                          const assignment = getAssignment(employee.id, day);
                          const turno = assignment?.turno || "Mañana";
                          return (
                            <td key={i} className="py-2 px-2 text-center">
                              <Select
                                value={turno}
                                onValueChange={(value) => handleShiftChange(employee.id, day, value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Mañana">
                                    <div className="flex items-center gap-2">
                                      <Sunrise className="w-4 h-4 text-amber-600" />
                                      Mañana
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="Tarde">
                                    <div className="flex items-center gap-2">
                                      <Sunset className="w-4 h-4 text-indigo-600" />
                                      Tarde
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}