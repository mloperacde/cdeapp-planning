import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ArrowLeft, Filter, Settings2, ArrowLeftRight } from "lucide-react";
import ShiftDashboardCustomizer from "../components/shift-manager/ShiftDashboardCustomizer";
import { KPIWidget, TeamStatusWidget, ModulesWidget, CommunicationWidget, RequestsAndBirthdaysWidget, AlertsWidget } from "../components/shift-manager/ShiftDashboardWidgets";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, isSameDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UnifiedAbsenceManager from "../components/absences/UnifiedAbsenceManager";
import ThemeToggle from "../components/common/ThemeToggle";
import { useShiftConfig } from "@/hooks/useShiftConfig";

const EMPTY_ARRAY = [];

const DEFAULT_WIDGETS = [
    { id: 'kpi', label: 'KPIs Principales', enabled: true, position: 0, component: KPIWidget },
    { id: 'team_status', label: 'Estado de Equipos', enabled: true, position: 1, component: TeamStatusWidget },
    { id: 'alerts', label: 'Alertas', enabled: true, position: 2, component: AlertsWidget },
    { id: 'modules', label: 'Módulos de Gestión', enabled: true, position: 3, component: ModulesWidget },
    { id: 'communication', label: 'Comunicación', enabled: true, position: 4, component: CommunicationWidget },
    { id: 'requests_birthdays', label: 'Solicitudes y Cumpleaños', enabled: true, position: 5, component: RequestsAndBirthdaysWidget },
];

