/**
 * PresenceAbsenceHub - Módulo central de Control de Presencia y Gestión de Ausencias
 * Arquitectura profesional con navegación clara y sin duplicidades.
 */
import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppData } from "../components/data/DataProvider";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "../components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  LayoutDashboard, UserX, Clock, BarChart3, Settings,
  Radio, Radar, CalendarDays, FileText, CheckSquare,
  Coffee, LogIn, Calendar, Cog, Activity, Trash2, RefreshCw
} from "lucide-react";

// Módulos de presencia
import PresenceOverviewDashboard from "../components/presence/PresenceOverviewDashboard";
import DailyAttendanceView from "../components/presence/DailyAttendanceView";
import AutomationStatusPanel from "../components/presence/AutomationStatusPanel";

// Módulos de ausencias
import UnifiedAbsenceManager from "../components/absences/UnifiedAbsenceManager";
import AbsenceApprovalPanel from "../components/absences/AbsenceApprovalPanel";
import AbsenceCalendar from "../components/absences/AbsenceCalendar";
import AbsenceHistoryView from "../components/absences/AbsenceHistoryView";
import AbsenceTypeManager from "../components/absences/AbsenceTypeManager";
import VacationAccumulationConfig from "../components/absences/VacationAccumulationConfig";
import VacationPendingBalancePanel from "../components/absences/VacationPendingBalancePanel";
import UnpaidLeaveTracker from "../components/absences/UnpaidLeaveTracker";

// Módulos de presencia (paneles avanzados)
import PresenceMonitorPanel from "../components/absences/PresenceMonitorPanel";
import RealTimeAvailabilityPanel from "../components/absences/RealTimeAvailabilityPanel";
import PresenceDashboard from "../components/attendance/PresenceDashboard";
import BreakAnalysis from "../components/attendance/BreakAnalysis";

// Informes
import AbsenteeismReport from "../components/attendance/AbsenteeismReport";
import AdvancedReportGenerator from "../components/reports/AdvancedReportGenerator";
import AttendanceAnalyzer from "../components/attendance/AttendanceAnalyzer";

// ── Estructura de navegación ────────────────────────────────────────────────
const NAV_STRUCTURE = [
  {
    id: "overview",
    label: "Resumen",
    icon: LayoutDashboard,
    description: "Vista general del día",
  },
  {
    id: "presencia",
    label: "Presencia",
    icon: Clock,
    description: "Control de presencia",
    children: [
      { id: "realtime",  label: "Tiempo real",       icon: Radio },
      { id: "monitor",   label: "Monitor de turno",  icon: Radar },
      { id: "daily",     label: "Marcajes del día",  icon: LogIn },
      { id: "breaks",    label: "Pausas",            icon: Coffee },
      { id: "automation",label: "Automatización",    icon: Cog },
    ],
  },
  {
    id: "ausencias",
    label: "Ausencias",
    icon: UserX,
    description: "Gestión de ausencias",
    children: [
      { id: "list",     label: "Gestión activa",    icon: FileText },
      { id: "approval", label: "Aprobaciones",      icon: CheckSquare },
      { id: "calendar", label: "Calendario",        icon: CalendarDays },
      { id: "history",  label: "Histórico",         icon: Calendar },
    ],
  },
  {
    id: "informes",
    label: "Informes",
    icon: BarChart3,
    description: "Análisis y reportes",
    children: [
      { id: "absenteeism", label: "Absentismo",     icon: BarChart3 },
      { id: "advanced",    label: "Informes avanz.", icon: FileText },
      { id: "ai",          label: "Análisis IA",    icon: Activity },
    ],
  },
  {
    id: "config",
    label: "Configuración",
    icon: Settings,
    description: "Tipos y reglas",
    children: [
      { id: "types",    label: "Tipos ausencia",    icon: FileText },
      { id: "vacation", label: "Vacaciones",        icon: CalendarDays },
      { id: "unpaid",   label: "Excedencias",       icon: UserX },
    ],
  },
];

