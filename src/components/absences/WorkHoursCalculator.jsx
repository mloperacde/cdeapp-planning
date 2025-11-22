import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Briefcase, TrendingUp } from "lucide-react";
import { isWithinInterval, eachDayOfInterval, getDay, startOfYear, endOfYear } from "date-fns";

export default function WorkHoursCalculator({ holidays = [], vacations = [] }) {
  const currentYear = new Date().getFullYear();
  
  const calculations = useMemo(() => {
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 11, 31));
    const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });
    
    // Contar días festivos
    const holidayDates = holidays
      .filter(h => new Date(h.date).getFullYear() === currentYear)
      .map(h => new Date(h.date).toDateString());
    
    // Contar días de vacaciones
    const vacationDays = new Set();
    vacations.forEach(vac => {
      try {
        const start = new Date(vac.start_date);
        const end = new Date(vac.end_date);
        
        if (start.getFullYear() <= currentYear && end.getFullYear() >= currentYear) {
          const vacStart = start.getFullYear() < currentYear ? yearStart : start;
          const vacEnd = end.getFullYear() > currentYear ? yearEnd : end;
          
          const vacDays = eachDayOfInterval({ start: vacStart, end: vacEnd });
          vacDays.forEach(day => {
            if (getDay(day) !== 0 && getDay(day) !== 6) { // Excluir fines de semana
              vacationDays.add(day.toDateString());
            }
          });
        }
      } catch (error) {
        console.error("Error processing vacation:", vac, error);
      }
    });
    
    // Días laborables totales (excluyendo fines de semana)
    const workableDays = allDays.filter(day => {
      const dayOfWeek = getDay(day);
      return dayOfWeek !== 0 && dayOfWeek !== 6; // No domingo ni sábado
    }).length;
    
    // Días festivos que caen en días laborables
    const workdayHolidays = holidays.filter(h => {
      const date = new Date(h.date);
      const dayOfWeek = getDay(date);
      return date.getFullYear() === currentYear && dayOfWeek !== 0 && dayOfWeek !== 6;
    }).length;
    
    // Días efectivos de trabajo
    const effectiveWorkDays = workableDays - workdayHolidays - vacationDays.size;
    
    // Cálculo de horas por turno
    const turnoManana = {
      nombre: "Turno Mañana (7:00 - 15:00)",
      horasDia: 8,
      horasSemana: 40,
      horasAnio: effectiveWorkDays * 8,
      diasEfectivos: effectiveWorkDays
    };
    
    const turnoTarde = {
      nombre: "Turno Tarde (14:00 - 22:00 / 15:00 - 22:00)",
      horasDia: 8,
      horasSemana: 40,
      horasAnio: effectiveWorkDays * 8,
      diasEfectivos: effectiveWorkDays
    };
    
    const turnoPartido = {
      nombre: "Turno Partido (Mañana + Tarde)",
      horasDia: 8,
      horasSemana: 40,
      horasAnio: effectiveWorkDays * 8,
      diasEfectivos: effectiveWorkDays
    };
    
    const jornadaCompleta = {
      nombre: "Jornada Completa (40h/semana)",
      horasDia: 8,
      horasSemana: 40,
      horasAnio: effectiveWorkDays * 8,
      diasEfectivos: effectiveWorkDays
    };
    
    const jornadaParcial = {
      nombre: "Jornada Parcial (20h/semana)",
      horasDia: 4,
      horasSemana: 20,
      horasAnio: effectiveWorkDays * 4,
      diasEfectivos: effectiveWorkDays
    };
    
    return {
      totalDaysYear: allDays.length,
      workableDays,
      weekendDays: allDays.length - workableDays,
      holidayCount: workdayHolidays,
      vacationDaysCount: vacationDays.size,
      effectiveWorkDays,
      turnos: [turnoManana, turnoTarde, turnoPartido, jornadaCompleta, jornadaParcial]
    };
  }, [holidays, vacations, currentYear]);
  
  return (
    <div className="space-y-6">
      {/* Totalizadores */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Días Laborables</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{calculations.workableDays}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">Días Festivos</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{calculations.holidayCount}</p>
              </div>
              <Calendar className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Días Vacaciones</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{calculations.vacationDaysCount}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 dark:text-green-300 font-medium">Días Efectivos</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{calculations.effectiveWorkDays}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">Fines de Semana</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{calculations.weekendDays}</p>
              </div>
              <Calendar className="w-8 h-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Horas efectivas por tipo de turno */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Horas Efectivas Trabajadas por Tipo de Turno - Año {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {calculations.turnos.map((turno, idx) => (
              <div key={idx} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{turno.nombre}</h3>
                  <Badge className="bg-blue-600">{turno.horasSemana}h/semana</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 rounded p-3 border">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Horas/Día</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{turno.horasDia}h</p>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-900 rounded p-3 border">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Horas/Semana</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{turno.horasSemana}h</p>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-900 rounded p-3 border">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Días Efectivos</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{turno.diasEfectivos}</p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-950 rounded p-3 border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">Horas/Año</p>
                    <p className="text-xl font-bold text-green-900 dark:text-green-100">{turno.horasAnio.toLocaleString()}h</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Nota:</strong> Los cálculos consideran días laborables (lunes a viernes), 
              excluyendo fines de semana, días festivos configurados y períodos de vacaciones generales. 
              Los resultados muestran las horas efectivas de trabajo disponibles por tipo de turno/jornada.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}