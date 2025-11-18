import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Palmtree } from "lucide-react";
import { format, eachDayOfInterval, getDay } from "date-fns";
import { es } from "date-fns/locale";

export default function HolidayVacationPanel() {
  const currentYear = new Date().getFullYear();

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  const { data: vacations = [] } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
  });

  const { festivosList, vacacionesList } = useMemo(() => {
    const festivos = holidays
      .filter(h => new Date(h.date).getFullYear() === currentYear)
      .map(h => ({
        fecha: new Date(h.date),
        nombre: h.name,
        descripcion: h.description,
      }))
      .sort((a, b) => a.fecha - b.fecha);

    const vacaciones = vacations
      .filter(v => new Date(v.start_date).getFullYear() === currentYear)
      .map(v => {
        const start = new Date(v.start_date);
        const end = new Date(v.end_date);
        const allDays = eachDayOfInterval({ start, end });
        const dias = allDays.filter(d => {
          const dayOfWeek = getDay(d);
          return dayOfWeek !== 0 && dayOfWeek !== 6;
        }).length;
        
        return {
          fecha: start,
          fecha_fin: end,
          nombre: v.name,
          descripcion: v.notes,
          dias,
        };
      })
      .sort((a, b) => a.fecha - b.fecha);

    return { festivosList: festivos, vacacionesList: vacaciones };
  }, [holidays, vacations, currentYear]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-600" />
            Días Festivos {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {festivosList.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No hay festivos configurados</p>
          ) : (
            <div className="space-y-2">
              {festivosList.map((item, idx) => (
                <div key={idx} className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                  <div className="font-bold text-slate-900 text-sm">
                    {format(item.fecha, "dd/MM/yyyy - EEEE", { locale: es })}
                  </div>
                  <div className="font-semibold text-red-900 mt-1 text-xs">{item.nombre}</div>
                  {item.descripcion && (
                    <p className="text-xs text-slate-600 mt-1">{item.descripcion}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Palmtree className="w-5 h-5 text-blue-600" />
            Períodos de Vacaciones {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {vacacionesList.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No hay vacaciones configuradas</p>
          ) : (
            <div className="space-y-2">
              {vacacionesList.map((item, idx) => (
                <div key={idx} className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="font-bold text-slate-900 text-sm">
                    {format(item.fecha, "dd/MM/yyyy", { locale: es })} - {format(item.fecha_fin, "dd/MM/yyyy", { locale: es })}
                  </div>
                  <div className="font-semibold text-blue-900 mt-1 text-xs flex items-center gap-2">
                    {item.nombre}
                    <Badge className="bg-blue-600">{item.dias} días laborables</Badge>
                  </div>
                  {item.descripcion && (
                    <p className="text-xs text-slate-600 mt-1">{item.descripcion}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}