export default function ShiftManagersPage() {
  const { shifts } = useShiftConfig();
  const [activeView, setActiveView] = React.useState("dashboard");
  const [selectedTeamFilter, setSelectedTeamFilter] = React.useState("all");
  const [customizerOpen, setCustomizerOpen] = React.useState(false);
  
  const { data: currentUser } = useQuery({
      queryKey: ['currentUser'],
      queryFn: () => base44.auth.me(),
  });

  const { data: widgetConfig, refetch: refetchConfig } = useQuery({
      queryKey: ['shiftManagerDashboardConfig', currentUser?.email],
      queryFn: async () => {
          if (!currentUser?.email) return null;
          const configs = await base44.entities.DashboardWidgetConfig.filter({ 
              user_id: currentUser.id, 
              dashboard_name: 'ShiftManager' 
          });
          return configs[0] || null;
      },
      enabled: !!currentUser
  });

  const { data: manufacturingConfig } = useQuery({
    queryKey: ["appConfig", "manufacturing"],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: "manufacturing_config" });
      const record = configs[0] || null;
      if (record?.value) {
          try {
              return typeof record.value === 'string' ? JSON.parse(record.value) : record.value;
          } catch (e) {
              return null;
          }
      }
      return null;
    },
  });

  const activeWidgets = useMemo(() => {
      if (!widgetConfig?.widgets) return DEFAULT_WIDGETS;
      
      // Merge saved config with default widgets definition to keep components
      const savedWidgets = widgetConfig.widgets;
      
      // Create a map of defaults
      const defaultsMap = new Map(DEFAULT_WIDGETS.map(w => [w.id, w]));
      
      // Map saved config to full widget objects
      const merged = savedWidgets.map(sw => {
          const def = defaultsMap.get(sw.widget_id);
          return def ? { ...def, enabled: sw.enabled, position: sw.position } : null;
      }).filter(Boolean);

      // Add any new defaults that might not be in saved config (for updates)
      DEFAULT_WIDGETS.forEach(def => {
          if (!savedWidgets.find(sw => sw.widget_id === def.id)) {
              merged.push({ ...def, position: 99 }); // Append to end
          }
      });

      return merged.sort((a, b) => a.position - b.position);
  }, [widgetConfig]);

  const saveConfigMutation = useMutation({
      mutationFn: async (newWidgets) => {
          const payload = {
              user_id: currentUser.id,
              role: 'shift_manager',
              dashboard_name: 'ShiftManager',
              widgets: newWidgets.map((w, index) => ({
                  widget_id: w.id,
                  enabled: w.enabled,
                  position: index,
                  size: 'full'
              })),
              activo: true
          };

          if (widgetConfig) {
              return base44.entities.DashboardWidgetConfig.update(widgetConfig.id, payload);
          } else {
              return base44.entities.DashboardWidgetConfig.create(payload);
          }
      },
      onSuccess: () => {
          refetchConfig();
      }
  });

  const { data: employees = EMPTY_ARRAY } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const all = await base44.entities.EmployeeMasterDatabase.list('nombre');
      // Fetch all employees to ensure we find assigned leaders even if status varies
      // We can filter for display purposes later if needed
      return all;
    },
  });

  const { data: teams = EMPTY_ARRAY } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: teamSchedules = EMPTY_ARRAY } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(undefined, 2000),
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

  const { data: machines = EMPTY_ARRAY } = useQuery({
      queryKey: ['machines_master'],
      queryFn: async () => {
          const data = await base44.entities.MachineMasterDatabase.list();
          return Array.isArray(data) ? data.map(m => ({
              ...m,
              alias: getMachineAlias(m)
          })) : [];
      },
      staleTime: 10 * 60 * 1000,
  });

  const { data: dailyStaffing = EMPTY_ARRAY } = useQuery({
      queryKey: ['daily_staffing_today'],
      queryFn: () => {
          const today = format(new Date(), 'yyyy-MM-dd');
          return base44.entities.DailyMachineStaffing.filter({ date: today });
      },
      refetchInterval: 60000,
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

      // Filter by team if selected
      if (selectedTeamFilter !== "all" && employee.equipo !== selectedTeamFilter) return false;
      
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      return now >= start && now <= end;
    });
  }, [absences, employees, selectedTeamFilter]);

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
    return swapRequests.filter(req => {
        if (req.estado !== "Pendiente" && req.estado !== "Aceptada por Receptor") return false;
        
        // Filter by team
        if (selectedTeamFilter !== "all") {
             const solicitante = employees.find(e => e.id === req.solicitante_id);
             // If solicitante is not in the filtered list (because of strict filtering in employees query or team mismatch)
             if (!solicitante || solicitante.equipo !== selectedTeamFilter) return false;
        }
        return true;
    });
  }, [swapRequests, employees, selectedTeamFilter]);

  // Lockers without assignment
  const lockersWithoutNumber = useMemo(() => {
    return lockerAssignments.filter(la => {
      if (la.requiere_taquilla === false || la.numero_taquilla_actual) return false;
      
      // Filter by team
      if (selectedTeamFilter !== "all") {
          const employee = employees.find(e => e.id === la.employee_id);
          if (!employee || employee.equipo !== selectedTeamFilter) return false;
      }
      return true;
    }).length;
  }, [lockerAssignments, employees, selectedTeamFilter]);

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
    return teams
        .filter(team => selectedTeamFilter === "all" || team.team_name === selectedTeamFilter)
        .map(team => {
        const teamEmployees = employees.filter(emp => emp.equipo === team.team_name && (emp.estado_empleado || "Alta") === "Alta");
        const absencesCount = absencesByTeam[team.team_name]?.length || 0;
        
        // Disponibles = Total Activos - Ausencias Reales
        const available = Math.max(0, teamEmployees.length - absencesCount);
        let shift = getTodayShift(team.team_key);
        
        // Fallback: Infer shift from team name if not found in schedule
        if (!shift) {
            const lowerName = team.team_name.toLowerCase();
            if (lowerName.includes("t2") || lowerName.includes("tarde") || lowerName.includes("turno 2") || lowerName.includes("sara") || lowerName.includes("ivan")) {
                shift = shifts.AFTERNOON || "Tarde";
            } else if (lowerName.includes("t1") || lowerName.includes("mañana") || lowerName.includes("turno 1")) {
                shift = shifts.MORNING || "Mañana";
            }
        }
        
        return {
            ...team,
            total: teamEmployees.length,
            available,
            absent: absencesCount,
            shift,
            absencesCount
        };
    });
  }, [teams, employees, teamSchedules, absencesByTeam, selectedTeamFilter]);



  if (activeView === "absences") {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Compacto - Vista Ausencias */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Gestión de Ausencias
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Vista detallada de ausencias y solicitudes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setActiveView("dashboard")}>
                <ArrowLeft className="w-3 h-3 mr-1" />
                Volver al Dashboard
              </Button>
              <ThemeToggle />
            </div>
          </div>
          <UnifiedAbsenceManager sourceContext="shift_manager" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Compacto */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Panel de Control - Jefes de Turno
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Vista general y acceso rápido a gestión de turnos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                <ArrowLeft className="w-3 h-3 mr-1" />
                Volver
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Toolbar Unificada */}
        <div className="flex flex-col sm:flex-row gap-4 shrink-0 mb-6 justify-between items-center">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-500 ml-2" />
                <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] border-0 focus:ring-0 h-8 text-sm bg-transparent">
                        <SelectValue placeholder="Todos los Equipos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los Equipos</SelectItem>
                        {teams.map(team => (
                            <SelectItem key={team.id} value={team.team_name}>
                                {team.team_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCustomizerOpen(true)}
            className="w-full sm:w-auto h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Personalizar Dashboard
          </Button>
        </div>

        <div className="space-y-6">
            {activeWidgets.map(widget => {
                if (!widget.enabled) return null;
                const WidgetComponent = widget.component;
                return (
                    <WidgetComponent 
                        key={widget.id}
                        employees={employees}
                        activeAbsencesToday={activeAbsencesToday}
                        pendingSwaps={pendingSwaps}
                        lockersWithoutNumber={lockersWithoutNumber}
                        selectedTeamFilter={selectedTeamFilter}
                        teamStats={teamStats}
                        absencesByTeam={absencesByTeam}
                        setActiveView={setActiveView}
                        upcomingBirthdays={upcomingBirthdays}
                        machines={machines}
                        dailyStaffing={dailyStaffing}
                        manufacturingConfig={manufacturingConfig}
                        shifts={shifts}
                    />
                );
            })}
        </div>

        <ShiftDashboardCustomizer 
            open={customizerOpen} 
            onOpenChange={setCustomizerOpen} 
            widgets={activeWidgets}
            onSave={(newWidgets) => saveConfigMutation.mutate(newWidgets)}
        />

        {/* Unified Absence Manager */}
        <UnifiedAbsenceManager sourceContext="shift_manager" />
      </div>
    </div>
  );
}
