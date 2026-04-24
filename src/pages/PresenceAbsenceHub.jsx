import React, { useState, useMemo, useRef, useEffect } from "react";
import { useAppData } from "../components/data/DataProvider";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { startOfMonth, eachDayOfInterval, format } from "date-fns";
import { es } from "date-fns/locale";
import { getAvailability } from "@/lib/domain/planning";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

// Icons
import {
  Users, Clock, UserX, Calendar, BarChart3, Settings,
  RefreshCw, Upload, Search, CheckCircle, AlertCircle,
  LogIn, LogOut, Trash2, Brain, ChevronRight, Radio,
  FileText, Layers, TrendingDown, Activity, CheckSquare,
  Eye, Plus, Download, Radar, CalendarDays, Coffee
} from "lucide-react";

// Feature Components
import UnifiedAbsenceManager from "../components/absences/UnifiedAbsenceManager";
import AbsenceCalendar from "../components/absences/AbsenceCalendar";
import AbsenceApprovalPanel from "../components/absences/AbsenceApprovalPanel";
import AbsenceHistoryView from "../components/absences/AbsenceHistoryView";
import PresenceMonitorPanel from "../components/absences/PresenceMonitorPanel";
import RealTimeAvailabilityPanel from "../components/absences/RealTimeAvailabilityPanel";
import AbsenteeismReport from "../components/attendance/AbsenteeismReport";
import AttendanceAnalyzer from "../components/attendance/AttendanceAnalyzer";
import AdvancedReportGenerator from "../components/reports/AdvancedReportGenerator";
import AbsenceTypeManager from "../components/absences/AbsenceTypeManager";
import VacationAccumulationConfig from "../components/absences/VacationAccumulationConfig";
import VacationPendingBalancePanel from "../components/absences/VacationPendingBalancePanel";
import VacationWorkCompensationManager from "../components/absences/VacationWorkCompensationManager";
import VacationPendingConsumptionManager from "../components/absences/VacationPendingConsumptionManager";
import UnpaidLeaveTracker from "../components/absences/UnpaidLeaveTracker";
import AbsenceNotifications from "../components/employees/AbsenceNotifications";
import AbsenceDashboard from "../components/employees/AbsenceDashboard";
import PresenceDashboard from "../components/attendance/PresenceDashboard";
import BreakAnalysis from "../components/attendance/BreakAnalysis";

// ── Cuco360 config ──────────────────────────────────────────────────────────
const CUCO_API_KEY = "k9fKmKcVCRc44Rf7dpkxhnfU9z9t0XsgrYgkGQSr9unWFZPOKsySznPHb7bUJzBc";
const CLIENT_CODE = "380";
const CUCO_BASE_URL = "https://cuco360.cucorent.com/api/apiv2";

