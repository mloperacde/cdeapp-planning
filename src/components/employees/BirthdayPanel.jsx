
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cake, PartyPopper } from "lucide-react";
import { format, isSameDay, addDays, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";

export default function BirthdayPanel({ employees = [] }) {
  const upcomingBirthdays = useMemo(() => {
    if (!Array.isArray(employees) || employees.length === 0) return [];
    
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
    return employees
      .filter(emp => emp?.fecha_nacimiento)
      .map(emp => {
        const birthDate = new Date(emp.fecha_nacimiento);
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        
        // Si ya pasó este año, usar el del próximo año
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }
        
        const age = today.getFullYear() - birthDate.getFullYear();
        const isToday = isSameDay(thisYearBirthday, today);
        const isThisWeek = thisYearBirthday >= weekStart && thisYearBirthday <= weekEnd;
        
        return {
          ...emp,
          nextBirthday: thisYearBirthday,
          age,
          isToday,
          isThisWeek,
        };
      })
      .filter(emp => emp.isThisWeek)
      .sort((a, b) => a.nextBirthday - b.nextBirthday);
  }, [employees]);

  if (upcomingBirthdays.length === 0) return null;

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-pink-50 to-purple-50">
      <CardHeader className="border-b border-pink-200 pb-3">
        <CardTitle className="flex items-center gap-2 text-pink-900 text-base">
          <Cake className="w-4 h-4" />
          Cumpleaños Esta Semana
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="space-y-2">
          {upcomingBirthdays.map((emp) => (
            <div
              key={emp.id}
              className={`flex items-center justify-between p-2 rounded-lg ${
                emp.isToday 
                  ? 'bg-gradient-to-r from-pink-200 to-purple-200 border-2 border-pink-400' 
                  : 'bg-white border border-pink-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {emp.isToday && <PartyPopper className="w-4 h-4 text-pink-600 animate-bounce" />}
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{emp.nombre}</p>
                  <p className="text-xs text-slate-600">
                    {format(emp.nextBirthday, "d 'de' MMMM", { locale: es })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={`${emp.isToday ? "bg-pink-600" : "bg-purple-600"} text-xs`}>
                  {emp.age} años
                </Badge>
                {emp.isToday && (
                  <p className="text-xs text-pink-700 font-semibold mt-1">¡HOY!</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
