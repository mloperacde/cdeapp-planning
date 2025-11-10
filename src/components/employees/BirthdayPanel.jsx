import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cake, PartyPopper } from "lucide-react";
import { format, isSameDay, addDays } from "date-fns";
import { es } from "date-fns/locale";

export default function BirthdayPanel({ employees }) {
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const next30Days = addDays(today, 30);
    
    return employees
      .filter(emp => emp.fecha_nacimiento)
      .map(emp => {
        const birthDate = new Date(emp.fecha_nacimiento);
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        
        // Si ya pasó este año, usar el del próximo año
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }
        
        const age = today.getFullYear() - birthDate.getFullYear();
        const isToday = isSameDay(thisYearBirthday, today);
        const isUpcoming = thisYearBirthday <= next30Days;
        
        return {
          ...emp,
          nextBirthday: thisYearBirthday,
          age,
          isToday,
          isUpcoming,
        };
      })
      .filter(emp => emp.isUpcoming)
      .sort((a, b) => a.nextBirthday - b.nextBirthday);
  }, [employees]);

  if (upcomingBirthdays.length === 0) return null;

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-pink-50 to-purple-50">
      <CardHeader className="border-b border-pink-200">
        <CardTitle className="flex items-center gap-2 text-pink-900">
          <Cake className="w-5 h-5" />
          Próximos Cumpleaños (30 días)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2">
          {upcomingBirthdays.map((emp) => (
            <div
              key={emp.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                emp.isToday 
                  ? 'bg-gradient-to-r from-pink-200 to-purple-200 border-2 border-pink-400' 
                  : 'bg-white border border-pink-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {emp.isToday && <PartyPopper className="w-5 h-5 text-pink-600 animate-bounce" />}
                <div>
                  <p className="font-semibold text-slate-900">{emp.nombre}</p>
                  <p className="text-sm text-slate-600">
                    {format(emp.nextBirthday, "d 'de' MMMM", { locale: es })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={emp.isToday ? "bg-pink-600" : "bg-purple-600"}>
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