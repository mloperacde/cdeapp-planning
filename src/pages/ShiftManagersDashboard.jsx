import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  ArrowLeft, 
  Users, 
  UserX, 
  RefreshCw, 
  KeyRound,
  Clock,
  Sunrise,
  Sunset,
  UserCog,
  AlertTriangle,
  CheckCircle2,
  Cake,
  Calendar
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

export default function ShiftManagersDashboardPage() {
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: teamSchedules } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(),
    initialData: [],
  });

  const { data: swapRequests } = useQuery({
    queryKey: ['shiftSwapRequests'],
    queryFn: () => base44.entities.ShiftSwapRequest.list('-fecha_solicitud'),
    initialData: [],
  });

  const { data: lockerAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    initialData: [],
  });

  const { data: absences } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  // Active absences today
  const activeAbsencesToday = useMemo(() => {
    const now = new Date();
    return absences.filter(abs => {
      const start = new Date(abs.fecha_inicio);
      const end = new Date(abs.fecha_fin);
      return now >= start && now <= end;
    });
  }, [absences]);

  // Pending swap requests
  const pendingSwaps = useMemo(() => {
    return swapRequests.filter(req => 
      req.estado === "Pendiente" || req.estado === "Aceptada por Receptor"
    );
  }, [swapRequests]);

  // Lockers without assignment
  const lockersWithoutNumber = useMemo(() => {
    return lockerAssignments.filter(la => 
      la.requiere_taquilla !== false && !la.numero_taquilla_actual
    ).length;
  }, [lockerAssignments]);

  // Get shift for today
  const getTodayShift = (teamKey) => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    
    const schedule = teamSchedules.find(
      s => s.team_key === teamKey && s.fecha_inicio_semana === weekStartStr
    );
    
    return schedule?.turno;
  };

  // Upcoming birthdays
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return employees.filter(emp => {
      if (!emp.fecha_nacimiento) return false;
      const birthDate = new Date(emp.fecha_nacimiento);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      
      if (isSameDay(thisYearBirthday, today)) return true;
      return thisYearBirthday >= today && thisYearBirthday <= nextWeek;
    }).slice(0, 5);
  }, [employees]);

  // Team stats
  const teamStats = useMemo(() => {
    return teams.map(team => {
      const teamEmployees = employees.filter(emp => emp.equipo === team.team_name);
      const available = teamEmployees.filter(emp => emp.disponibilidad === "Disponible").length;
      const absent = teamEmployees.filter(emp => emp.disponibilidad === "Ausente").length;
      const shift = getTodayShift(team.team_key);
      
      return {
        ...team,
        total: teamEmployees.length,
        available,
        absent,
        shift
      };
    });
  }, [teams, employees, teamSchedules]);

  const modules = [
    {
      title: "Equipos de Turno",
      icon: Users,
      url: createPageUrl("TeamConfiguration"),
      color: "purple",
      description: "Configura equipos rotativos"
    },
    {
      title: "Asignaciones Máquinas",
      icon: UserCog,
      url: createPageUrl("MachineAssignments"),
      color: "blue",
      description: "Distribuye operarios"
    },
    {
      title: "Intercambio Turnos",
      icon: RefreshCw,
      url: createPageUrl("ShiftManagement"),
      color: "green",
      description: "Gestiona intercambios"
    },
    {
      title: "Gestión Taquillas",
      icon: KeyRound,
      url: createPageUrl("LockerManagement"),
      color: "orange",
      description: "Asigna vestuarios"
    }
  ];

  const colorClasses = {
    purple: "from-purple-500 to-purple-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600"
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("ShiftManagers")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Jefes de Turno
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-blue-600" />
            Panel de Control - Jefes de Turno
          </h1>
          <p className="text-slate-600 mt-1">
            Vista general de equipos, turnos y acceso rápido a módulos
          </p>
        </div>

        {/* Acceso Rápido a Módulos */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Acceso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.title} to={module.url}>
                  <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group h-full border-0 bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[module.color]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {module.title}
                          </h3>
                          <p className="text-xs text-slate-600">{module.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Empleados Disponibles</p>
                  <p className="text-2xl font-bold text-green-900">
                    {employees.filter(e => e.disponibilidad === "Disponible").length}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Ausentes Hoy</p>
                  <p className="text-2xl font-bold text-red-900">{activeAbsencesToday.length}</p>
                </div>
                <UserX className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Intercambios Pendientes</p>
                  <p className="text-2xl font-bold text-amber-900">{pendingSwaps.length}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Taquillas sin Asignar</p>
                  <p className="text-2xl font-bold text-orange-900">{lockersWithoutNumber}</p>
                </div>
                <KeyRound className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Turnos de Hoy por Equipo */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Turnos de Hoy - {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teamStats.map((team) => (
                <div 
                  key={team.team_key} 
                  className="border-2 rounded-lg p-4"
                  style={{ borderColor: team.color }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{team.team_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {team.shift === "Mañana" && (
                          <Badge className="bg-amber-100 text-amber-800">
                            <Sunrise className="w-3 h-3 mr-1" />
                            Mañana (7:00-15:00)
                          </Badge>
                        )}
                        {team.shift === "Tarde" && (
                          <Badge className="bg-indigo-100 text-indigo-800">
                            <Sunset className="w-3 h-3 mr-1" />
                            Tarde (14:00/15:00-22:00)
                          </Badge>
                        )}
                        {!team.shift && (
                          <Badge variant="outline" className="bg-slate-100">
                            Sin asignar
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${team.color}20`, borderColor: team.color, borderWidth: 2 }}
                    >
                      <Users className="w-6 h-6" style={{ color: team.color }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">{team.total}</div>
                      <div className="text-xs text-slate-600">Total</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">{team.available}</div>
                      <div className="text-xs text-green-700">Disponibles</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-900">{team.absent}</div>
                      <div className="text-xs text-red-700">Ausentes</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Solicitudes de Intercambio Pendientes */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-600" />
                Solicitudes de Intercambio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {pendingSwaps.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingSwaps.slice(0, 3).map(swap => {
                    const solicitante = employees.find(e => e.id === swap.solicitante_id);
                    const receptor = employees.find(e => e.id === swap.receptor_id);
                    
                    return (
                      <div key={swap.id} className="p-3 border rounded-lg bg-amber-50 border-amber-200">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={
                            swap.estado === "Aceptada por Receptor" 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }>
                            {swap.estado}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {format(new Date(swap.fecha_solicitud), "dd/MM HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {solicitante?.nombre} ↔️ {receptor?.nombre}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">{swap.motivo}</p>
                      </div>
                    );
                  })}
                  <Link to={createPageUrl("ShiftManagement")}>
                    <Button variant="outline" className="w-full mt-2">
                      Ver Todas ({pendingSwaps.length})
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Próximos Cumpleaños */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Cake className="w-5 h-5 text-purple-600" />
                Próximos Cumpleaños
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {upcomingBirthdays.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No hay cumpleaños próximos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingBirthdays.map(emp => {
                    const birthDate = new Date(emp.fecha_nacimiento);
                    const thisYearBirthday = new Date(new Date().getFullYear(), birthDate.getMonth(), birthDate.getDate());
                    const isToday = isSameDay(thisYearBirthday, new Date());
                    
                    return (
                      <div 
                        key={emp.id} 
                        className={`p-3 rounded-lg ${isToday ? 'bg-purple-100 border-2 border-purple-400' : 'bg-slate-50'}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-sm text-slate-900">{emp.nombre}</div>
                            <div className="text-xs text-slate-600">
                              {format(thisYearBirthday, "d 'de' MMMM", { locale: es })}
                            </div>
                          </div>
                          {isToday && (
                            <Badge className="bg-purple-600 text-white">
                              ¡HOY! 🎉
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alertas y Acciones Requeridas */}
        {(lockersWithoutNumber > 0 || pendingSwaps.length > 0 || activeAbsencesToday.length > 5) && (
          <Card className="shadow-lg border-2 border-amber-300 bg-amber-50">
            <CardHeader className="border-b border-amber-200">
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-5 h-5" />
                Acciones Requeridas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {lockersWithoutNumber > 0 && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-orange-600" />
                      <span className="text-sm text-slate-900">
                        <strong>{lockersWithoutNumber}</strong> empleado(s) sin taquilla asignada
                      </span>
                    </div>
                    <Link to={createPageUrl("LockerManagement")}>
                      <Button size="sm" variant="outline">
                        Resolver
                      </Button>
                    </Link>
                  </div>
                )}
                
                {pendingSwaps.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-slate-900">
                        <strong>{pendingSwaps.length}</strong> solicitud(es) de intercambio pendiente(s)
                      </span>
                    </div>
                    <Link to={createPageUrl("ShiftManagement")}>
                      <Button size="sm" variant="outline">
                        Revisar
                      </Button>
                    </Link>
                  </div>
                )}

                {activeAbsencesToday.length > 5 && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2">
                      <UserX className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-slate-900">
                        <strong>{activeAbsencesToday.length}</strong> ausencias activas hoy
                      </span>
                    </div>
                    <Link to={createPageUrl("AbsenceManagement")}>
                      <Button size="sm" variant="outline">
                        Ver
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumen de Ausencias Hoy */}
        {activeAbsencesToday.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-600" />
                Empleados Ausentes Hoy ({activeAbsencesToday.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeAbsencesToday.slice(0, 6).map(absence => {
                  const employee = employees.find(e => e.id === absence.employee_id);
                  if (!employee) return null;
                  
                  return (
                    <div key={absence.id} className="p-3 border rounded-lg bg-red-50 border-red-200">
                      <div className="font-semibold text-sm text-slate-900">{employee.nombre}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        {employee.departamento} - {employee.puesto}
                      </div>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {absence.tipo}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              {activeAbsencesToday.length > 6 && (
                <Link to={createPageUrl("AbsenceManagement")}>
                  <Button variant="outline" className="w-full mt-4">
                    Ver Todas ({activeAbsencesToday.length})
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}