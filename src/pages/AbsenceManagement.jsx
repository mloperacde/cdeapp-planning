import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppData } from "../components/data/DataProvider";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigationHistory } from "../components/utils/useNavigationHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserX, 
  BarChart3, CalendarDays, FileText, CheckSquare, 
  LayoutDashboard, Settings, Activity 
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { startOfYear } from "date-fns";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import AbsenceDashboard from "../components/employees/AbsenceDashboard";
import AbsenceNotifications from "../components/employees/AbsenceNotifications";
import UnifiedAbsenceManager from "../components/absences/UnifiedAbsenceManager";
import LongAbsenceAlert from "../components/absences/LongAbsenceAlert";
import AbsenceCalendar from "../components/absences/AbsenceCalendar";
import AbsenceApprovalPanel from "../components/absences/AbsenceApprovalPanel";
import VacationPendingBalancePanel from "../components/absences/VacationPendingBalancePanel";
import ResidualDaysManager from "../components/absences/ResidualDaysManager";
import AdvancedReportGenerator from "../components/reports/AdvancedReportGenerator";
import AttendanceAnalyzer from "../components/attendance/AttendanceAnalyzer";
import { calculateGlobalAbsenteeism } from "../components/absences/AbsenteeismCalculator";
import { Button } from "@/components/ui/button";
import AvailabilitySyncMonitor from "../components/hr/AvailabilitySyncMonitor";
export default function AbsenceManagementPage() {
  const { 
    user: currentUser,
    absences = [], 
    employees = [],
    absenceTypes = [],
    vacations = [],
    holidays = []
  } = useAppData();

  const isShiftManager = useMemo(() => {
    // Simplified check - real app would check specific permissions/roles
    return currentUser?.role !== 'admin' && 
           (currentUser?.puesto?.toLowerCase().includes('jefe') || currentUser?.puesto?.toLowerCase().includes('shift'));
  }, [currentUser]);

  // Handle tab state and URL sync
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab(isShiftManager ? "dashboard" : "dashboard");
    }
  }, [location.search, isShiftManager]);

  // Update URL when tab changes
  const handleTabChange = (value) => {
    setActiveTab(value);
    const url = new URL(window.location);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url);
  };

  const filteredAbsences = useMemo(() => {
    return absences.filter(abs => {
      const emp = employees.find(e => e.id === abs.employee_id);
      if (isShiftManager && emp?.departamento !== currentUser?.departamento) return false; // Basic Shift Manager filter
      return true;
    });
  }, [absences, employees, isShiftManager, currentUser]);

  const activeAbsences = filteredAbsences.filter(a => {
    const now = new Date();
    const start = new Date(a.fecha_inicio);
    const end = a.fecha_fin_desconocida ? now : new Date(a.fecha_fin);
    return now >= start && now <= end;
  });

  const departmentsWithActiveAbsences = useMemo(() => {
    const deptSet = new Set();
    activeAbsences.forEach((a) => {
      const emp = employees.find((e) => e.id === a.employee_id);
      if (emp?.departamento) {
        deptSet.add(emp.departamento);
      }
    });
    return Array.from(deptSet);
  }, [activeAbsences, employees]);

  const departmentsWithActiveAbsencesCount = departmentsWithActiveAbsences.length;

  const absenteeismByDept = useMemo(() => {
    const deptStats = {};
    employees.forEach((emp) => {
      if (!emp.departamento || emp.tasa_absentismo == null) return;
      const key = emp.departamento;
      const current = deptStats[key] || { sum: 0, count: 0 };
      current.sum += emp.tasa_absentismo;
      current.count += 1;
      deptStats[key] = current;
    });
    return Object.entries(deptStats)
      .map(([dept, { sum, count }]) => ({
        dept,
        rate: count ? sum / count : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [employees]);

  const topAbsenteeismDept = absenteeismByDept[0];

  const { data: globalAbsenteeism } = useQuery({
    queryKey: ["globalAbsenteeism-dashboard", employees.length, absences.length],
    queryFn: async () => {
      const now = new Date();
      const yearStart = startOfYear(now);
      return calculateGlobalAbsenteeism(yearStart, now, {
        employees,
        absences,
        vacations,
        holidays,
      });
    },
    enabled: employees.length > 0 && absences.length >= 0,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const pendingAbsences = useMemo(
    () => filteredAbsences.filter((a) => a.estado_aprobacion === "Pendiente"),
    [filteredAbsences]
  );

  const getEmployeeName = (employeeId) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp?.nombre || "Desconocido";
  };

  const getAbsenceTypeName = (typeId) => {
    return absenceTypes.find((t) => t.id === typeId)?.nombre || "Sin tipo";
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">

        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <UserX className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
              Gestión Integral de Ausencias
            </h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">
              {isShiftManager ? "Gestión de equipo y reportes de turno" : "Control centralizado de RRHH"}
            </p>
          </div>
          {/* Button moved to UnifiedAbsenceManager inside list tab */}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-4 md:mb-6 h-auto bg-white dark:bg-slate-800/50">
            <TabsTrigger value="dashboard" className="py-2" type="button"><LayoutDashboard className="w-4 h-4 mr-2"/> Dashboard</TabsTrigger>
            <TabsTrigger value="list" className="py-2" type="button"><FileText className="w-4 h-4 mr-2"/> Listado</TabsTrigger>
            
            {!isShiftManager && (
              <>
                <TabsTrigger value="approval" className="py-2" type="button"><CheckSquare className="w-4 h-4 mr-2"/> Aprobaciones</TabsTrigger>
                <TabsTrigger value="calendar" className="py-2" type="button"><CalendarDays className="w-4 h-4 mr-2"/> Calendario</TabsTrigger>
                <TabsTrigger value="analysis" className="py-2" type="button"><Activity className="w-4 h-4 mr-2"/> Análisis & IA</TabsTrigger>
                <TabsTrigger value="config" className="py-2" type="button"><Settings className="w-4 h-4 mr-2"/> Configuración</TabsTrigger>
                <TabsTrigger value="reports" className="py-2" type="button"><BarChart3 className="w-4 h-4 mr-2"/> Informes</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-red-700 font-medium">Ausencias activas</p>
                      <p className="text-2xl font-bold text-red-900">{activeAbsences.length}</p>
                    </div>
                    <UserX className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Departamentos con ausencias</p>
                      <p className="text-2xl font-bold text-blue-900">{departmentsWithActiveAbsencesCount}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-emerald-700 font-medium">Tasa de absentismo global</p>
                      <p className="text-2xl font-bold text-emerald-900">
                        {globalAbsenteeism?.tasaAbsentismoGlobal?.toFixed(2) || "0.00"}%
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-orange-700 font-medium">Tasa por departamento</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {topAbsenteeismDept ? topAbsenteeismDept.rate.toFixed(2) : "0.00"}%
                      </p>
                      {topAbsenteeismDept && (
                        <p className="text-xs text-orange-700 mt-1">
                          Departamento con mayor absentismo: {topAbsenteeismDept.dept}
                        </p>
                      )}
                    </div>
                    <BarChart3 className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {!isShiftManager && (
              <Card className="border-orange-200 bg-orange-50/40">
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                        Bandeja de consolidación
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        Ausencias pendientes de consolidar
                      </p>
                      <p className="text-sm text-slate-600">
                        Otros usuarios han informado ausencias. RRHH debe aprobarlas y consolidarlas en el sistema.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-extrabold text-orange-700">
                        {pendingAbsences.length}
                      </p>
                      <p className="text-xs text-orange-700">
                        pendientes de aprobación
                      </p>
                      <Button
                        size="sm"
                        className="mt-2 bg-orange-600 hover:bg-orange-700"
                        onClick={() => handleTabChange("approval")}
                      >
                        Ir a aprobaciones
                      </Button>
                    </div>
                  </div>
                  {pendingAbsences.length > 0 && (
                    <div className="space-y-2">
                      {pendingAbsences.slice(0, 3).map((absence) => (
                        <div
                          key={absence.id}
                          className="flex items-start justify-between rounded-md border border-orange-200 bg-white/60 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {getEmployeeName(absence.employee_id)}
                            </p>
                            <p className="text-xs text-slate-600">
                              {getAbsenceTypeName(absence.absence_type_id)} ·{" "}
                              {format(new Date(absence.fecha_inicio), "dd/MM", { locale: es })}{" "}
                              -{" "}
                              {absence.fecha_fin_desconocida
                                ? "Sin fecha fin"
                                : format(new Date(absence.fecha_fin), "dd/MM", { locale: es })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {pendingAbsences.length > 3 && (
                        <p className="text-xs text-slate-500">
                          +{pendingAbsences.length - 3} ausencias más pendientes...
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <AvailabilitySyncMonitor employees={employees} absences={absences} />
            
            {isShiftManager ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AbsenceDashboard absences={filteredAbsences} employees={employees} />
                <div className="space-y-6">
                  <AbsenceNotifications absences={filteredAbsences} employees={employees} absenceTypes={absenceTypes} />
                  <LongAbsenceAlert employees={employees} absences={filteredAbsences} />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AbsenceDashboard absences={filteredAbsences} employees={employees} />
                  <AbsenceNotifications absences={filteredAbsences} employees={employees} absenceTypes={absenceTypes} />
                </div>
                <LongAbsenceAlert employees={employees} absences={filteredAbsences} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <UnifiedAbsenceManager 
              sourceContext="absence_page" 
              initialAbsences={absences} 
              initialEmployees={employees}
            />
          </TabsContent>

          <TabsContent value="approval">
            <AbsenceApprovalPanel 
              absences={absences} 
              employees={employees} 
              absenceTypes={absenceTypes} 
              currentUser={currentUser} 
            />
          </TabsContent>

          <TabsContent value="calendar">
            <AbsenceCalendar 
              absences={absences} 
              employees={employees} 
              absenceTypes={absenceTypes} 
            />
          </TabsContent>

          <TabsContent value="analysis">
            <AttendanceAnalyzer />
          </TabsContent>

          <TabsContent value="config">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VacationPendingBalancePanel employees={employees} compact={true} />
                <ResidualDaysManager employees={employees} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <AdvancedReportGenerator />
          </TabsContent>
        </Tabs>

        {/* Form dialog managed by UnifiedAbsenceManager in list tab */}
      </div>
    </div>
  );
}
