import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppData } from "../components/data/DataProvider";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  UserX, CalendarDays, FileText, CheckSquare,
  LayoutDashboard, Settings, AlertTriangle, ClipboardList,
  Brain, RefreshCw, Trash2, Calendar, TrendingDown
} from "lucide-react";

import AbsenceDashboard from "../components/employees/AbsenceDashboard";
import AbsenceCalendar from "../components/absences/AbsenceCalendar";
import AbsenceApprovalPanel from "../components/absences/AbsenceApprovalPanel";
import AbsenceTypeManager from "../components/absences/AbsenceTypeManager";
import VacationAccumulationConfig from "../components/absences/VacationAccumulationConfig";
import VacationPendingBalancePanel from "../components/absences/VacationPendingBalancePanel";
import VacationPendingConsumptionManager from "../components/absences/VacationPendingConsumptionManager";
import UnpaidLeaveTracker from "../components/absences/UnpaidLeaveTracker";
import VacationWorkCompensationManager from "../components/absences/VacationWorkCompensationManager";
import AttendanceAnalyzer from "../components/attendance/AttendanceAnalyzer";
import AbsenceValidationInbox from "../components/absences/AbsenceValidationInbox";
import FormalAbsenceManager from "../components/absences/FormalAbsenceManager";

export default function AbsenceManagementPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const {
    user: currentUser,
    absences = [],
    employees = [],
    absenceTypes = [],
    isAdmin = false
  } = useAppData();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [initialAbsenceEmployeeId, setInitialAbsenceEmployeeId] = useState(null);
  const [initialAbsenceEmployeeName, setInitialAbsenceEmployeeName] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const employeeId = params.get('employeeId');
    const employeeName = params.get('employeeName');
    if (tab) setActiveTab(tab);
    if (employeeId) {
      setInitialAbsenceEmployeeId(employeeId);
      setInitialAbsenceEmployeeName(employeeName || null);
      setActiveTab('formal');
    }
  }, [location.search]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    const url = new URL(window.location);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['absences'] });
    queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
  };

  const handleCleanupHistorical = async () => {
    setCleanupLoading(true);
    try {
      const result = await base44.functions.invoke('cleanupHistoricalData', {});
      queryClient.invalidateQueries();
      setShowCleanupDialog(false);
      alert(`Histórico limpiado: ${result.data.deletionStats.absences} ausencias, ${result.data.deletionStats.attendanceRecords} registros eliminados`);
    } catch (error) {
      alert('Error al limpiar histórico: ' + error.message);
    } finally {
      setCleanupLoading(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const autoAbsencesPending = absences.filter(abs => {
      const isAuto = abs.motivo === 'Ausencia no comunicada - detección automática' ||
        (abs.notas && (abs.notas.startsWith('[SISTEMA]') || abs.notas.startsWith('[shiftAudit]')));
      return isAuto && abs.estado_aprobacion === 'Pendiente';
    });

    const formalActive = absences.filter(abs => {
      const isAuto = abs.motivo === 'Ausencia no comunicada - detección automática' ||
        (abs.notas && (abs.notas.startsWith('[SISTEMA]') || abs.notas.startsWith('[shiftAudit]')));
      if (isAuto && abs.estado_aprobacion === 'Pendiente') return false;
      if (abs.estado_aprobacion === 'Rechazada' || abs.estado_aprobacion === 'Cancelada') return false;
      const start = new Date(abs.fecha_inicio);
      const end = abs.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(abs.fecha_fin || '2099-12-31');
      return now >= start && now <= end;
    });

    const pendingApproval = absences.filter(abs => {
      const isAuto = abs.motivo === 'Ausencia no comunicada - detección automática' ||
        (abs.notas && (abs.notas.startsWith('[SISTEMA]') || abs.notas.startsWith('[shiftAudit]')));
      return !isAuto && abs.estado_aprobacion === 'Pendiente';
    });

    return {
      autoPending: autoAbsencesPending.length,
      formalActive: formalActive.length,
      pendingApproval: pendingApproval.length,
    };
  }, [absences]);

  const tabs = [
    { value: "dashboard", label: "Resumen", icon: LayoutDashboard },
    { value: "validation", label: "Detección", icon: AlertTriangle, count: stats.autoPending, countColor: "bg-amber-500" },
    { value: "formal", label: "Registro", icon: ClipboardList },
    { value: "approval", label: "Aprobaciones", icon: CheckSquare, count: stats.pendingApproval, countColor: "bg-orange-500" },
    { value: "calendar", label: "Calendario", icon: Calendar },
    { value: "types-config", label: "Tipos", icon: Settings },
    { value: "config", label: "Vacaciones", icon: TrendingDown },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UserX className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Gestión de Ausencias</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Control integral · RRHH</p>
            </div>
          </div>

          {/* KPIs rápidos */}
          <div className="flex items-center gap-2 flex-wrap">
            {stats.autoPending > 0 && (
              <button
                onClick={() => handleTabChange('validation')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-700">Detección</span>
                <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0 h-5">{stats.autoPending}</Badge>
              </button>
            )}
            {stats.formalActive > 0 && (
              <button
                onClick={() => handleTabChange('formal')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Activas</span>
                <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0 h-5">{stats.formalActive}</Badge>
              </button>
            )}
            {stats.pendingApproval > 0 && (
              <button
                onClick={() => handleTabChange('approval')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-xs font-medium text-orange-700">Aprobación</span>
                <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0 h-5">{stats.pendingApproval}</Badge>
              </button>
            )}

            <div className="flex gap-1 ml-1">
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={handleRefresh}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-purple-700 hover:bg-purple-50">
                    <Brain className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Análisis IA</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl h-[85vh] overflow-y-auto">
                  <AttendanceAnalyzer />
                </DialogContent>
              </Dialog>
              {isAdmin && (
                <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Limpiar</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <div className="space-y-4 pt-2">
                      <h2 className="text-lg font-bold text-slate-900">⚠️ Limpiar Histórico Completo</h2>
                      <p className="text-sm text-slate-600">Eliminar permanentemente todos los registros de ausencias, asistencia y logs. Esta acción no se puede deshacer.</p>
                      <div className="flex gap-3 justify-end pt-2">
                        <Button variant="outline" onClick={() => setShowCleanupDialog(false)}>Cancelar</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCleanupHistorical} disabled={cleanupLoading}>
                          {cleanupLoading ? 'Limpiando...' : 'Confirmar y Eliminar'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 p-3 md:p-5">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col gap-4">
          <TabsList className="flex w-full flex-nowrap overflow-x-auto h-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 gap-0.5 shadow-sm">
            {tabs.map(({ value, label, icon: Icon, count, countColor }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-1 min-w-fit py-2 px-2 text-xs sm:text-sm flex items-center justify-center gap-1.5 rounded-lg data-[state=active]:shadow-sm"
                type="button"
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${value === 'validation' && stats.autoPending > 0 ? 'text-amber-500' : ''}`} />
                <span className="hidden xs:inline sm:inline">{label}</span>
                {count > 0 && (
                  <Badge className={`${countColor} text-white text-[10px] px-1 py-0 h-4 ml-0.5 flex-shrink-0`}>{count}</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <AbsenceDashboard absences={absences} employees={employees} />
          </TabsContent>

          {/* Bandeja de detección */}
          <TabsContent value="validation">
            <div className="space-y-4">
              {stats.autoPending > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        {stats.autoPending} ausencias detectadas automáticamente requieren revisión
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                        Clasifica cada una como <strong>Justificada</strong> (ausencia formal) o <strong>Falsa alarma</strong> (error de fichaje).
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <AbsenceValidationInbox employees={employees} absenceTypes={absenceTypes} />
            </div>
          </TabsContent>

          {/* Registro formal */}
          <TabsContent value="formal">
            <FormalAbsenceManager
              employees={employees}
              absenceTypes={absenceTypes}
              initialEmployeeId={initialAbsenceEmployeeId}
              initialEmployeeName={initialAbsenceEmployeeName}
            />
          </TabsContent>

          {/* Aprobaciones */}
          <TabsContent value="approval">
            <AbsenceApprovalPanel
              employees={employees}
              absenceTypes={absenceTypes}
              currentUser={currentUser}
            />
          </TabsContent>

          {/* Calendario */}
          <TabsContent value="calendar">
            <AbsenceCalendar
              absences={absences}
              employees={employees}
              absenceTypes={absenceTypes}
            />
          </TabsContent>

          {/* Tipos de ausencia */}
          <TabsContent value="types-config">
            <div className="space-y-6">
              <Tabs defaultValue="types">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="types">Tipos de Ausencia</TabsTrigger>
                  <TabsTrigger value="vacation-rules">Reglas de Acumulación</TabsTrigger>
                </TabsList>
                <TabsContent value="types" className="mt-4">
                  <AbsenceTypeManager />
                </TabsContent>
                <TabsContent value="vacation-rules" className="mt-4">
                  <VacationAccumulationConfig />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          {/* Vacaciones */}
          <TabsContent value="config">
            <div className="space-y-6">
              <VacationPendingBalancePanel employees={employees} />
              <VacationWorkCompensationManager employees={employees} />
              <VacationPendingConsumptionManager employees={employees} />
              <UnpaidLeaveTracker employees={employees} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}