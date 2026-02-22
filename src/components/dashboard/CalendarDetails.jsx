import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, Palmtree } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function CalendarDetails({ year }) {
  const selectedYear = year || new Date().getFullYear();

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => base44.entities.Holiday.list("date"),
  });

  const { data: vacations = [] } = useQuery({
    queryKey: ["vacations"],
    queryFn: () => base44.entities.Vacation.list("start_date"),
  });

  const yearHolidays = holidays.filter(h => {
    const d = new Date(h.date);
    return d.getFullYear() === selectedYear;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const yearVacations = vacations.filter(v => {
    const s = new Date(v.start_date);
    const e = new Date(v.end_date);
    return s.getFullYear() === selectedYear || e.getFullYear() === selectedYear;
  }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {/* Festivos */}
      <Card className="shadow border-0 bg-white">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sun className="w-4 h-4 text-red-500" />
            Días Festivos {selectedYear}
            <Badge className="ml-auto bg-red-100 text-red-700 text-xs">{yearHolidays.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto max-h-64">
          {yearHolidays.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No hay festivos registrados.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {yearHolidays.map(h => (
                <li key={h.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-red-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{h.name}</p>
                    {h.description && <p className="text-xs text-slate-400">{h.description}</p>}
                  </div>
                  <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
                    {format(new Date(h.date), "d MMM", { locale: es })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Vacaciones */}
      <Card className="shadow border-0 bg-white">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palmtree className="w-4 h-4 text-blue-500" />
            Períodos de Vacaciones {selectedYear}
            <Badge className="ml-auto bg-blue-100 text-blue-700 text-xs">{yearVacations.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto max-h-64">
          {yearVacations.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No hay períodos de vacaciones registrados.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {yearVacations.map(v => (
                <li key={v.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{v.name}</p>
                    {v.notes && <p className="text-xs text-slate-400">{v.notes}</p>}
                    <p className="text-xs text-slate-500 mt-0.5">
                      {v.aplica_todos ? "Todos los empleados" : "Empleados específicos"}
                    </p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full block whitespace-nowrap">
                      {format(new Date(v.start_date), "d MMM", { locale: es })} – {format(new Date(v.end_date), "d MMM", { locale: es })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}