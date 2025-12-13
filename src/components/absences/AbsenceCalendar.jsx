import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export default function AbsenceCalendar({ absences, employees, masterEmployees = [], absenceTypes, selectedDepartment = "all" }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState("all");

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const [filterDept, setFilterDept] = useState(selectedDepartment);

  const getAbsencesForDay = (day) => {
    return absences.filter(abs => {
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? new Date() : new Date(abs.fecha_fin);
      const isInRange = day >= start && day <= end;
      
      if (!isInRange) return false;
      
      const employee = employees.find(e => e.id === abs.employee_id) || masterEmployees.find(e => e.id === abs.employee_id);
      const matchesDept = filterDept === "all" || employee?.departamento === filterDept;
      const matchesType = selectedType === "all" || abs.absence_type_id === selectedType;
      
      return matchesDept && matchesType && abs.estado_aprobacion === "Aprobada";
    });
  };

  const getTypeColor = (absenceTypeId) => {
    const type = absenceTypes.find(t => t.id === absenceTypeId);
    return type?.color || "#3B82F6";
  };

  return (
    <Card className="shadow-xl">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Calendario de Ausencias - {format(currentDate, "MMMM yyyy", { locale: es })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex gap-4 mb-4 flex-wrap">
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Departamentos</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Tipos</SelectItem>
              {absenceTypes.map(type => (
                <SelectItem key={type.id} value={type.id}>{type.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-600 p-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: getDay(monthDays[0]) === 0 ? 6 : getDay(monthDays[0]) - 1 }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {monthDays.map(day => {
            const absencesForDay = getAbsencesForDay(day);
            const isToday = isSameDay(day, new Date());
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;

            return (
              <div
                key={day.toString()}
                className={`aspect-square border rounded-lg p-2 ${
                  isToday ? 'ring-2 ring-blue-500' :
                  isWeekend ? 'bg-slate-50' :
                  'bg-white'
                } hover:shadow-md transition-shadow relative overflow-hidden`}
              >
                <div className={`text-sm font-semibold mb-1 ${
                  isToday ? 'text-blue-600' :
                  isWeekend ? 'text-slate-400' :
                  'text-slate-700'
                }`}>
                  {format(day, 'd')}
                </div>
                
                {absencesForDay.length > 0 && (
                  <div className="space-y-1">
                    {absencesForDay.slice(0, 2).map((abs, idx) => {
                      const employee = employees.find(e => e.id === abs.employee_id) || masterEmployees.find(e => e.id === abs.employee_id);
                      const typeColor = getTypeColor(abs.absence_type_id);
                      return (
                        <div
                          key={abs.id}
                          className="text-[10px] px-1 py-0.5 rounded truncate font-medium"
                          style={{ backgroundColor: typeColor, color: '#fff', textShadow: '0px 0px 2px rgba(0,0,0,0.5)' }}
                          title={`${employee?.nombre} - ${abs.tipo}`}
                        >
                          {employee?.nombre?.split(' ')[0] || "Desc."}
                        </div>
                      );
                    })}
                    {absencesForDay.length > 2 && (
                      <div className="text-[10px] text-slate-500 font-semibold">
                        +{absencesForDay.length - 2}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Leyenda:</h4>
          <div className="flex flex-wrap gap-2">
            {absenceTypes.map(type => (
              <Badge key={type.id} style={{ backgroundColor: type.color, color: 'white' }}>
                {type.nombre}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}