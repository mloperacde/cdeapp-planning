import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserCog, 
  UsersRound, 
  RefreshCw,
  Users,
  Clock,
  KeyRound,
  LayoutDashboard,
  UserX,
  Sunrise,
  Sunset,
  CheckCircle2,
  Cake,
  Calendar,
  AlertTriangle,
  MessageSquare,
  ArrowLeftRight,
  Coffee,
  ArrowLeft
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import UnifiedAbsenceManager from "../components/absences/UnifiedAbsenceManager";

const EMPTY_ARRAY = [];

export default function ShiftManagersPage() {
  const [activeView, setActiveView] = React.useState("dashboard");
  
  const { data: employees = EMPTY_ARRAY } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const all = await base44.entities.EmployeeMasterDatabase.list('nombre');
      // Filtro estricto para Jefes de Turno: solo FABRICACION y Activos
      return all.filter(e => e.departamento === 'FABRICACION' && e.estado_empleado === 'Alta');
    },
  });

  const { data: teams = EMPTY_ARRAY } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: teamSchedules = EMPTY_ARRAY } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(),
  });

  const { data: swapRequests = EMPTY_ARRAY } = useQuery({
    queryKey: ['shiftSwapRequests'],
    queryFn: () => base44.entities.ShiftSwapRequest.list('-fecha_solicitud'),
  });

  const { data: lockerAssignments = EMPTY_ARRAY } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
  });

  const { data: absences = EMPTY_ARRAY } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
  });

  // Active absences today
  const activeAbsencesToday = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // We use the 'employees' list which is already filtered for Fabricacion & Alta
    return absences.filter(abs => {
      // Check if absence belongs to one of our relevant employees
      const employee = employees.find(e => e.id === abs.employee_id);
      if (!employee) return false;
      
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      return now >= start && now <= end;
    });
  }, [absences, employees]);

  // Ausencias por equipo
  const absencesByTeam = useMemo(() => {
    const byTeam = {};
    
    teams.forEach(team => {
      byTeam[team.team_name] = [];
    });

    activeAbsencesToday.forEach(abs => {
      const employee = employees.find(e => e.id === abs.employee_id);
      if (employee && employee.equipo && byTeam[employee.equipo]) {
        byTeam[employee.equipo].push({ ...abs, employee });
      }
    });

    return byTeam;
  }, [activeAbsencesToday, employees, teams]);

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

  // Team stats with absences by team
  const teamStats = useMemo(() => {
    return teams.map(team => {
      const teamEmployees = employees.filter(emp => emp.equipo === team.team_name && (emp.estado_empleado || "Alta") === "Alta");
      const absencesCount = absencesByTeam[team.team_name]?.length || 0;
      
      // Disponibles = Total Activos - Ausencias Reales
      const available = Math.max(0, teamEmployees.length - absencesCount);
      const shift = getTodayShift(team.team_key);
      
      return {
        ...team,
        total: teamEmployees.length,
        available,
        absent: absencesCount,
        shift,
        absencesCount
      };
    });
  }, [teams, employees, teamSchedules, absencesByTeam]);

  const modules = [
    {
      title: "Equipos de Turno",
      icon: UsersRound,
      url: createPageUrl("TeamConfiguration"),
      color: "purple",
      description: "Configura equipos rotativos"
    },
    {
      title: "Empleados",
      icon: Users,
      url: createPageUrl("EmployeesShiftManager"),
      color: "teal",
      description: "Consulta y gestión de personal de fabricación"
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
      description: "Gestiona intercambios",
      badge: pendingSwaps.length > 0 ? pendingSwaps.length : null
    },
    {
      title: "Gestión Taquillas",
      icon: KeyRound,
      url: createPageUrl("LockerManagement"),
      color: "orange",
      description: "Asigna vestuarios",
      badge: lockersWithoutNumber > 0 ? lockersWithoutNumber : null
    },
    {
      title: "Comunicación Ausencias",
      icon: MessageSquare,
      action: "absences",
      color: "red",
      description: "Reporta ausencias del turno"
    }
  ];

  const colorClasses = {
    purple: "from-purple-500 to-purple-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
    cyan: "from-cyan-500 to-cyan-600",
    teal: "from-teal-500 to-teal-600",
    violet: "from-violet-500 to-violet-600"
  };

  if (activeView === "absences") {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => setActiveView("dashboard")}>
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </div>
          <UnifiedAbsenceManager sourceContext="shift_manager" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-blue-600" />
            Panel de Control - Jefes de Turno
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Vista general y acceso rápido a gestión de turnos
          </p>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 dark:text-green-200 font-medium">Empleados Disponibles (en Equipos)</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {employees.filter(e => e.disponibilidad === "Disponible" && e.equipo).length}
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
                  <p className="text-xs text-red-700 dark:text-red-200 font-medium">Ausentes Hoy (en Equipos)</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">{activeAbsencesToday.length}</p>
                </div>
                <UserX className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-200 font-medium">Intercambios Pendientes</p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{pendingSwaps.length}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 dark:text-orange-200 font-medium">Taquillas sin Asignar</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{lockersWithoutNumber}</p>
                </div>
                <KeyRound className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Turnos de Hoy por Equipo */}
        <Card className="mb-6 shadow-lg border-0 bg-white dark:bg-card/80 dark:bg-card/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
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
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{team.team_name}</h3>
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
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{team.total}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Total</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-900 dark:text-green-100">{team.available}</div>
                      <div className="text-xs text-green-700 dark:text-green-200">Disponibles</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-900 dark:text-red-100">{team.absencesCount}</div>
                      <div className="text-xs text-red-700 dark:text-red-200">Ausentes</div>
                    </div>
                  </div>

                  {team.absencesCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Ausentes de este equipo:</p>
                      {absencesByTeam[team.team_name]?.slice(0, 3).map(abs => (
                        <div key={abs.id} className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          • {abs.employee?.nombre} - {abs.tipo || abs.motivo}
                        </div>
                      ))}
                      {team.absencesCount > 3 && (
                        <p className="text-xs text-slate-500 mt-1">...y {team.absencesCount - 3} más</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Acceso a Módulos */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Módulos de Gestión</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => {
              const Icon = module.icon;
              const content = (
                <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group h-full border-0 bg-white dark:bg-card/80 dark:bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[module.color]} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                            {module.title}
                          </h3>
                          {module.badge && (
                            <Badge className="bg-red-600 text-white">
                              {module.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{module.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              
              return module.action ? (
                <button key={module.title} onClick={() => setActiveView(module.action)} className="w-full text-left">
                  {content}
                </button>
              ) : (
                <Link key={module.title} to={module.url}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Módulos Adicionales */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Comunicación y Coordinación</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to={createPageUrl("ShiftHandover")}>
              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group h-full border-0 bg-white dark:bg-card/80 dark:bg-card/80 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <ArrowLeftRight className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                        Info. Traspaso Turno
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Comunica info entre turnos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl("Breaks")}>
              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group h-full border-0 bg-white dark:bg-card/80 dark:bg-card/80 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Coffee className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                        Descansos
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Gestiona turnos de descanso</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl("SupportManagement1415")}>
              <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group h-full border-0 bg-white dark:bg-card/80 dark:bg-card/80 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                        Apoyos 14-15h
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Asigna soporte 14-15h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Solicitudes de Intercambio Pendientes */}
          <Card className="shadow-lg border-0 bg-white dark:bg-card/80 dark:bg-card/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-600" />
                Solicitudes de Intercambio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {pendingSwaps.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingSwaps.slice(0, 3).map(swap => {
                    const solicitante = employees.find(e => e.id === swap.solicitante_id);
                    const receptor = employees.find(e => e.id === swap.receptor_id);
                    
                    return (
                      <div key={swap.id} className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200">
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
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {solicitante?.nombre} ↔️ {receptor?.nombre}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{swap.motivo}</p>
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
          <Card className="shadow-lg border-0 bg-white dark:bg-card/80 dark:bg-card/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2">
                <Cake className="w-5 h-5 text-purple-600" />
                Próximos Cumpleaños
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {upcomingBirthdays.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">No hay cumpleaños próximos</p>
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
                        className={`p-3 rounded-lg ${isToday ? 'bg-purple-100 border-2 border-purple-400' : 'bg-slate-50 dark:bg-slate-800/50'}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{emp.nombre}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
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
          <Card className="mb-6 shadow-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
            <CardHeader className="border-b border-amber-200">
              <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                <AlertTriangle className="w-5 h-5" />
                Acciones Requeridas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {lockersWithoutNumber > 0 && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-orange-600" />
                      <span className="text-sm text-slate-900 dark:text-slate-100">
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
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-slate-900 dark:text-slate-100">
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
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2">
                      <UserX className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-slate-900 dark:text-slate-100">
                        <strong>{activeAbsencesToday.length}</strong> ausencias activas hoy - revisar cobertura
                      </span>
                    </div>
                    <Link to={createPageUrl("ShiftAbsenceReport")}>
                      <Button size="sm" variant="outline">
                        Comunicar
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unified Absence Manager */}
        <UnifiedAbsenceManager sourceContext="shift_manager" />
      </div>
    </div>
  );
}