function parseFecha(valor) {
  if (!valor && valor !== 0) return null;
  if (typeof valor === "number") {
    const d = XLSX.SSF.parse_date_code(valor);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(valor).trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    const parts = s.split("/");
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  return null;
}

function parseHora(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  if (typeof valor === "number") {
    if (valor === 0) return "";
    const totalMinutes = Math.round(valor * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const s = String(valor).trim();
  const match = s.match(/^(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  return "";
}

// ── Tab Nav Item ─────────────────────────────────────────────────────────────
function TabNavItem({ id, label, icon: Icon, active, onClick, badge }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
        active
          ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
          : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge != null && badge > 0 && (
        <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
          {badge}
        </span>
      )}
    </button>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    green: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  };
  return (
    <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{value}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${colors[color] || colors.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sub-tab within a main tab ─────────────────────────────────────────────────
function SubTabNav({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap mb-4">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            active === t.id
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          {t.icon && <t.icon className="w-3.5 h-3.5" />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function PresenceAbsenceHub() {
  const {
    user: currentUser,
    absences = [],
    employees = [],
    absenceTypes = [],
  } = useAppData();

  const location = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // ── URL-synced tab ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSubTab, setActiveSubTab] = useState({});
  const [initialAbsenceEmployeeId, setInitialAbsenceEmployeeId] = useState(null);
  const [initialAbsenceEmployeeName, setInitialAbsenceEmployeeName] = useState(null);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) setActiveTab(tab);
    const employeeId = params.get("employeeId");
    const employeeName = params.get("employeeName");
    setInitialAbsenceEmployeeId(employeeId || null);
    setInitialAbsenceEmployeeName(employeeName || null);
  }, [location.search]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url);
  };

  const getSubTab = (mainTab, defaultSub) => activeSubTab[mainTab] || defaultSub;
  const setSubTab = (mainTab, sub) => setActiveSubTab(prev => ({ ...prev, [mainTab]: sub }));

  // ── Attendance (fichajes) state ─────────────────────────────────────────────
  const [importing, setImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: attendanceRecords = [], isLoading: loadingAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ["attendanceRecords", filterDate],
    queryFn: () => base44.entities.AttendanceRecord.filter({ record_date: filterDate }, "record_time", 2000),
    staleTime: 10000,
  });

  const employeesByCodigo = useMemo(() => {
    const map = new Map();
    employees.forEach(e => {
      const code = e?.codigo_empleado != null ? String(e.codigo_empleado) : null;
      if (code) map.set(code, e);
    });
    return map;
  }, [employees]);

  const employeesById = useMemo(() => {
    const map = new Map();
    employees.forEach(e => { if (e?.id) map.set(String(e.id), e); });
    return map;
  }, [employees]);

  const batches = [...new Set(attendanceRecords.map(r => r.import_batch).filter(Boolean))];

  const employeeSummary = useMemo(() => Object.values(
    attendanceRecords.reduce((acc, r) => {
      const key = r.employee_id;
      if (!acc[key]) {
        const em = employeesByCodigo.get(String(r.employee_id)) || employeesById.get(String(r.employee_id));
        acc[key] = {
          employee_id: r.employee_id,
          employee_name: em?.nombre || r.employee_name || `Emp. ${r.employee_id}`,
          department: em?.departamento || r.department || "—",
          entries: [], exits: [],
        };
      }
      if (r.direction === "E") acc[key].entries.push(r.record_time);
      else acc[key].exits.push(r.record_time);
      return acc;
    }, {})
  ).filter(e =>
    !searchTerm ||
    e.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [attendanceRecords, employeesByCodigo, employeesById, searchTerm]);

  const attendanceStats = {
    total: employeeSummary.length,
    present: employeeSummary.filter(e => e.entries.length > 0 && e.exits.length === 0).length,
    left: employeeSummary.filter(e => e.entries.length > 0 && e.exits.length > 0).length,
    totalRecords: attendanceRecords.length,
  };

  // ── KPI calculations ────────────────────────────────────────────────────────
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const activeEmployees = useMemo(() =>
    employees.filter(e => e.estado_empleado === "Alta" && e.incluir_en_planning !== false),
  [employees]);

  const activeAbsences = useMemo(() => {
    const now = new Date();
    return absences.filter(a => {
      const start = new Date(a.fecha_inicio);
      const end = a.fecha_fin_desconocida ? now : new Date(a.fecha_fin);
      return now >= start && now <= end && a.estado_aprobacion !== "Rechazada";
    });
  }, [absences]);

  const pendingApprovals = useMemo(() =>
    absences.filter(a => a.estado_aprobacion === "Pendiente").length,
  [absences]);

  const dailyAbsenteeism = useMemo(() => {
    if (!activeEmployees.length) return { rate: 0, absent: 0, total: 0 };
    const r = getAvailability(activeEmployees, absences, todayISO);
    return { rate: r.totalEmpleados > 0 ? (r.ausentes / r.totalEmpleados) * 100 : 0, absent: r.ausentes, total: r.totalEmpleados };
  }, [activeEmployees, absences, todayISO]);

  const monthlyAbsenteeism = useMemo(() => {
    if (!activeEmployees.length) return { rate: 0 };
    const now = new Date();
    const days = eachDayOfInterval({ start: startOfMonth(now), end: now });
    const sumRates = days.reduce((sum, day) => {
      const r = getAvailability(activeEmployees, absences, day.toISOString().slice(0, 10));
      return sum + (r.totalEmpleados > 0 ? (r.ausentes / r.totalEmpleados) * 100 : 0);
    }, 0);
    return { rate: days.length > 0 ? sumRates / days.length : 0 };
  }, [activeEmployees, absences]);

  // ── Attendance handlers ─────────────────────────────────────────────────────
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const cells = (rows[i] || []).map(c => String(c || "").trim().toUpperCase());
        if ((cells.includes("ID") && cells.includes("EMPLEADO")) || (cells.includes("FECHA") && cells.includes("HORA"))) { headerRowIdx = i; break; }
      }
      if (headerRowIdx === -1) throw new Error("No se encontró la cabecera.");
      const headers = rows[headerRowIdx].map(h => String(h || "").trim());
      const findCol = names => { for (const n of names) { const idx = headers.findIndex(h => h.toLowerCase() === n.toLowerCase()); if (idx !== -1) return idx; } return -1; };
      const idxId = findCol(["ID","Codigo","Código"]);
      const idxEmpleado = findCol(["Empleado","Nombre","Trabajador"]);
      const idxFecha = findCol(["Fecha","Date","Día"]);
      const idxHora = findCol(["Hora","Hora marcaje","Time"]);
      const idxSentido = findCol(["Sentido","Tipo","Dirección","Direccion","E/S"]);
      const idxIncidencia = findCol(["Incidencia","Observaciones"]);
      const idxCentro = findCol(["Centro"]);
      const idxDepartamento = findCol(["Departamento","Depto","Sección"]);
      const idxDispositivo = findCol(["Dispositivo","Terminal"]);
      if (idxFecha === -1 || idxHora === -1) throw new Error("Faltan columnas: Fecha / Hora.");
      const toCreate = [];
      rows.slice(headerRowIdx + 1).forEach(row => {
        if (!row || !row[idxFecha]) return;
        const fechaStr = parseFecha(row[idxFecha]);
        const horaStr = parseHora(row[idxHora]);
        if (!fechaStr || !horaStr) return;
        const rawSentido = idxSentido !== -1 ? String(row[idxSentido] || "").trim() : "";
        const direction = (rawSentido.toUpperCase().includes("S") || rawSentido.toUpperCase().includes("OUT") || rawSentido.includes("Salida")) ? "S" : "E";
        toCreate.push({
          employee_id: idxId !== -1 ? String(row[idxId] ?? "").trim() : "UNKNOWN",
          employee_name: idxEmpleado !== -1 ? String(row[idxEmpleado] || "").trim() : "Desconocido",
          direction,
          incident: idxIncidencia !== -1 ? String(row[idxIncidencia] || "").trim() : "",
          center: idxCentro !== -1 ? String(row[idxCentro] || "").trim() : "",
          department: idxDepartamento !== -1 ? String(row[idxDepartamento] || "").trim() : "",
          device: idxDispositivo !== -1 ? String(row[idxDispositivo] || "").trim() : "",
          record_date: fechaStr, record_time: horaStr,
          import_batch: `import_${Date.now()}`
        });
      });
      if (!toCreate.length) { toast.error("No se encontraron registros válidos."); return; }
      const datesInFile = [...new Set(toCreate.map(r => r.record_date))];
      for (const date of datesInFile) {
        const existing = await base44.entities.AttendanceRecord.filter({ record_date: date }, "id", 2000);
        for (let i = 0; i < existing.length; i += 50)
          await Promise.all(existing.slice(i, i + 50).map(ex => base44.entities.AttendanceRecord.delete(ex.id).catch(() => {})));
      }
      for (let i = 0; i < toCreate.length; i += 50)
        await base44.entities.AttendanceRecord.bulkCreate(toCreate.slice(i, i + 50));
      toast.success(`${toCreate.length} registros importados.`);
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      if (datesInFile[0]) setFilterDate(datesInFile[0]);
    } catch (err) {
      toast.error("Error importación: " + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSyncCuco = async () => {
    if (!confirm(`¿Sincronizar marcajes de CUCO360 para el ${filterDate}?`)) return;
    setIsSyncing(true);
    try {
      const start = encodeURIComponent(`${filterDate} 00:00:00`);
      const end = encodeURIComponent(`${filterDate} 23:59:59`);
      const url = `${CUCO_BASE_URL}/checking/getfullchecks/${CLIENT_CODE}?start_date=${start}&end_date=${end}`;
      const response = await fetch(url, { headers: { "Content-Type": "application/json", Accept: "application/json", APIkey: CUCO_API_KEY } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rawData = await response.json();
      let recs = Array.isArray(rawData) ? rawData : rawData.data || rawData.checks || [];
      if (!recs.length) { toast.warning("Sin marcajes en Cuco360 para esta fecha."); return; }
      const mappedRecords = recs.map(r => {
        const code = r.cod_int_empleado != null ? String(r.cod_int_empleado).trim() : "";
        const id = r.id_empleado != null ? String(r.id_empleado).trim() : "";
        const emp = (code && employeesByCodigo.get(code)) || (id && employeesById.get(id)) || null;
        const valDir = r.val_direccion ? String(r.val_direccion).toUpperCase() : "";
        const typeId = Number(r.id_tipo_marcaje);
        const direction = (valDir === "S" || valDir === "SALIDA" || valDir === "OUT" || typeId === 2 || typeId === 4) ? "S" : "E";
        let recordDate = filterDate, recordTime = r.hora || "00:00";
        if (r.fec_marcaje) { const p = r.fec_marcaje.split(" "); recordDate = p[0]; if (p[1]) recordTime = p[1].slice(0, 5); }
        return { employee_id: code || id || "UNKNOWN", employee_name: emp ? emp.nombre : (r.nombre_empleado || `Emp. ${code || id}`), department: emp?.departamento || "", direction, incident: r.id_incidencia ? `Inc. ${r.id_incidencia}` : "", record_date: recordDate, record_time: recordTime, center: "", device: r.nom_dispositivo || "", import_batch: `sync_v2_${Date.now()}` };
      });
      const existing = await base44.entities.AttendanceRecord.filter({ record_date: filterDate }, "id", 2000);
      for (let i = 0; i < existing.length; i += 50)
        await Promise.all(existing.slice(i, i + 50).map(ex => base44.entities.AttendanceRecord.delete(ex.id).catch(() => {})));
      for (let i = 0; i < mappedRecords.length; i += 50)
        await base44.entities.AttendanceRecord.bulkCreate(mappedRecords.slice(i, i + 50));
      toast.success(`${mappedRecords.length} registros sincronizados.`);
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      refetchAttendance();
    } catch (err) {
      toast.error("Error sync: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearDay = async () => {
    if (!confirm(`¿Eliminar TODOS los registros del ${filterDate}?`)) return;
    const result = await base44.functions.invoke("deleteAttendanceRecords", { record_date: filterDate });
    toast.success(`${result.data?.deleted || 0} registros eliminados.`);
    queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
    refetchAttendance();
  };

  // ── Main tabs definition ────────────────────────────────────────────────────
  const MAIN_TABS = [
    { id: "overview", label: "Visión General", icon: Activity },
    { id: "absences", label: "Ausencias", icon: UserX, badge: pendingApprovals },
    { id: "presence", label: "Control de Presencia", icon: Clock },
    { id: "reports", label: "Informes", icon: BarChart3 },
    { id: "config", label: "Configuración", icon: Settings },
  ];

  const ABSENCE_SUB_TABS = [
    { id: "list", label: "Listado activo", icon: FileText },
    { id: "approval", label: "Aprobaciones", icon: CheckSquare },
    { id: "calendar", label: "Calendario", icon: Calendar },
    { id: "history", label: "Histórico", icon: CalendarDays },
  ];

  const PRESENCE_SUB_TABS = [
    { id: "presencia", label: "Presencia en Tiempo Real", icon: Activity },
    { id: "pausas", label: "Auditoría de Pausas", icon: Coffee },
    { id: "daily", label: "Marcajes del día", icon: LogIn },
    { id: "monitor", label: "Monitor turno", icon: Radar },
    { id: "realtime", label: "Tiempo real", icon: Radio },
  ];

  const REPORTS_SUB_TABS = [
    { id: "absenteeism", label: "Absentismo", icon: TrendingDown },
    { id: "advanced", label: "Informes avanzados", icon: FileText },
    { id: "ai", label: "Análisis IA", icon: Brain },
  ];

  const CONFIG_SUB_TABS = [
    { id: "types", label: "Tipos de ausencia", icon: FileText },
    { id: "vacation", label: "Vacaciones", icon: Calendar },
    { id: "unpaid", label: "Excedencias", icon: UserX },
  ];

  const todayDisplay = format(new Date(), "EEEE d MMMM yyyy", { locale: es });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-3 pb-0 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Presencia y Ausencias
            </h1>
            <p className="text-xs text-slate-400 capitalize">{todayDisplay}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {activeEmployees.length} empleados activos
            </Badge>
            {pendingApprovals > 0 && (
              <Badge className="bg-orange-500 text-white text-xs">
                {pendingApprovals} pendientes de aprobación
              </Badge>
            )}
          </div>
        </div>

        {/* ── Main Tab Nav ─────────────────────────────────────────────────── */}
        <div className="flex overflow-x-auto scrollbar-hide border-t border-slate-100 dark:border-slate-800 -mx-4 px-4">
          {MAIN_TABS.map(tab => (
            <TabNavItem
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              onClick={handleTabChange}
              badge={tab.badge}
            />
          ))}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Ausencias activas hoy" value={activeAbsences.length} icon={UserX} color="red" sub={`de ${activeEmployees.length} empleados`} />
              <KpiCard label="Absentismo diario" value={`${dailyAbsenteeism.rate.toFixed(1)}%`} icon={TrendingDown} color="orange" sub={`Mes: ${monthlyAbsenteeism.rate.toFixed(1)}%`} />
              <KpiCard label="Marcajes hoy" value={attendanceStats.totalRecords} icon={Clock} color="blue" sub={`${attendanceStats.present} en planta`} />
              <KpiCard label="Pendientes aprobación" value={pendingApprovals} icon={CheckSquare} color="purple" sub="Solicitudes de ausencia" />
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={() => handleTabChange("absences")}>
                <Plus className="w-3.5 h-3.5" /> Nueva ausencia
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleTabChange("presence")}>
                <Upload className="w-3.5 h-3.5" /> Importar marcajes
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleTabChange("reports")}>
                <BarChart3 className="w-3.5 h-3.5" /> Ver informes
              </Button>
            </div>

            {/* Notifications + Dashboard */}
            <AbsenceNotifications absences={absences} employees={employees} absenceTypes={absenceTypes} />
            <AbsenceDashboard absences={absences} employees={employees} />
          </div>
        )}

        {/* ══ AUSENCIAS ══════════════════════════════════════════════════════ */}
        {activeTab === "absences" && (
          <div>
            <SubTabNav
              tabs={ABSENCE_SUB_TABS}
              active={getSubTab("absences", "list")}
              onChange={(s) => setSubTab("absences", s)}
            />
            {getSubTab("absences", "list") === "list" && (
              <UnifiedAbsenceManager
                sourceContext="absence_page"
                initialAbsences={absences}
                initialEmployees={employees}
                initialEmployeeId={initialAbsenceEmployeeId}
                initialEmployeeName={initialAbsenceEmployeeName}
              />
            )}
            {getSubTab("absences", "list") === "approval" && (
              <AbsenceApprovalPanel absences={absences} employees={employees} absenceTypes={absenceTypes} currentUser={currentUser} />
            )}
            {getSubTab("absences", "list") === "calendar" && (
              <AbsenceCalendar absences={absences} employees={employees} absenceTypes={absenceTypes} />
            )}
            {getSubTab("absences", "list") === "history" && (
              <AbsenceHistoryView employees={employees} absences={absences} />
            )}
          </div>
        )}

        {/* ══ CONTROL DE PRESENCIA ══════════════════════════════════════════ */}
        {activeTab === "presence" && (
          <div>
            <SubTabNav
              tabs={PRESENCE_SUB_TABS}
              active={getSubTab("presence", "presencia")}
              onChange={(s) => setSubTab("presence", s)}
            />

            {getSubTab("presence", "presencia") === "presencia" && (
              <PresenceDashboard date={filterDate} />
            )}

            {getSubTab("presence", "presencia") === "pausas" && (
              <BreakAnalysis date={filterDate} />
            )}

            {getSubTab("presence", "presencia") === "daily" && (
              <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Button onClick={handleSyncCuco} disabled={isSyncing || importing} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" size="sm">
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Sincronizando..." : "Sync Cuco360"}
                  </Button>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={importing} variant="outline" size="sm" className="gap-1.5">
                    {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {importing ? "Importando..." : "Importar Excel"}
                  </Button>
                  {attendanceRecords.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleClearDay} className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Borrar día
                    </Button>
                  )}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <label className="text-xs font-medium text-slate-500">Fecha:</label>
                    <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-36 h-8 text-xs" />
                  </div>
                </div>

                {/* Lotes */}
                {batches.length > 1 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-slate-500 flex items-center gap-1"><Layers className="w-3 h-3" /> Turnos:</span>
                    {batches.map(b => (
                      <Badge key={b} variant="secondary" className="text-xs">{b.slice(-6)}</Badge>
                    ))}
                  </div>
                )}

                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <KpiCard label="Empleados" value={attendanceStats.total} icon={Users} color="blue" />
                  <KpiCard label="En planta" value={attendanceStats.present} icon={CheckCircle} color="green" />
                  <KpiCard label="Salieron" value={attendanceStats.left} icon={LogOut} color="orange" />
                  <KpiCard label="Marcajes" value={attendanceStats.totalRecords} icon={Clock} color="purple" />
                </div>

                {/* Buscador */}
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input placeholder="Buscar empleado o departamento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-8 text-sm" />
                </div>

                {/* Tabla */}
                {loadingAttendance ? (
                  <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>
                ) : employeeSummary.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-slate-400">
                      <Upload className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No hay registros para el {filterDate}.</p>
                      <p className="text-xs mt-1">Importa un Excel o sincroniza con Cuco360.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-sm font-semibold">
                        {filterDate} — {employeeSummary.length} empleados
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Empleado</th>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Departamento</th>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Entradas</th>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Salidas</th>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {employeeSummary.map(emp => (
                              <tr key={emp.employee_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="px-4 py-2.5">
                                  <p className="font-medium text-slate-800 dark:text-slate-200">{emp.employee_name}</p>
                                  <p className="text-[11px] text-slate-400">ID: {emp.employee_id}</p>
                                </td>
                                <td className="px-4 py-2.5 text-slate-500 text-xs">{emp.department}</td>
                                <td className="px-4 py-2.5">
                                  <div className="flex flex-wrap gap-1">
                                    {emp.entries.sort().map((t, i) => (
                                      <Badge key={i} className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-1.5 py-0.5 gap-1">
                                        <LogIn className="w-2.5 h-2.5" />{t}
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="flex flex-wrap gap-1">
                                    {emp.exits.sort().map((t, i) => (
                                      <Badge key={i} className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-1.5 py-0.5 gap-1">
                                        <LogOut className="w-2.5 h-2.5" />{t}
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  {emp.entries.length > 0 && emp.exits.length === 0 && <Badge className="bg-blue-100 text-blue-700 text-xs">En planta</Badge>}
                                  {emp.entries.length > 0 && emp.exits.length > 0 && <Badge className="bg-slate-100 text-slate-600 text-xs">Salió</Badge>}
                                  {emp.entries.length === 0 && <Badge className="bg-red-100 text-red-700 text-xs">Sin entrada</Badge>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {getSubTab("presence", "presencia") === "monitor" && <PresenceMonitorPanel />}
            {getSubTab("presence", "presencia") === "realtime" && <RealTimeAvailabilityPanel />}
          </div>
        )}

        {/* ══ INFORMES ══════════════════════════════════════════════════════ */}
        {activeTab === "reports" && (
          <div>
            <SubTabNav
              tabs={REPORTS_SUB_TABS}
              active={getSubTab("reports", "absenteeism")}
              onChange={(s) => setSubTab("reports", s)}
            />
            {getSubTab("reports", "absenteeism") === "absenteeism" && <AbsenteeismReport />}
            {getSubTab("reports", "absenteeism") === "advanced" && <AdvancedReportGenerator />}
            {getSubTab("reports", "absenteeism") === "ai" && <AttendanceAnalyzer />}
          </div>
        )}

        {/* ══ CONFIGURACIÓN ════════════════════════════════════════════════ */}
        {activeTab === "config" && (
          <div>
            <SubTabNav
              tabs={CONFIG_SUB_TABS}
              active={getSubTab("config", "types")}
              onChange={(s) => setSubTab("config", s)}
            />
            {getSubTab("config", "types") === "types" && (
              <div className="space-y-4">
                <AbsenceTypeManager />
                <VacationAccumulationConfig />
              </div>
            )}
            {getSubTab("config", "types") === "vacation" && (
              <div className="space-y-4">
                <VacationPendingBalancePanel employees={employees} />
                <VacationWorkCompensationManager employees={employees} />
                <VacationPendingConsumptionManager employees={employees} />
              </div>
            )}
            {getSubTab("config", "types") === "unpaid" && (
              <UnpaidLeaveTracker employees={employees} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}