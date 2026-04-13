import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, UserX, Building2, TrendingUp, AlertCircle, Users, UserCheck } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { calculateGlobalAbsenteeism } from "./AbsenteeismCalculator";
import { useAppData } from "../data/DataProvider";

export default function AbsenceCalendar({ absences: propsAbsences, employees: propsEmployees, absenceTypes, selectedDepartment = "all" }) {
  // Access global data
  const appData = useAppData();
  const absences = propsAbsences || appData?.absences || [];
  const employees = propsEmployees || appData?.employees || [];
  const vacations = appData?.vacations || [];
  const holidays = appData?.holidays || [];

  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [selectedType, setSelectedType] = useState("all");
  const [filterDept, setFilterDept] = useState(selectedDepartment);

  const { data: stats } = useQuery({
    queryKey: ['calendarStats', dateRange, employees.length, absences.length],
    queryFn: async () => {
      if (!dateRange?.from) return null;
      
      const start = dateRange.from;
      const end = dateRange.to || dateRange.from;

      // 1. Calculate Active Absences in Range
      const activeAbsences = absences.filter(abs => {
        const absStart = new Date(abs.fecha_inicio);
        const absEnd = abs.fecha_fin_desconocida ? new Date() : new Date(abs.fecha_fin);
        return absEnd >= start && absStart <= end && abs.estado_aprobacion === "Aprobada";
      });

      // 2. Departments with Absences
      const deptsWithAbsences = new Set(
        activeAbsences
          .map(abs => employees.find(e => e.id === abs.employee_id)?.departamento)
          .filter(Boolean)
      );

      // 3. Global Absenteeism
      const sharedData = { employees, absences, vacations, holidays };
      const globalStats = await calculateGlobalAbsenteeism(start, end, sharedData);

      // 4. Department Absenteeism (Find Top)
      const depts = [...new Set(employees.map(e => e.departamento).filter(Boolean))];
      
      const deptStatsPromises = depts.map(async (dept) => {
        const deptEmployees = employees.filter(e => e.departamento === dept);
        // Reuse global calculation but for specific department employees
        const stats = await calculateGlobalAbsenteeism(start, end, { 
            employees: deptEmployees, 
            absences, 
            vacations, 
            holidays 
        });
        return { name: dept, rate: stats.tasaAbsentismoGlobal };
      });

      const deptStatsResults = await Promise.all(deptStatsPromises);
      
      const maxDeptRate = deptStatsResults.reduce((max, curr) => 
        curr.rate > max.rate ? curr : max
      , { name: "N/A", rate: 0 });

      return {
        activeAbsencesCount: activeAbsences.length,
        deptsWithAbsencesCount: deptsWithAbsences.size,
        globalRate: globalStats.tasaAbsentismoGlobal,
        topDept: maxDeptRate
      };
    },
    enabled: !!dateRange?.from && employees.length > 0
  });

  const calendarDays = useMemo(() => {
    if (!dateRange?.from) return [];
    const start = dateRange.from;
    const end = dateRange.to || dateRange.from;
    return eachDayOfInterval({ start, end });
  }, [dateRange]);

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const getAbsencesForDay = (day) => {
    return absences.filter(abs => {
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? new Date() : new Date(abs.fecha_fin);
      const isInRange = day >= start && day <= end;
      if (!isInRange) return false;
      const employee = employees.find(e => e.id === abs.employee_id);
      const matchesDept = filterDept === "all" || employee?.departamento === filterDept;
      const matchesType = selectedType === "all" || abs.absence_type_id === selectedType;
      return matchesDept && matchesType && abs.estado_aprobacion === "Aprobada";
    });
  };

  const getAvailabilityForDay = (day, dayAbsences) => {
    const activeEmployees = employees.filter(e =>
      e.estado_empleado === 'Alta' &&
      e.incluir_en_planning !== false &&
      (filterDept === 'all' || e.departamento === filterDept)
    );
    const absentIds = new Set(dayAbsences.map(a => a.employee_id));
    const disponibles = activeEmployees.filter(e => !absentIds.has(e.id));
    return { total: activeEmployees.length, disponibles: disponibles.length, ausentes: dayAbsences.length };
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Ausencias Activas</p>
              <p className="text-2xl font-bold text-blue-900">{stats?.activeAbsencesCount ?? 0}</p>
            </div>
            <UserX className="w-8 h-8 text-blue-500 opacity-50" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-800">Departamentos Afectados</p>
              <p className="text-2xl font-bold text-indigo-900">{stats?.deptsWithAbsencesCount ?? 0}</p>
            </div>
            <Building2 className="w-8 h-8 text-indigo-500 opacity-50" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-800">Absentismo Global</p>
              <p className="text-2xl font-bold text-emerald-900">{stats?.globalRate?.toFixed(2) ?? "0.00"}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500 opacity-50" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-800">Mayor Absentismo</p>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-amber-900 truncate max-w-[120px]" title={stats?.topDept?.name}>
                  {stats?.topDept?.name || "-"}
                </span>
                <span className="text-xs text-amber-700 font-semibold">
                  {stats?.topDept?.rate?.toFixed(2) ?? "0.00"}%
                </span>
              </div>
            </div>
            <AlertCircle className="w-8 h-8 text-amber-500 opacity-50" />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              Calendario de Ausencias
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-[260px] justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                          {format(dateRange.to, "LLL dd, y", { locale: es })}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y", { locale: es })
                      )
                    ) : (
                      <span>Selecciona un periodo</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
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

          <div className="grid grid-cols-7 gap-2 mb-2 sticky top-0 bg-white dark:bg-slate-950 z-10 py-2 border-b">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-slate-600 p-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.length > 0 && Array.from({ length: (getDay(calendarDays[0]) + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-slate-50/50" />
            ))}

            {calendarDays.map(day => {
              const absencesForDay = getAbsencesForDay(day);
              const availability = getAvailabilityForDay(day, absencesForDay);
              const isToday = isSameDay(day, new Date());
              const isWeekend = getDay(day) === 0 || getDay(day) === 6;
              const availPct = availability.total > 0 ? Math.round((availability.disponibles / availability.total) * 100) : 100;
              const hasAbsences = absencesForDay.length > 0;

              const dayCell = (
                <div
                  key={day.toString()}
                  className={`aspect-square border dark:border-slate-700 rounded-lg p-2 ${
                    isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' :
                    isWeekend ? 'bg-slate-50 dark:bg-slate-800/50' :
                    'bg-white dark:bg-slate-800'
                  } hover:shadow-md transition-shadow relative overflow-hidden flex flex-col cursor-pointer`}
                >
                  <div className="flex justify-between items-start">
                    <div className={`text-sm font-semibold mb-1 ${
                      isToday ? 'text-blue-600 dark:text-blue-400' :
                      isWeekend ? 'text-slate-400 dark:text-slate-500' :
                      'text-slate-700 dark:text-slate-200'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">
                      {format(day, 'MMM', { locale: es })}
                    </div>
                  </div>

                  {!isWeekend && availability.total > 0 && (
                    <div className="mt-auto">
                      <div className={`text-[10px] font-semibold mb-1 ${
                        availPct >= 90 ? 'text-green-600' : availPct >= 70 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        <UserCheck className="inline w-2.5 h-2.5 mr-0.5" />{availability.disponibles}/{availability.total}
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full ${
                            availPct >= 90 ? 'bg-green-500' : availPct >= 70 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${availPct}%` }}
                        />
                      </div>
                      {hasAbsences && (
                        <div className="text-[9px] text-red-500 mt-0.5">
                          <UserX className="inline w-2 h-2 mr-0.5" />{availability.ausentes} aus.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );

              if (!hasAbsences) return <div key={day.toString()}>{dayCell}</div>;

              return (
                <Popover key={day.toString()}>
                  <PopoverTrigger asChild>{dayCell}</PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="center">
                    <div className="p-3 border-b bg-slate-50 dark:bg-slate-800">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {format(day, "EEEE, d 'de' MMMM", { locale: es })}
                      </p>
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="flex items-center gap-1 text-green-600 font-semibold">
                          <UserCheck className="w-3.5 h-3.5" />{availability.disponibles} disponibles
                        </span>
                        <span className="flex items-center gap-1 text-red-500 font-semibold">
                          <UserX className="w-3.5 h-3.5" />{availability.ausentes} ausentes
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Users className="w-3.5 h-3.5" />{availability.total} total
                        </span>
                      </div>
                    </div>
                    <div className="p-3 max-h-52 overflow-y-auto space-y-1.5">
                      {absencesForDay.map(abs => {
                        const emp = employees.find(e => e.id === abs.employee_id);
                        return (
                          <div key={abs.id} className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{emp?.nombre || '—'}</p>
                              <p className="text-slate-500">{abs.tipo || abs.motivo || 'Sin motivo'} · {emp?.departamento || '—'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}