import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar as CalendarIcon, Clock, Users, AlertCircle } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MobilePlanning() {
  const [selectedDate, _setSelectedDate] = useState(new Date());

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employee } = useQuery({
    queryKey: ['currentEmployee', user?.email],
    queryFn: async () => {
      const emps = await base44.entities.EmployeeMasterDatabase.list();
      return emps.find(e => e.email === user?.email);
    },
    enabled: !!user?.email,
  });

  const { data: dailyPlannings = [] } = useQuery({
    queryKey: ['myDailyPlannings', employee?.id],
    queryFn: () => base44.entities.DailyProductionPlanning.list('-fecha', 100),
    enabled: !!employee?.id,
  });

  const { data: machineAssignments = [] } = useQuery({
    queryKey: ['myMachineAssignments', employee?.id],
    queryFn: () => base44.entities.MachineAssignment.list(),
    enabled: !!employee?.id,
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      return (Array.isArray(data) ? data : [])
        .map(m => ({
          id: m.id,
          nombre: m.nombre || '',
          codigo: m.codigo_maquina || m.codigo || '',
          orden: m.orden_visualizacion || 999
        }))
        .sort((a, b) => (a.orden || 999) - (b.orden || 999));
    },
  });

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const myPlannings = useMemo(() => {
    if (!employee?.id) return [];
    
    return dailyPlannings.filter(p => {
      if (!p.operarios || !Array.isArray(p.operarios)) return false;
      return p.operarios.some(op => op.id === employee.id);
    });
  }, [dailyPlannings, employee?.id]);

  const myMachineAssignments = useMemo(() => {
    if (!employee?.id) return [];
    
    return machineAssignments.filter(ma => {
      const roles = [
        ma.responsable_linea, 
        ma.segunda_linea,
        ma.operador_1,
        ma.operador_2,
        ma.operador_3,
        ma.operador_4
      ].flat();
      return roles.includes(employee.id);
    });
  }, [machineAssignments, employee?.id]);

  const todayPlannings = myPlannings.filter(p => 
    isSameDay(new Date(p.fecha), new Date())
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("MobileHome")}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mi Planificación</h1>
        </div>

        {/* Today's Summary */}
        <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-purple-600" />
              Hoy - {format(new Date(), "d 'de' MMMM", { locale: es })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {todayPlannings.length === 0 ? (
              <div className="text-center py-6">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No hay planificación para hoy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayPlannings.map(planning => {
                  const machine = machines.find(m => m.id === planning.machine_id);
                  return (
                    <div key={planning.id} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {machine?.nombre || 'Máquina'}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Orden: {planning.work_order_number || 'N/A'}
                          </p>
                        </div>
                        <Badge className={
                          planning.estado === "Completado" ? "bg-green-600" :
                          planning.estado === "En Curso" ? "bg-blue-600" :
                          "bg-slate-600"
                        }>
                          {planning.estado}
                        </Badge>
                      </div>
                      {planning.turno && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <Clock className="w-3 h-3" />
                          Turno: {planning.turno}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Week View */}
        <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
            <CardTitle className="text-lg">Esta Semana</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {weekDays.map(day => {
                const dayPlannings = myPlannings.filter(p => 
                  isSameDay(new Date(p.fecha), day)
                );
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-3 rounded-lg border ${
                      isToday 
                        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700' 
                        : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className={`font-medium ${isToday ? 'text-purple-900 dark:text-purple-100' : 'text-slate-900 dark:text-slate-100'}`}>
                          {format(day, "EEEE d", { locale: es })}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {dayPlannings.length} {dayPlannings.length === 1 ? 'orden' : 'órdenes'}
                        </p>
                      </div>
                      {dayPlannings.length > 0 && (
                        <Badge variant="outline">
                          {dayPlannings.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* My Assigned Machines */}
        <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Mis Máquinas Asignadas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {myMachineAssignments.length === 0 ? (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
                No tienes máquinas asignadas actualmente
              </p>
            ) : (
              <div className="space-y-2">
                {myMachineAssignments.map(ma => {
                  const machine = machines.find(m => m.id === ma.machine_id);
                  return (
                    <div key={ma.id} className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {machine?.nombre || 'Máquina'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Equipo: {ma.team_key?.replace('team_', 'Equipo ')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
