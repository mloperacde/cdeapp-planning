import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  CalendarDays, 
  Wrench, 
  Settings, 
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppData } from "../components/data/DataProvider";
import TimelineControls from "../components/timeline/TimelineControls";
import TimelineView from "../components/timeline/TimelineView";
import WorkCalendar from "../components/absences/WorkCalendar";
import ShiftSwapWidget from "../components/dashboard/ShiftSwapWidget";
import { startOfWeek, endOfWeek } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function Dashboard() {
  const { user, employees, absences, maintenance: maintenanceSchedules } = useAppData();

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeAbsences = absences.filter(a => {
      const start = new Date(a.fecha_inicio);
      const end = a.fecha_fin ? new Date(a.fecha_fin) : null;
      return start <= today && (!end || end >= today) && a.estado_aprobacion === 'Aprobada';
    }).length;

    const pendingAbsences = absences.filter(a => a.estado_aprobacion === 'Pendiente').length;

    const upcomingMaintenance = maintenanceSchedules.filter(m => {
      const scheduled = new Date(m.fecha_programada);
      const diffDays = Math.ceil((scheduled - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7 && m.estado !== 'Completado';
    }).length;

    return {
      totalEmployees: employees.length,
      activeAbsences,
      pendingAbsences,
      upcomingMaintenance
    };
  }, [employees, absences, maintenanceSchedules]);

  const quickActions = [
    {
      title: "Empleados",
      description: "Gestión de empleados",
      icon: Users,
      color: "blue",
      url: createPageUrl("MasterEmployeeDatabase")
    },
    {
      title: "Ausencias",
      description: "Gestionar ausencias",
      icon: CalendarDays,
      color: "green",
      url: createPageUrl("AbsenceManagement")
    },
    {
      title: "Mantenimiento",
      description: "Seguimiento de mantenimiento",
      icon: Wrench,
      color: "orange",
      url: createPageUrl("MaintenanceTracking")
    },
    {
      title: "Timeline",
      description: "Planificación semanal",
      icon: CalendarDays,
      color: "teal",
      url: createPageUrl("Timeline")
    },
    {
      title: "Configuración",
      description: "Ajustes del sistema",
      icon: Settings,
      color: "purple",
      url: createPageUrl("Configuration")
    }
  ];

  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    teal: "from-teal-500 to-teal-600",
    purple: "from-purple-500 to-purple-600"
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Bienvenido{user?.full_name ? `, ${user.full_name}` : ''}
          </h1>
          <p className="text-slate-600 mt-1">
            Panel de control principal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total Empleados</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">{stats.totalEmployees}</p>
                </div>
                <Users className="w-12 h-12 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Ausencias Activas</p>
                  <p className="text-3xl font-bold text-green-900 mt-2">{stats.activeAbsences}</p>
                </div>
                <CalendarDays className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 font-medium">Pendientes Aprobación</p>
                  <p className="text-3xl font-bold text-orange-900 mt-2">{stats.pendingAbsences}</p>
                </div>
                <AlertCircle className="w-12 h-12 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Mantenimiento (7 días)</p>
                  <p className="text-3xl font-bold text-purple-900 mt-2">{stats.upcomingMaintenance}</p>
                </div>
                <Wrench className="w-12 h-12 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Accesos Rápidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} to={action.url}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer group">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[action.color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-slate-600">{action.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-1 h-[600px]">
                <ShiftSwapWidget />
            </div>
            <div className="lg:col-span-2">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Calendario Laboral</h2>
                <WorkCalendar />
            </div>
        </div>

        <TimelineSection />
      </div>
    </div>
  );
}

function TimelineSection() {
  const { employees = [], teams = [], holidays = [], vacations = [] } = useAppData();
  const [viewMode, setViewMode] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const { data: teamSchedules = [] } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(),
    initialData: [],
  });

  const { start: startDate, end: endDate } = useMemo(() => {
    const dateCopy = new Date(selectedDate);
    switch (viewMode) {
      case 'day':
        return {
          start: new Date(dateCopy.setHours(7, 0, 0, 0)),
          end: new Date(dateCopy.setHours(22, 0, 0, 0))
        };
      case 'week':
        const weekStart = startOfWeek(dateCopy, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(dateCopy, { weekStartsOn: 1 });
        weekStart.setHours(7, 0, 0, 0);
        weekEnd.setHours(22, 0, 0, 0);
        return { start: weekStart, end: weekEnd };
      default:
        return {
          start: new Date(dateCopy.setHours(7, 0, 0, 0)),
          end: new Date(dateCopy.setHours(22, 0, 0, 0))
        };
    }
  }, [viewMode, selectedDate]);

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp?.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Planning / Línea de Tiempo</h2>
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
        <TimelineControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          selectedTeam={selectedTeam}
          onSelectedTeamChange={setSelectedTeam}
          teams={teams || []}
          selectedDepartment={selectedDepartment}
          onSelectedDepartmentChange={setSelectedDepartment}
          departments={departments}
        />
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 overflow-hidden mt-4">
        <TimelineView 
          startDate={startDate} 
          endDate={endDate}
          holidays={holidays}
          vacations={vacations}
          selectedTeam={selectedTeam}
          employees={employees}
          teams={teams}
          teamSchedules={teamSchedules}
          viewMode={viewMode}
          selectedDepartment={selectedDepartment}
        />
      </Card>
    </div>
  );
}