// ── Tab nav principal ─────────────────────────────────────────────────────────
function MainNav({ activeSection, onSelect, pendingBadge }) {
  return (
    <div className="flex overflow-x-auto scrollbar-hide gap-0 -mx-4 px-4 border-t border-slate-100 dark:border-slate-800 mt-1">
      {NAV_STRUCTURE.map(nav => {
        const Icon = nav.icon;
        const isActive = activeSection === nav.id;
        const hasBadge = nav.id === "ausencias" && pendingBadge > 0;
        return (
          <button
            key={nav.id}
            onClick={() => onSelect(nav.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
              isActive
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Icon className="w-4 h-4" />
            {nav.label}
            {hasBadge && (
              <span className="ml-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {pendingBadge > 9 ? "9+" : pendingBadge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Sub-nav secundaria ────────────────────────────────────────────────────────
function SubNav({ items, active, onSelect }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function PresenceAbsenceHub() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const {
    user: currentUser,
    absences = [],
    employees = [],
    absenceTypes = [],
    isAdmin = false
  } = useAppData();

  const [activeSection, setActiveSection] = useState("overview");
  const [activeSub, setActiveSub] = useState({});
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);

  // Sync desde URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) setActiveSection(tab);
  }, [location.search]);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    const url = new URL(window.location);
    url.searchParams.set("tab", section);
    window.history.pushState({}, "", url);
    // Si la sección tiene hijos y no hay sub activo, seleccionar el primero
    const navItem = NAV_STRUCTURE.find(n => n.id === section);
    if (navItem?.children && !activeSub[section]) {
      setActiveSub(prev => ({ ...prev, [section]: navItem.children[0].id }));
    }
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
      alert(`Histórico limpiado: ${result.data.deletionStats.absences} ausencias, ${result.data.deletionStats.attendanceRecords} registros de asistencia eliminados`);
    } catch (error) {
      alert('Error al limpiar histórico: ' + error.message);
    } finally {
      setCleanupLoading(false);
    }
  };

  // Función para navegar desde el dashboard overview
  const handleNavigate = (section, sub) => {
    setActiveSection(section);
    if (sub) setActiveSub(prev => ({ ...prev, [section]: sub }));
    const url = new URL(window.location);
    url.searchParams.set("tab", section);
    window.history.pushState({}, "", url);
  };

  const getActiveSub = (section) => {
    const navItem = NAV_STRUCTURE.find(n => n.id === section);
    if (!navItem?.children) return null;
    return activeSub[section] || navItem.children[0].id;
  };

  const currentSubItems = NAV_STRUCTURE.find(n => n.id === activeSection)?.children || [];
  const currentSub = getActiveSub(activeSection);

  const pendingApprovals = useMemo(() =>
    absences.filter(a => a.estado_aprobacion === "Pendiente").length,
    [absences]
  );

  const activeEmployees = useMemo(() =>
    employees.filter(e => e.estado_empleado === "Alta"),
    [employees]
  );

  const todayDisplay = format(new Date(), "EEEE d MMM yyyy", { locale: es });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-3 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Presencia y Ausencias
            </h1>
            <p className="text-xs text-slate-400 capitalize">{todayDisplay}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal">
              {activeEmployees.length} empleados
            </Badge>
            {pendingApprovals > 0 && (
              <Badge
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs cursor-pointer"
                onClick={() => handleNavigate("ausencias", "approval")}
              >
                {pendingApprovals} pendientes
              </Badge>
            )}
          </div>
        </div>

        <MainNav
          activeSection={activeSection}
          onSelect={handleSectionChange}
          pendingBadge={pendingApprovals}
        />
      </div>

      {/* ── Contenido principal ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ══ RESUMEN GENERAL ════════════════════════════════════════════════ */}
        {activeSection === "overview" && (
          <PresenceOverviewDashboard onNavigate={handleNavigate} />
        )}

        {/* ══ PRESENCIA ══════════════════════════════════════════════════════ */}
        {activeSection === "presencia" && (
          <div>
            <SubNav
              items={currentSubItems}
              active={currentSub}
              onSelect={(sub) => setActiveSub(prev => ({ ...prev, presencia: sub }))}
            />
            {currentSub === "realtime" && <RealTimeAvailabilityPanel />}
            {currentSub === "monitor" && <PresenceMonitorPanel />}
            {currentSub === "daily" && <DailyAttendanceView />}
            {currentSub === "breaks" && <BreakAnalysis />}
            {currentSub === "automation" && <AutomationStatusPanel />}
          </div>
        )}

        {/* ══ AUSENCIAS ══════════════════════════════════════════════════════ */}
         {activeSection === "ausencias" && (
           <div>
             {isAdmin && (
               <div className="mb-4 flex gap-2 justify-end">
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   className="h-8 text-xs gap-2"
                   onClick={handleRefresh}
                   title="Actualizar datos"
                 >
                   <RefreshCw className="w-3 h-3" />
                   Actualizar
                 </Button>
                 <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
                   <DialogTrigger asChild>
                     <Button 
                       type="button"
                       variant="ghost"
                       size="sm"
                       className="h-8 text-xs gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                       title="Limpiar histórico completo"
                     >
                       <Trash2 className="w-3 h-3" />
                       Limpiar Histórico
                     </Button>
                   </DialogTrigger>
                   <DialogContent>
                     <div className="space-y-4">
                       <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">⚠️ Limpiar Histórico Completo</h2>
                       <p className="text-sm text-slate-600 dark:text-slate-400">
                         Esta acción eliminará permanentemente:
                       </p>
                       <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc list-inside space-y-1">
                         <li>Todos los registros de ausencias</li>
                         <li>Todos los registros de asistencia</li>
                         <li>Todos los registros de descansos</li>
                         <li>Logs de auditoría de ausencias</li>
                       </ul>
                       <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                         ❌ Esta acción no se puede deshacer.
                       </p>
                       <div className="flex gap-3 justify-end pt-4">
                         <Button 
                           variant="outline"
                           onClick={() => setShowCleanupDialog(false)}
                         >
                           Cancelar
                         </Button>
                         <Button 
                           className="bg-red-600 hover:bg-red-700 text-white"
                           onClick={handleCleanupHistorical}
                           disabled={cleanupLoading}
                         >
                           {cleanupLoading ? 'Limpiando...' : 'Confirmar Limpieza'}
                         </Button>
                       </div>
                     </div>
                   </DialogContent>
                 </Dialog>
               </div>
             )}
             <SubNav
               items={currentSubItems}
               active={currentSub}
               onSelect={(sub) => setActiveSub(prev => ({ ...prev, ausencias: sub }))}
             />
            {currentSub === "list" && (
              <UnifiedAbsenceManager
                sourceContext="absence_page"
                initialAbsences={absences}
                initialEmployees={employees}
              />
            )}
            {currentSub === "approval" && (
              <AbsenceApprovalPanel
                absences={absences}
                employees={employees}
                absenceTypes={absenceTypes}
                currentUser={currentUser}
              />
            )}
            {currentSub === "calendar" && (
              <AbsenceCalendar
                absences={absences}
                employees={employees}
                absenceTypes={absenceTypes}
              />
            )}
            {currentSub === "history" && (
              <AbsenceHistoryView employees={employees} absences={absences} />
            )}
          </div>
        )}

        {/* ══ INFORMES ════════════════════════════════════════════════════════ */}
        {activeSection === "informes" && (
          <div>
            <SubNav
              items={currentSubItems}
              active={currentSub}
              onSelect={(sub) => setActiveSub(prev => ({ ...prev, informes: sub }))}
            />
            {currentSub === "absenteeism" && <AbsenteeismReport />}
            {currentSub === "advanced" && <AdvancedReportGenerator />}
            {currentSub === "ai" && <AttendanceAnalyzer />}
          </div>
        )}

        {/* ══ CONFIGURACIÓN ═══════════════════════════════════════════════════ */}
        {activeSection === "config" && (
          <div>
            <SubNav
              items={currentSubItems}
              active={currentSub}
              onSelect={(sub) => setActiveSub(prev => ({ ...prev, config: sub }))}
            />
            {currentSub === "types" && (
              <div className="space-y-4">
                <AbsenceTypeManager />
                <VacationAccumulationConfig />
              </div>
            )}
            {currentSub === "vacation" && (
              <VacationPendingBalancePanel employees={employees} />
            )}
            {currentSub === "unpaid" && (
              <UnpaidLeaveTracker employees={employees} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}