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
  UserX, BarChart3, CalendarDays, FileText, CheckSquare,
  LayoutDashboard, Settings, AlertTriangle, ClipboardList,
  Brain, RefreshCw, Trash2, Calendar
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

  // Métricas rápidas para el header
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

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header compacto */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
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
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => handleTabChange('validation')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-700">Bandeja detección</span>
              {stats.autoPending > 0 && (
                <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0 h-5">{stats.autoPending}</Badge>
              )}
            </button>
            <button
              onClick={() => handleTabChange('formal')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Ausencias activas</span>
              <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0 h-5">{stats.formalActive}</Badge>
            </button>
            {stats.pendingApproval > 0 && (
              <button
                onClick={() => handleTabChange('approval')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors"
              >
                <CheckSquare className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-medium text-orange-700">Pendientes aprobación</span>
                <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0 h-5">{stats.pendingApproval}</Badge>
              </button>
            )}

            <div className="flex gap-1.5 ml-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleRefresh}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Actualizar
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-purple-700 hover:text-purple-800 hover:bg-purple-50">
                    <Brain className="w-3.5 h-3.5 mr-1" />
                    Análisis IA
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl h-[85vh] overflow-y-auto">
                  <AttendanceAnalyzer />
                </DialogContent>
              </Dialog>
              {isAdmin && (
                <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Limpiar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <div className="space-y-4">
                      <h2 className="text-lg font-bold">⚠️ Limpiar Histórico Completo</h2>
                      <p className="text-sm text-slate-600">Eliminar permanentemente todos los registros de ausencias, asistencia y logs. Esta acción no se puede deshacer.</p>
                      <div className="flex gap-3 justify-end pt-2">
                        <Button variant="outline" onClick={() => setShowCleanupDialog(false)}>Cancelar</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCleanupHistorical} disabled={cleanupLoading}>
                          {cleanupLoading ? 'Limpiando...' : 'Confirmar'}
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
      <div className="flex-1 p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col gap-5">
          <TabsList className="flex w-full flex-nowrap overflow-x-auto h-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 gap-0.5">
            <TabsTrigger value="dashboard" className="flex-1 py-2 text-xs sm:text-sm" type="button">
              <LayoutDashboard className="w-4 h-4 mr-1.5" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex-1 py-2 text-xs sm:text-sm relative" type="button">
              <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-500" />
              Detección
              {stats.autoPending > 0 && (
                <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0 h-4 ml-1">{stats.autoPending}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="formal" className="flex-1 py-2 text-xs sm:text-sm" type="button">
              <ClipboardList className="w-4 h-4 mr-1.5" />
              Registro Formal
            </TabsTrigger>
            <TabsTrigger value="approval" className="flex-1 py-2 text-xs sm:text-sm" type="button">
              <CheckSquare className="w-4 h-4 mr-1.5" />
              Aprobaciones
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 py-2 text-xs sm:text-sm" type="button">
              <Calendar className="w-4 h-4 mr-1.5" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="types-config" className="flex-1 py-2 text-xs sm:text-sm" type="button">
              <Settings className="w-4 h-4 mr-1.5" />
              Tipos
            </TabsTrigger>
            <TabsTrigger value="config" className="flex-1 py-2 text-xs sm:text-sm" type="button">
              <Settings className="w-4 h-4 mr-1.5" />
              Vacaciones
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <AbsenceDashboard absences={absences} employees={employees} />
          </TabsContent>

          {/* Bandeja de validación — ausencias auto-detectadas */}
          <TabsContent value="validation">
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Ausencias detectadas automáticamente por Control de Presencia</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      El sistema ha detectado empleados que no ficharon entrada en su turno. Cada registro debe ser clasificado: 
                      <strong> Justificar</strong> (convertir en ausencia formal con tipo y motivo) o <strong>Falsa alarma</strong> (el empleado sí estaba presente, error de fichaje).
                    </p>
                  </div>
                </div>
              </div>
              <AbsenceValidationInbox employees={employees} absenceTypes={absenceTypes} />
            </div>
          </TabsContent>

          {/* Registro formal de ausencias */}
          <TabsContent value="formal">
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ClipboardList className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Registro Formal de Ausencias</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Ausencias comunicadas previamente (bajas médicas, permisos, vacaciones, etc.) y ausencias auto-detectadas ya validadas. 
                      Usa <strong>Nueva Ausencia</strong> para registrar ausencias comunicadas por el empleado o su responsable.
                    </p>
                  </div>
                </div>
              </div>
              <FormalAbsenceManager
                employees={employees}
                absenceTypes={absenceTypes}
                initialEmployeeId={initialAbsenceEmployeeId}
                initialEmployeeName={initialAbsenceEmployeeName}
              />
            </div>
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
                  <TabsTrigger value="vacation-rules">Reglas de Vacaciones</TabsTrigger>
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

          {/* Protección vacaciones */}
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