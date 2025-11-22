import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  AlertCircle, 
  Calendar, 
  Cake, 
  Clock,
  FileText,
  ChevronRight
} from "lucide-react";
import { format, differenceInDays, addDays, isSameDay, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PendingTasksPanel({ 
  masterEmployees = [], 
  onboardingProcesses = [],
  absences = []
}) {
  // Tareas de onboarding pendientes
  const pendingOnboarding = useMemo(() => {
    return onboardingProcesses
      .filter(p => p.estado !== 'Completado' && p.estado !== 'Cancelado')
      .map(p => {
        const employee = masterEmployees.find(e => e.id === p.employee_id);
        return {
          ...p,
          employeeName: employee?.nombre || 'Desconocido',
          progress: p.progreso_porcentaje || 0
        };
      })
      .sort((a, b) => a.progress - b.progress)
      .slice(0, 5);
  }, [onboardingProcesses, masterEmployees]);

  // Contratos próximos a expirar (30 días)
  const expiringContracts = useMemo(() => {
    const today = new Date();
    const futureDate = addDays(today, 30);
    
    return masterEmployees
      .filter(emp => {
        if (!emp.fecha_fin_contrato || emp.estado_empleado !== 'Alta') return false;
        try {
          const endDate = new Date(emp.fecha_fin_contrato);
          if (isNaN(endDate.getTime())) return false;
          return endDate >= today && endDate <= futureDate;
        } catch {
          return false;
        }
      })
      .map(emp => {
        const endDate = new Date(emp.fecha_fin_contrato);
        const daysRemaining = differenceInDays(endDate, today);
        return {
          ...emp,
          daysRemaining,
          endDate
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);
  }, [masterEmployees]);

  // Cumpleaños próximos (próximos 30 días)
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const next30Days = addDays(today, 30);
    
    return masterEmployees
      .filter(emp => {
        if (!emp.fecha_nacimiento || emp.estado_empleado !== 'Alta') return false;
        try {
          const birthDate = new Date(emp.fecha_nacimiento);
          if (isNaN(birthDate.getTime())) return false;
          
          // Crear fecha de cumpleaños de este año
          let thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
          
          // Si ya pasó este año, usar el del próximo año
          if (thisYearBirthday < today) {
            thisYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
          }
          
          return thisYearBirthday <= next30Days;
        } catch {
          return false;
        }
      })
      .map(emp => {
        const birthDate = new Date(emp.fecha_nacimiento);
        let thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        
        if (thisYearBirthday < today) {
          thisYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
        }
        
        const daysUntil = differenceInDays(thisYearBirthday, today);
        const age = thisYearBirthday.getFullYear() - birthDate.getFullYear();
        
        return {
          ...emp,
          daysUntil,
          age,
          birthDate: thisYearBirthday,
          isToday: isSameDay(thisYearBirthday, today)
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [masterEmployees]);

  // Aniversarios laborales próximos (próximos 30 días)
  const upcomingAnniversaries = useMemo(() => {
    const today = new Date();
    const next30Days = addDays(today, 30);
    
    return masterEmployees
      .filter(emp => {
        if (!emp.fecha_alta || emp.estado_empleado !== 'Alta') return false;
        try {
          const startDate = new Date(emp.fecha_alta);
          if (isNaN(startDate.getTime())) return false;
          
          // Crear fecha de aniversario de este año
          let thisYearAnniversary = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());
          
          // Si ya pasó este año, usar el del próximo año
          if (thisYearAnniversary < today) {
            thisYearAnniversary = new Date(today.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
          }
          
          // Calcular años trabajados correctamente
          const yearsWorked = thisYearAnniversary.getFullYear() - startDate.getFullYear();
          if (yearsWorked < 1) return false;
          
          return thisYearAnniversary <= next30Days;
        } catch {
          return false;
        }
      })
      .map(emp => {
        const startDate = new Date(emp.fecha_alta);
        let thisYearAnniversary = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());
        
        if (thisYearAnniversary < today) {
          thisYearAnniversary = new Date(today.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
        }
        
        const daysUntil = differenceInDays(thisYearAnniversary, today);
        const yearsWorked = thisYearAnniversary.getFullYear() - startDate.getFullYear();
        
        return {
          ...emp,
          daysUntil,
          yearsWorked,
          anniversaryDate: thisYearAnniversary,
          isToday: isSameDay(thisYearAnniversary, today)
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [masterEmployees]);

  const totalPendingTasks = pendingOnboarding.length + expiringContracts.length;

  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 dark:text-slate-100">
            <ClipboardList className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Procesos Pendientes
            {totalPendingTasks > 0 && (
              <Badge className="bg-purple-600 dark:bg-purple-700">{totalPendingTasks}</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Tareas de Onboarding Pendientes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Onboarding en Proceso
              {pendingOnboarding.length > 0 && (
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  {pendingOnboarding.length}
                </Badge>
              )}
            </h3>
            <Link to={createPageUrl("EmployeeOnboarding")}>
              <Button variant="ghost" size="sm">
                Ver todos <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          
          {pendingOnboarding.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              No hay procesos de onboarding pendientes
            </p>
          ) : (
            <div className="space-y-2">
              {pendingOnboarding.map((process) => (
                <div key={process.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">{process.employeeName}</p>
                      <p className="text-xs text-slate-600">{process.puesto || 'Sin puesto'}</p>
                    </div>
                    <Badge className={
                      process.progress < 30 ? 'bg-red-600' :
                      process.progress < 70 ? 'bg-amber-600' :
                      'bg-green-600'
                    }>
                      {process.progress}%
                    </Badge>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${process.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contratos Próximos a Expirar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
              Contratos por Vencer
              {expiringContracts.length > 0 && (
                <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                  {expiringContracts.length}
                </Badge>
              )}
            </h3>
          </div>
          
          {expiringContracts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              No hay contratos próximos a vencer en los próximos 30 días
            </p>
          ) : (
            <div className="space-y-2">
              {expiringContracts.map((emp) => (
                <div key={emp.id} className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{emp.nombre}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {emp.tipo_contrato || 'Contrato indefinido'} • {emp.departamento || 'Sin departamento'}
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Vence: {(() => {
                          try {
                            if (!emp.endDate || isNaN(emp.endDate.getTime())) return 'Fecha no válida';
                            return format(emp.endDate, "d 'de' MMMM", { locale: es });
                          } catch {
                            return 'Fecha no válida';
                          }
                        })()}
                      </p>
                    </div>
                    <Badge className={
                      emp.daysRemaining <= 7 ? 'bg-red-600' :
                      emp.daysRemaining <= 15 ? 'bg-orange-600' :
                      'bg-amber-600'
                    }>
                      {emp.daysRemaining} {emp.daysRemaining === 1 ? 'día' : 'días'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cumpleaños Próximos */}
        {upcomingBirthdays.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Cake className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                Cumpleaños Próximos
                <Badge variant="outline" className="bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800">
                  {upcomingBirthdays.length}
                </Badge>
              </h3>
            </div>
            
            <div className="space-y-2">
              {upcomingBirthdays.map((emp) => (
                <div key={emp.id} className={`p-3 rounded-lg border ${
                  emp.isToday 
                    ? 'bg-pink-100 dark:bg-pink-950/30 border-pink-300 dark:border-pink-800' 
                    : 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Cake className={`w-5 h-5 ${emp.isToday ? 'text-pink-600 dark:text-pink-400' : 'text-pink-500 dark:text-pink-400'}`} />
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{emp.nombre}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {emp.isToday ? '¡Hoy cumple años!' : `En ${emp.daysUntil} ${emp.daysUntil === 1 ? 'día' : 'días'}`} • {emp.age} años
                        </p>
                      </div>
                    </div>
                    {emp.isToday && (
                      <Badge className="bg-pink-600">¡HOY!</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aniversarios Laborales Próximos */}
        {upcomingAnniversaries.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Aniversarios Laborales
                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                  {upcomingAnniversaries.length}
                </Badge>
              </h3>
            </div>
            
            <div className="space-y-2">
              {upcomingAnniversaries.map((emp) => (
                <div key={emp.id} className={`p-3 rounded-lg border ${
                  emp.isToday 
                    ? 'bg-emerald-100 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
                    : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className={`w-5 h-5 ${emp.isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-500 dark:text-emerald-400'}`} />
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{emp.nombre}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {emp.isToday ? '¡Hoy celebra!' : `En ${emp.daysUntil} ${emp.daysUntil === 1 ? 'día' : 'días'}`} • {emp.yearsWorked} {emp.yearsWorked === 1 ? 'año' : 'años'} en la empresa
                        </p>
                      </div>
                    </div>
                    {emp.isToday && (
                      <Badge className="bg-emerald-600">¡HOY!</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mensaje si no hay nada pendiente */}
        {totalPendingTasks === 0 && upcomingBirthdays.length === 0 && upcomingAnniversaries.length === 0 && (
          <div className="text-center py-8">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Todo al día</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">No hay tareas pendientes ni eventos próximos</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}