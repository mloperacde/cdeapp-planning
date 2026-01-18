import React, { useState, useMemo } from "react";
import { useAppData } from "../components/data/DataProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserX, 
  BarChart3, CalendarDays, FileText, CheckSquare, 
  LayoutDashboard, Settings, Activity 
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { startOfMonth, eachDayOfInterval } from "date-fns";
import { getAvailability } from "@/lib/domain/planning";

import AbsenceDashboard from "../components/employees/AbsenceDashboard";
import AbsenceNotifications from "../components/employees/AbsenceNotifications";
import UnifiedAbsenceManager from "../components/absences/UnifiedAbsenceManager";
import AbsenceCalendar from "../components/absences/AbsenceCalendar";
import AbsenceApprovalPanel from "../components/absences/AbsenceApprovalPanel";
import VacationPendingBalancePanel from "../components/absences/VacationPendingBalancePanel";
import VacationPendingConsumptionManager from "../components/absences/VacationPendingConsumptionManager";
import UnpaidLeaveTracker from "../components/absences/UnpaidLeaveTracker";
import AdvancedReportGenerator from "../components/reports/AdvancedReportGenerator";
import AttendanceAnalyzer from "../components/attendance/AttendanceAnalyzer";

export default function AbsenceManagementPage() {
  const { 
    user: currentUser,
    absences = [], 
    employees = [],
    absenceTypes = []
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

  const scopedEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (isShiftManager && emp.departamento !== currentUser?.departamento) return false;
      return true;
    });
  }, [employees, isShiftManager, currentUser]);

  const activeEmployees = useMemo(() => {
    return scopedEmployees.filter(
      (emp) => emp.estado_empleado === "Alta" && emp.incluir_en_planning !== false
    );
  }, [scopedEmployees]);

  const todayISO = useMemo(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }, []);

  const dailyGlobalAbsenteeism = useMemo(() => {
    if (activeEmployees.length === 0) {
      return { rate: 0, total: 0, absent: 0 };
    }
    const result = getAvailability(activeEmployees, filteredAbsences, todayISO);
    const rate =
      result.totalEmpleados > 0
        ? (result.ausentes / result.totalEmpleados) * 100
        : 0;
    return {
      rate,
      total: result.totalEmpleados,
      absent: result.ausentes,
    };
  }, [activeEmployees, filteredAbsences, todayISO]);

  const monthlyGlobalAbsenteeism = useMemo(() => {
    if (activeEmployees.length === 0) {
      return { rate: 0 };
    }
    const now = new Date();
    const monthStart = startOfMonth(now);
    const days = eachDayOfInterval({ start: monthStart, end: now });
    if (days.length === 0) {
      return { rate: 0 };
    }
    let sumRates = 0;
    days.forEach((day) => {
      const dateISO = day.toISOString().slice(0, 10);
      const result = getAvailability(activeEmployees, filteredAbsences, dateISO);
      const rate =
        result.totalEmpleados > 0
          ? (result.ausentes / result.totalEmpleados) * 100
          : 0;
      sumRates += rate;
    });
    const avgRate = sumRates / days.length;
    return { rate: avgRate };
  }, [activeEmployees, filteredAbsences]);

  const dailyDeptAbsenteeism = useMemo(() => {
    const deptRates = [];
    const deptSet = new Set(
      activeEmployees
        .map((emp) => emp.departamento)
        .filter((dept) => !!dept)
    );
    deptSet.forEach((dept) => {
      const emps = activeEmployees.filter((emp) => emp.departamento === dept);
      if (emps.length === 0) return;
      const result = getAvailability(emps, filteredAbsences, todayISO);
      const rate =
        result.totalEmpleados > 0
          ? (result.ausentes / result.totalEmpleados) * 100
          : 0;
      deptRates.push({ dept, rate });
    });
    deptRates.sort((a, b) => b.rate - a.rate);
    return deptRates;
  }, [activeEmployees, filteredAbsences, todayISO]);

  const topDeptToday = dailyDeptAbsenteeism[0];

  const monthlyDeptAbsenteeism = useMemo(() => {
    const deptRates = [];
    const deptSet = new Set(
      activeEmployees
        .map((emp) => emp.departamento)
        .filter((dept) => !!dept)
    );
    if (deptSet.size === 0) return [];
    const now = new Date();
    const monthStart = startOfMonth(now);
    const days = eachDayOfInterval({ start: monthStart, end: now });
    if (days.length === 0) return [];
    deptSet.forEach((dept) => {
      const emps = activeEmployees.filter((emp) => emp.departamento === dept);
      if (emps.length === 0) return;
      let sumRates = 0;
      days.forEach((day) => {
        const dateISO = day.toISOString().slice(0, 10);
        const result = getAvailability(emps, filteredAbsences, dateISO);
        const rate =
          result.totalEmpleados > 0
            ? (result.ausentes / result.totalEmpleados) * 100
            : 0;
        sumRates += rate;
      });
      const avgRate = sumRates / days.length;
      deptRates.push({ dept, rate: avgRate });
    });
    deptRates.sort((a, b) => b.rate - a.rate);
    return deptRates;
  }, [activeEmployees, filteredAbsences]);

  const topDeptMonth = monthlyDeptAbsenteeism[0];

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
                <TabsTrigger value="config" className="py-2" type="button"><Settings className="w-4 h-4 mr-2"/> Protección de vacaciones</TabsTrigger>
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
                      <p className="text-xs text-emerald-700 font-medium">Absentismo global</p>
                      <p className="text-2xl font-bold text-emerald-900">
                        {dailyGlobalAbsenteeism.rate.toFixed(2)}%
                      </p>
                      <p className="text-xs text-emerald-700 mt-1">
                        Mes actual: {monthlyGlobalAbsenteeism.rate.toFixed(2)}%
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
                      <p className="text-xs text-orange-700 font-medium">Absentismo por departamento</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {topDeptToday ? topDeptToday.rate.toFixed(2) : "0.00"}%
                      </p>
                      {topDeptToday && (
                        <p className="text-xs text-orange-700 mt-1">
                          Hoy: {topDeptToday.dept}
                        </p>
                      )}
                      {topDeptMonth && (
                        <p className="text-xs text-orange-700">
                          Mes: {topDeptMonth.dept} ({topDeptMonth.rate.toFixed(2)}%)
                        </p>
                      )}
                    </div>
                    <BarChart3 className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {isShiftManager ? (
              <div className="space-y-6">
                <div className="w-full">
                  <AbsenceNotifications absences={filteredAbsences} employees={employees} absenceTypes={absenceTypes} />
                </div>
                <AbsenceDashboard absences={filteredAbsences} employees={employees} />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-full">
                  <AbsenceNotifications absences={filteredAbsences} employees={employees} absenceTypes={absenceTypes} />
                </div>
                <AbsenceDashboard absences={filteredAbsences} employees={employees} />
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
              <VacationPendingBalancePanel employees={employees} />
              <VacationPendingConsumptionManager employees={employees} />
              <UnpaidLeaveTracker employees={employees} />
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
