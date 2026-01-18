import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, UserX, Building2, TrendingUp, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { calculateGlobalAbsenteeism, calculateEmployeeAbsenteeism } from "./AbsenteeismCalculator";
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

  // Stats Query
  const { data: stats, isLoading: isLoadingStats } = useQuery({
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
            {/* Empty cells for alignment if starting mid-week */}
            {calendarDays.length > 0 && Array.from({ length: (getDay(calendarDays[0]) + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-slate-50/50" />
            ))}

            {calendarDays.map(day => {
              const absencesForDay = getAbsencesForDay(day);
              const isToday = isSameDay(day, new Date());
              const isWeekend = getDay(day) === 0 || getDay(day) === 6;

              return (
                  <div
                    key={day.toString()}
                    className={`aspect-square border dark:border-slate-700 rounded-lg p-2 ${
                      isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' :
                      isWeekend ? 'bg-slate-50 dark:bg-slate-800/50' :
                      'bg-white dark:bg-slate-800'
                    } hover:shadow-md transition-shadow relative overflow-hidden flex flex-col`}
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
                    
                    {absencesForDay.length > 0 && (
                      <div className="space-y-1 overflow-y-auto max-h-[calc(100%-24px)] custom-scrollbar">
                        {Object.entries(
                          absencesForDay.reduce((acc, abs) => {
                            const employee = employees.find(e => e.id === abs.employee_id);
                            const dept = employee?.departamento || "Sin Dept.";
                            acc[dept] = (acc[dept] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([dept, count]) => (
                          <div
                            key={dept}
                            className="text-[10px] px-1.5 py-0.5 rounded flex justify-between items-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                            title={`${count} ausencias en ${dept}`}
                          >
                            <span className="truncate max-w-[70%]">{dept}</span>
                            <span className="font-bold ml-1">{count}</span>
                          </div>
                        ))}
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
    </div>
  );
}
