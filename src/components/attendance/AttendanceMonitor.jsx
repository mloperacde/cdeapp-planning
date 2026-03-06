import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, Search, AlertTriangle, CheckCircle2, ShieldAlert, Info,
  Clock, X, Bell
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AbsenceForm from "../absences/AbsenceForm";
import { createAbsence, updateAbsence, deleteAbsence } from "../absences/AbsenceOperations";
import MasterEmployeeEditDialog from "../master/MasterEmployeeEditDialog";
import { toast } from "sonner";
import { useAppData } from "../data/DataProvider";
import { format, startOfWeek } from "date-fns";

function formatMin(min) {
  if (min == null || min <= 0) return "—";
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}

function toMin(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isInCorte(emp, target) {
  if (!emp.horaEsperada || !emp.horaFinEsperada) return false;
  const targetMin = toMin(target);
  const start = toMin(emp.horaEsperada);
  const end = toMin(emp.horaFinEsperada);
  if (start == null || end == null) return false;
  if (targetMin < start || targetMin > end) return false;
  const first = toMin(emp.primerMarcaje);
  const last = toMin(emp.ultimoMarcaje);
  if (first == null || last == null) return false;
  return first <= targetMin && last >= targetMin;
}

export default function AttendanceMonitor() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [consulted, setConsulted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [filterTab, setFilterTab] = useState("todos");
  const [searchEmp, setSearchEmp] = useState("");
  const [filterDpto, setFilterDpto] = useState("__all__");
  const [filterEquipo, setFilterEquipo] = useState("__all__");
  const [filterTurno, setFilterTurno] = useState("__all__");
  const [activeCorte, setActiveCorte] = useState(null);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [absenceInitialData, setAbsenceInitialData] = useState(null);
  const [lastAbsenceNotice, setLastAbsenceNotice] = useState("");
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [employeeInitialData, setEmployeeInitialData] = useState(null);

  const queryClient = useQueryClient();
  const { employees: employeesData, machines: machinesData } = useAppData();
  const employees = employeesData || [];

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: absences = [] } = useQuery({
    queryKey: ["absences"],
    queryFn: () => base44.entities.Absence.list("-fecha_inicio", 1000),
  });

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ["absenceTypes"],
    queryFn: () => base44.entities.AbsenceType.list("orden", 1000),
  });

  const { data: vacations = [] } = useQuery({
    queryKey: ["vacations"],
    queryFn: () => base44.entities.Vacation.list(),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => base44.entities.Holiday.list(),
  });

  const { data: teamWeekSchedules = [] } = useQuery({
    queryKey: ["teamWeekSchedules"],
    queryFn: () => base44.entities.TeamWeekSchedule.list(),
  });

  const { data: teamConfigs = [] } = useQuery({
    queryKey: ["teamConfigs"],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: attendanceConfigs = [] } = useQuery({
    queryKey: ["attendanceConfigs"],
    queryFn: () => base44.entities.AttendanceConfig.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (absenceInitialData && absenceInitialData.id) {
        return await updateAbsence(
          absenceInitialData.id,
          data,
          currentUser,
          absenceTypes,
          vacations,
          holidays
        );
      }
      return await createAbsence(
        data,
        currentUser,
        employees,
        absenceTypes,
        vacations,
        holidays
      );
    },
    onSuccess: async () => {
      try {
        await base44.functions.invoke("syncEmployeeAvailability");
      } catch (e) {
        console.warn("Sync availability failed", e);
      }
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employeesMaster"] });
      queryClient.invalidateQueries({ queryKey: ["employeeMasterDatabase"] });
      queryClient.invalidateQueries({ queryKey: ["vacationPendingBalances"] });
      queryClient.invalidateQueries({ queryKey: ["globalAbsenteeism"] });
      toast.success("Ausencia registrada. Cambios aplicados en todos los módulos.");
      setLastAbsenceNotice("Ausencia registrada y disponibilidad sincronizada. Vuelve a consultar si deseas refrescar los datos.");
      setAbsenceDialogOpen(false);
      setAbsenceInitialData(null);
    },
    onError: (error) => {
      toast.error("Error al guardar ausencia: " + (error?.message || ""));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const absence = absences.find(a => a.id === id);
      if (absence) {
        await deleteAbsence(absence, employees);
      }
    },
    onSuccess: async () => {
      try {
        await base44.functions.invoke("syncEmployeeAvailability");
      } catch (e) {
        console.warn("Sync availability failed", e);
      }
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employeesMaster"] });
      queryClient.invalidateQueries({ queryKey: ["employeeMasterDatabase"] });
      queryClient.invalidateQueries({ queryKey: ["vacationPendingBalances"] });
      toast.success("Ausencia eliminada. Cambios aplicados en todos los módulos.");
      setAbsenceDialogOpen(false);
      setAbsenceInitialData(null);
    },
    onError: (error) => {
      toast.error("Error al eliminar ausencia: " + (error?.message || ""));
    },
  });

  const finalizeAbsenceMutation = useMutation({
    mutationFn: async ({ empRow }) => {
      if (!empRow?.ausencia?.id || !empRow?.primerMarcaje) return;
      const absence = empRow.ausencia;
      const endISO = new Date(`${selectedDate}T${empRow.primerMarcaje.slice(0, 5)}`).toISOString();
      const payload = {
        ...absence,
        fecha_fin: endISO,
        fecha_fin_desconocida: false,
      };
      return await updateAbsence(absence.id, payload, currentUser, absenceTypes, vacations, holidays);
    },
    onSuccess: async () => {
      try {
        await base44.functions.invoke("syncEmployeeAvailability");
      } catch (e) {
        console.warn("Sync availability failed", e);
      }
      queryClient.invalidateQueries({ queryKey: ["absences"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employeesMaster"] });
      queryClient.invalidateQueries({ queryKey: ["employeeMasterDatabase"] });
      queryClient.invalidateQueries({ queryKey: ["vacationPendingBalances"] });
      queryClient.invalidateQueries({ queryKey: ["globalAbsenteeism"] });
      toast.success("Ausencia finalizada con la hora del primer fichaje");
      if (consulted) {
        await handleConsultar();
      }
    },
    onError: (error) => {
      toast.error("Error al finalizar ausencia: " + (error?.message || ""));
    },
  });

  const handleConsultar = async () => {
    setIsLoading(true);
    setConsulted(false);
    try {
      // 1. Fetch raw records for date
      const rawRecords = await base44.entities.AttendanceRecord.filter({ record_date: selectedDate }, "record_time", 2000);
      
      // 2. Perform Local Analysis (replaces analyzeAttendance backend function)
      const config = attendanceConfigs.find(c => c.activo) || {};
      const toleranciaEntrada = config.tolerancia_entrada_minutos ?? 10;
      const departamentosEstrictos = config.departamentos_estrictos || [];
      const toleranciaReducida = config.tolerancia_reducida_minutos ?? 5;

      const weekStart = format(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      // Build team schedule map
      const teamScheduleMap = {};
      teamWeekSchedules.forEach(ws => {
         if (ws.fecha_inicio_semana === weekStart) {
            teamScheduleMap[ws.team_key] = ws.turno;
         }
      });

      // Prepare Maps
      const excludedIds = new Set(["999", "998", "997"]);
      const masterMapById = {};
      const masterMapByCodigo = {};
      
      employees.forEach(emp => {
         if (excludedIds.has(String(emp.codigo_empleado)) || excludedIds.has(String(emp.id))) return;
         if (emp.id) masterMapById[String(emp.id)] = emp;
         if (emp.codigo_empleado) masterMapByCodigo[String(emp.codigo_empleado)] = emp;
      });

      // Group records by Employee
      const fichajesMap = {};
      rawRecords.forEach(r => {
         const rawId = r.employee_id ? String(r.employee_id).trim() : "";
         if (!rawId || excludedIds.has(rawId)) return;

         let masterEmp = masterMapById[rawId] || masterMapByCodigo[rawId];
         
         // Try fuzzy match if not found (fallback logic from Analyzer)
         if (!masterEmp) {
            const rName = r.employee_name ? r.employee_name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
            if (rName) {
               masterEmp = employees.find(e => {
                  const eName = e.nombre ? e.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
                  // Check exact match, partial match, or reversed tokens
                  if (!eName) return false;
                  if (eName === rName || eName.includes(rName) || rName.includes(eName)) return true;
                  
                  // Check parts
                  const eParts = eName.split(" ").filter(p => p.length > 2);
                  const rParts = rName.split(" ").filter(p => p.length > 2);
                  if (eParts.length > 0 && rParts.length > 0) {
                     return eParts.every(p => rName.includes(p)) || rParts.every(p => eName.includes(p));
                  }
                  return false;
               });
            }
         }

         const key = masterEmp ? (masterEmp.codigo_empleado ? String(masterEmp.codigo_empleado) : String(masterEmp.id)) : rawId;

         if (!fichajesMap[key]) {
            fichajesMap[key] = {
               employee: masterEmp || {
                  id: null,
                  nombre: r.employee_name || `Empleado ${rawId}`,
                  codigo_empleado: rawId,
                  departamento: r.department || "Desconocido",
                  equipo: "Sin Asignar",
                  tipo_turno: "Desconocido"
               },
               is_unknown: !masterEmp,
               entries: [],
               exits: [],
               first: null,
               last: null
            };
         }

         const time = r.record_time ? String(r.record_time).substring(0, 5) : "";
         const group = fichajesMap[key];
         if (r.direction === "E") {
            group.entries.push(time);
            if (!group.first || time < group.first) group.first = time;
         } else {
            group.exits.push(time);
            if (!group.last || time > group.last) group.last = time;
         }
      });

      const rows = [];
      const noEnMaestra = [];
      const sinRegistro = [];

      // Process Present Employees
      Object.values(fichajesMap).forEach(emp => {
         // Fix: Ensure we use the resolved master employee if available in the group object
         const master = emp.employee && emp.employee.id ? emp.employee : (masterMapById[emp.employee.id] || masterMapByCodigo[emp.employee.codigo_empleado]);
         
         if (!master || !master.id) { // Strict check for valid master record
            noEnMaestra.push({
               employee_id: emp.employee.codigo_empleado,
               employee_name: emp.employee.nombre,
               totalMarcajes: emp.entries.length + emp.exits.length
            });
            // Also add to rows for visibility
            rows.push({
               employee_id: emp.employee.codigo_empleado,
               employee_name: emp.employee.nombre,
               departamento: "—",
               equipo: "—",
               turnoReal: "—",
               horaEsperada: null,
               horaFinEsperada: null,
               primerMarcaje: emp.first,
               ultimoMarcaje: emp.last,
               esRetraso: false,
               retrasoMin: 0,
               incidenciaJornada: true,
               incongruencias: [],
               estado: "error",
               tiempoTrabajado: 0
            });
            return;
         }

         // Calculate Shifts & Status
         const { horaEntrada, horaFin, turnoReal } = getHorarioEsperado(master, teamScheduleMap);
         const tolerancia = departamentosEstrictos.includes(master.departamento) ? toleranciaReducida : toleranciaEntrada;
         
         let esRetraso = false;
         let retrasoMin = 0;
         if (horaEntrada && emp.first) {
            const hE = toMin(horaEntrada);
            const hA = toMin(emp.first);
            if (hA > hE + tolerancia) {
               esRetraso = true;
               retrasoMin = hA - hE;
            }
         }

         const incongruencias = [];
         // Simple incongruity check
         if (emp.entries.length === 0) incongruencias.push("Sin entrada");
         if (emp.exits.length === 0) incongruencias.push("Sin salida");

         let tiempoTrabajado = 0;
         if (emp.first && emp.last) {
            tiempoTrabajado = toMin(emp.last) - toMin(emp.first);
         }

         rows.push({
            employee_id: String(master.codigo_empleado || master.id),
            employee_name: master.nombre,
            departamento: master.departamento || "—",
            equipo: master.equipo || "—",
            turnoReal: turnoReal || "—",
            horaEsperada: horaEntrada,
            horaFinEsperada: horaFin,
            primerMarcaje: emp.first,
            ultimoMarcaje: emp.last,
            esRetraso,
            retrasoMin,
            incidenciaJornada: incongruencias.length > 0,
            incongruencias,
            estado: esRetraso ? "retraso" : (incongruencias.length > 0 ? "incompleto" : "ok"),
            tiempoTrabajado,
            alertaPresenciaConAusencia: hasAbsenceForDate(master.id, selectedDate)
         });
      });

      // Process Absent Employees
      employees.forEach(master => {
         if (excludedIds.has(String(master.codigo_empleado))) return;
         if (master.incluir_en_planning === false) return; // Skip if excluded

         const keyId = master.id ? String(master.id) : null;
         const keyCode = master.codigo_empleado ? String(master.codigo_empleado) : null;
         
         // Fix: Check if employee is in fichajesMap by either ID or Code
         const hasData = (keyId && fichajesMap[keyId]) || (keyCode && fichajesMap[keyCode]);
         if (hasData) return; // Already processed as present

         const { horaEntrada, turnoReal } = getHorarioEsperado(master, teamScheduleMap);
         
         // Relaxed check: Report absence even if shift is unknown, unless explicit "No Turno"
         // if (!horaEntrada) return; 

         const ausencia = getAbsenceForDate(master.id, selectedDate);
         
         sinRegistro.push({
            employee_id: String(master.codigo_empleado || master.id),
            employee_name: master.nombre,
            departamento: master.departamento || "—",
            equipo: master.equipo || "—",
            turnoReal: turnoReal || "—",
            alertaFaltaAusencia: !ausencia,
            ausenciaConfirmada: !!ausencia,
            ausencia: ausencia
         });
      });

      setResult({ rows, sinRegistro, noEnMaestra });
      setConsulted(true);
    } catch (e) {
       console.error("Local Analysis Error:", e);
       toast.error("Error al analizar datos: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper Functions
  const getHorarioEsperado = (master, scheduleMap) => {
     if (!master) return { horaEntrada: null, horaFin: null, turnoReal: null };
     const tipo = master.tipo_turno;
     if (tipo === "Turno Partido") {
        return { 
           horaEntrada: master.turno_partido_entrada1, 
           horaFin: master.turno_partido_salida2, 
           turnoReal: "Partido" 
        };
     } else if (tipo === "Fijo Mañana") {
        return { 
           horaEntrada: master.horario_manana_inicio || "07:00", 
           horaFin: master.horario_manana_fin || "15:00", 
           turnoReal: "Mañana" 
        };
     } else if (tipo === "Fijo Tarde") {
        return { 
           horaEntrada: master.horario_tarde_inicio || "14:00", 
           horaFin: master.horario_tarde_fin || "22:00", 
           turnoReal: "Tarde" 
        };
     } else if (tipo === "Rotativo") {
        const teamKey = master.equipo ? teamConfigs.find(t => t.team_name === master.equipo)?.team_key : null;
        const turno = teamKey ? scheduleMap[teamKey] : null;
        if (turno === "Mañana") {
           return { horaEntrada: "07:00", horaFin: "15:00", turnoReal: "Mañana" };
        } else if (turno === "Tarde") {
           return { horaEntrada: "14:00", horaFin: "22:00", turnoReal: "Tarde" };
        }
     }
     return { horaEntrada: null, horaFin: null, turnoReal: null };
  };

  const getAbsenceForDate = (empId, date) => {
     return absences.find(a => {
        if (a.estado_aprobacion === 'Rechazada') return false;
        if (String(a.employee_id) !== String(empId)) return false;
        const start = a.fecha_inicio.split('T')[0];
        const end = a.fecha_fin_desconocida ? '2099-12-31' : a.fecha_fin.split('T')[0];
        return date >= start && date <= end;
     });
  };

  const hasAbsenceForDate = (empId, date) => !!getAbsenceForDate(empId, date);


  const dptos = useMemo(() => {
    if (!result) return [];
    const s = new Set(result.rows.map(r => r.departamento).filter(d => d && d !== "—"));
    return Array.from(s).sort();
  }, [result]);

  const equipos = useMemo(() => {
    if (!result) return [];
    const s = new Set(result.rows.map(r => r.equipo).filter(e => e && e !== "—"));
    return Array.from(s).sort();
  }, [result]);

  const baseFilteredRows = useMemo(() => {
    if (!result) return [];
    return result.rows.filter(emp => {
      if (searchEmp && !emp.employee_name.toLowerCase().includes(searchEmp.toLowerCase()) &&
          !emp.employee_id.includes(searchEmp)) return false;
      if (filterDpto !== "__all__" && emp.departamento !== filterDpto) return false;
      if (filterEquipo !== "__all__" && emp.equipo !== filterEquipo) return false;
      if (filterTurno !== "__all__" && emp.turnoReal !== filterTurno) return false;
      return true;
    });
  }, [result, searchEmp, filterDpto, filterEquipo, filterTurno]);

  const filteredRows = useMemo(() => {
    if (!result) return [];
    let base = baseFilteredRows;
    if (activeCorte) {
      base = base.filter(emp => isInCorte(emp, activeCorte));
    }
    return base.filter(emp => {
      if (filterTab === "retrasos" && !emp.esRetraso) return false;
      if (filterTab === "incongruencias" && emp.incongruencias.length === 0 && !emp.alertaPresenciaConAusencia) return false;
      if (filterTab === "jornada" && !emp.incidenciaJornada) return false;
      if (filterTab === "ok" && emp.estado !== "ok") return false;
      if (filterTab === "alerta_ausencia" && !emp.alertaPresenciaConAusencia) return false;
      return true;
    });
  }, [result, baseFilteredRows, filterTab, activeCorte]);

  const stats = useMemo(() => {
    if (!result) return {};
    return {
      total: result.rows.length,
      ausentes: result.sinRegistro.length,
      ausenciasSinConfigurar: result.sinRegistro.filter(e => e.alertaFaltaAusencia).length,
      ausenciasConfirmadas: result.sinRegistro.filter(e => e.ausenciaConfirmada).length,
      alertaAusencia: result.rows.filter(e => e.alertaPresenciaConAusencia).length,
      retrasos: result.rows.filter(e => e.esRetraso).length,
      incongruencias: result.rows.filter(e => e.incongruencias.length > 0).length,
      jornadaIncompleta: result.rows.filter(e => e.incidenciaJornada).length,
      ok: result.rows.filter(e => e.estado === "ok").length,
      noEnMaestra: result.noEnMaestra.length,
    };
  }, [result]);

  const hayFiltrosActivos = searchEmp || filterDpto !== "__all__" || filterEquipo !== "__all__" || filterTurno !== "__all__" || activeCorte;
  const clearFiltros = () => {
    setSearchEmp("");
    setFilterDpto("__all__");
    setFilterEquipo("__all__");
    setFilterTurno("__all__");
    setActiveCorte(null);
  };

  const cortes = useMemo(() => {
    if (!result) return { at07: 0, at14: 0, at15: 0 };
    const list = baseFilteredRows;
    const compute = (target) => {
      let count = 0;
      for (const emp of list) {
        if (isInCorte(emp, target)) count++;
      }
      return count;
    };
    return {
      at07: compute("07:00"),
      at14: compute("14:00"),
      at15: compute("15:00"),
    };
  }, [result, baseFilteredRows]);

  // helper para horario esperado en tabla sinRegistro
  function getHoraEsperada(emp) {
    const t = filterTurno === "__all__" ? "Mañana" : filterTurno;
    if (emp.tipo_turno === "Turno Partido") return emp.turno_partido_entrada1 || "—";
    if (emp.tipo_turno === "Fijo Mañana" || t === "Mañana") return emp.horario_manana_inicio || "—";
    if (emp.tipo_turno === "Fijo Tarde" || t === "Tarde") return emp.horario_tarde_inicio || "—";
    return "—";
  }

  function handleOpenCreateAbsence(emp) {
    const empRecord = employees.find(e => String(e.codigo_empleado) === String(emp.codigo_empleado));
    const rawEmployeeId = empRecord?.id || emp.id;
    const employeeId = rawEmployeeId != null ? String(rawEmployeeId) : "";
    const employeeName = empRecord?.nombre || emp.nombre || "";
    const baseTime = emp.horaEntradaEsperada || emp.horaEsperada || "08:00";
    const time = typeof baseTime === "string" ? baseTime.slice(0, 5) : "08:00";
    const fechaInicio = `${selectedDate}T${time}`;
    setAbsenceInitialData({
      employee_id: employeeId,
      employee_name: employeeName,
      fecha_inicio: fechaInicio,
      fecha_fin: "",
      fecha_fin_desconocida: false,
      motivo: "",
      tipo: "",
      absence_type_id: "",
      remunerada: true,
      notas: "",
      documentos_adjuntos: [],
      source: "attendance_audit",
    });
    setAbsenceDialogOpen(true);
  }

  function handleOpenEditAbsence(row) {
    if (!row.ausencia) return;
    const absence = row.ausencia;
    const empRecord = employees.find(e => e.id === absence.employee_id);
    const employeeName = empRecord?.nombre || row.employee_name || "";
    setAbsenceInitialData({
      ...absence,
      employee_id: absence.employee_id != null ? String(absence.employee_id) : "",
      employee_name: employeeName,
    });
    setAbsenceDialogOpen(true);
  }

  function handleOpenCreateEmployeeFromAttendance(emp) {
    setEmployeeInitialData({
      codigo_empleado: emp.employee_id || "",
      nombre: emp.employee_name || "",
    });
    setEmployeeDialogOpen(true);
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            Auditoría de Presencia
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Cruza fichajes con la base maestra y el módulo de ausencias. Procesamiento en backend para máximo rendimiento.
          </p>
        </CardHeader>
        <CardContent className="p-4">

          {lastAbsenceNotice && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-green-800">{lastAbsenceNotice}</p>
            </div>
          )}

          {/* Controles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Fecha</label>
              <Input type="date" value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); setConsulted(false); }} />
            </div>
            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Buscar empleado</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input placeholder="Nombre o ID..." value={searchEmp}
                  onChange={e => setSearchEmp(e.target.value)} className="pl-8" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Departamento</label>
              <Select value={filterDpto} onValueChange={setFilterDpto}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {dptos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Equipo</label>
              <Select value={filterEquipo} onValueChange={setFilterEquipo}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {equipos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Filtrar turno</label>
              <Select value={filterTurno} onValueChange={setFilterTurno}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los turnos</SelectItem>
                  <SelectItem value="Mañana">Mañana</SelectItem>
                  <SelectItem value="Tarde">Tarde</SelectItem>
                  <SelectItem value="Partido">Partido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={handleConsultar} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Analizando..." : "Consultar y Auditar"}
            </Button>
            {consulted && hayFiltrosActivos && (
              <Button variant="outline" onClick={clearFiltros} className="text-slate-500 gap-1 text-xs">
                <X className="w-3 h-3" /> Limpiar filtros
              </Button>
            )}
          </div>

          {consulted && result && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
                {[
                  { label: "Con fichaje", val: stats.total, color: "blue", tab: "todos" },
                  { label: "Total Sin Presencia", val: stats.ausentes, color: "red", tab: "ausentes" },
                  { label: "⚠ Sin ausencia", val: stats.ausenciasSinConfigurar, color: "red", tab: "ausentes" },
                  { label: "✓ Ausencia conf.", val: stats.ausenciasConfirmadas, color: "slate", tab: "ausentes" },
                  { label: "🔔 Ficha+ausencia", val: stats.alertaAusencia, color: "yellow", tab: "alerta_ausencia" },
                  { label: "Retrasos", val: stats.retrasos, color: "orange", tab: "retrasos" },
                  { label: "Incongruencias", val: stats.incongruencias, color: "purple", tab: "incongruencias" },
                  { label: "Jornada incompl.", val: stats.jornadaIncompleta, color: "amber", tab: "jornada" },
                  { label: "Sin incidencias", val: stats.ok, color: "green", tab: "ok" },
                ].map(({ label, val, color, tab }) => (
                  <Card key={`${tab}-${label}`}
                    className={`cursor-pointer transition-all hover:shadow-md ${filterTab === tab ? "ring-2 ring-offset-1" : ""}`}
                    onClick={() => setFilterTab(tab)}>
                    <CardContent className="p-2.5">
                      <p className="text-[9px] font-semibold uppercase leading-tight mb-1 text-slate-600">{label}</p>
                      <p className="text-xl font-bold text-slate-900">{val}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {stats.noEnMaestra > 0 && (
                <div 
                  className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3 cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => setFilterTab("no_maestra")}
                >
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">
                      Detectados {stats.noEnMaestra} fichajes de empleados no registrados en la base de datos
                    </h4>
                    <p className="text-xs text-red-600 mt-1">
                      Es necesario vincular estos IDs con empleados reales para procesar su asistencia correctamente. Haz clic aquí para resolverlo.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mb-4">

                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${activeCorte === "07:00" ? "ring-2 ring-offset-1" : ""}`}
                  onClick={() => setActiveCorte(activeCorte === "07:00" ? null : "07:00")}
                >
                  <CardContent className="p-2.5">
                    <p className="text-[9px] font-semibold uppercase leading-tight mb-1 text-slate-600">
                      Disponibles 07:00
                    </p>
                    <p className="text-xl font-bold text-slate-900">{cortes.at07}</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${activeCorte === "14:00" ? "ring-2 ring-offset-1" : ""}`}
                  onClick={() => setActiveCorte(activeCorte === "14:00" ? null : "14:00")}
                >
                  <CardContent className="p-2.5">
                    <p className="text-[9px] font-semibold uppercase leading-tight mb-1 text-slate-600">
                      Disponibles 14:00
                    </p>
                    <p className="text-xl font-bold text-slate-900">{cortes.at14}</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${activeCorte === "15:00" ? "ring-2 ring-offset-1" : ""}`}
                  onClick={() => setActiveCorte(activeCorte === "15:00" ? null : "15:00")}
                >
                  <CardContent className="p-2.5">
                    <p className="text-[9px] font-semibold uppercase leading-tight mb-1 text-slate-600">
                      Disponibles 15:00
                    </p>
                    <p className="text-xl font-bold text-slate-900">{cortes.at15}</p>
                  </CardContent>
                </Card>
              </div>

              {/* ── Tabla: empleados CON fichaje ── */}
              {!["ausentes", "no_maestra"].includes(filterTab) && (
                filteredRows.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No hay registros en esta categoría.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">ID</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Empleado</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Dpto.</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Equipo</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Turno</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">H. esp.</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">1er marcaje</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Últ. marcaje</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Retraso</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Presencia</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Incidencias</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredRows.map(emp => (
                          <tr key={emp.employee_id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                              emp.alertaPresenciaConAusencia ? "bg-yellow-50/50" :
                              emp.incongruencias.length > 0 ? "bg-purple-50/30" :
                              emp.esRetraso && emp.incidenciaJornada ? "bg-red-50/30" :
                              emp.esRetraso ? "bg-orange-50/30" :
                              emp.incidenciaJornada ? "bg-amber-50/30" : ""
                            }`}>
                            <td className="px-3 py-2 text-slate-400 font-mono">{emp.employee_id}</td>
                            <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{emp.employee_name}</td>
                            <td className="px-3 py-2 text-slate-600">{emp.departamento}</td>
                            <td className="px-3 py-2 text-slate-500">{emp.equipo}</td>
                            <td className="px-3 py-2 text-slate-500">{emp.turnoReal || emp.tipoTurno}</td>
                            <td className="px-3 py-2">
                              {emp.horaEsperada
                                ? <Badge className="bg-slate-100 text-slate-700 font-mono">{emp.horaEsperada}</Badge>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              <Badge className={`font-mono ${emp.esRetraso ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}`}>
                                {emp.primerMarcaje}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              {emp.totalMarcajes > 1
                                ? <Badge className="bg-blue-100 text-blue-800 font-mono">{emp.ultimoMarcaje}</Badge>
                                : <span className="text-slate-400 italic">1 marcaje</span>}
                            </td>
                            <td className="px-3 py-2">
                              {emp.esRetraso
                                ? <Badge className="bg-orange-100 text-orange-700">+{emp.retrasoMin} min</Badge>
                                : emp.horaEsperada
                                  ? <Badge className="bg-green-100 text-green-700">A tiempo</Badge>
                                  : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`font-medium ${emp.incidenciaJornada ? "text-amber-700" : "text-slate-700"}`}>
                                {formatMin(emp.presenciaMin)}
                              </span>
                              {emp.duracionEsperadaMin && (
                                <div className="text-[9px] text-slate-400">de {formatMin(emp.duracionEsperadaMin)}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 max-w-[260px]">
                              <div className="space-y-1">
                                {emp.alertaPresenciaConAusencia && (
                                  <div className="flex flex-col gap-1 bg-yellow-100 rounded p-1">
                                    <div className="flex items-start gap-1">
                                      <Bell className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
                                      <span className="text-yellow-800 text-[10px] leading-tight font-medium">
                                        ALERTA: Ha fichado pero tiene ausencia activa ({emp.ausencia?.tipo || "ausencia"}).
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      className="self-start text-[10px] text-yellow-800 underline underline-offset-2"
                                      onClick={() => handleOpenEditAbsence(emp)}
                                    >
                                      Gestionar ausencia
                                    </button>
                                    {emp.ausencia && (emp.ausencia.fecha_fin_desconocida || !emp.ausencia.fecha_fin) && (
                                      <button
                                        type="button"
                                        className="self-start text-[10px] text-red-700 underline underline-offset-2"
                                        onClick={() => finalizeAbsenceMutation.mutate({ empRow: emp })}
                                        disabled={finalizeAbsenceMutation.isPending}
                                      >
                                        {finalizeAbsenceMutation.isPending ? "Finalizando..." : "Finalizar ausencia por fichaje"}
                                      </button>
                                    )}
                                  </div>
                                )}
                                {emp.incongruencias.map((inc, i) => (
                                  <div key={i} className="flex items-start gap-1">
                                    <AlertTriangle className="w-3 h-3 text-purple-500 mt-0.5 shrink-0" />
                                    <span className="text-purple-700 text-[10px] leading-tight">{inc}</span>
                                  </div>
                                ))}
                                {emp.incidenciaJornada && (
                                  <div className="flex items-start gap-1">
                                    <Clock className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                    <span className="text-amber-700 text-[10px] leading-tight">{emp.incidenciaJornada}</span>
                                  </div>
                                )}
                                {emp.estado === "ok" && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    <span className="text-green-600 text-[10px]">Sin incidencias</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* ── Tabla: sin presencia ── */}
              {filterTab === "ausentes" && (
                result.sinRegistro.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>Todos los empleados con horario configurado han fichado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">ID</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Empleado</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Departamento</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Equipo</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">H. esperada</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Estado ausencia</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-600">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {result.sinRegistro.map(emp => (
                          <tr key={emp.id} className={`hover:bg-slate-50 ${emp.alertaFaltaAusencia ? "bg-red-50/40" : "bg-slate-50/30"}`}>
                            <td className="px-3 py-2 text-slate-500 font-mono">{emp.codigo_empleado}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{emp.nombre}</td>
                            <td className="px-3 py-2 text-slate-600">{emp.departamento || "—"}</td>
                            <td className="px-3 py-2 text-slate-500">{emp.equipo || "—"}</td>
                            <td className="px-3 py-2">
                              <Badge className="bg-slate-100 text-slate-600 font-mono">{getHoraEsperada(emp)}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              {emp.ausenciaConfirmada ? (
                                <Badge className="bg-blue-100 text-blue-700">{emp.ausencia?.tipo || "Registrada"}</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700">Sin ausencia</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {emp.ausenciaConfirmada ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                  <span className="text-blue-700 text-[10px]">Confirmada</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="flex items-start gap-1"
                                  onClick={() => handleOpenCreateAbsence(emp)}
                                >
                                  <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                                  <span className="text-red-700 text-[10px] font-medium underline underline-offset-2">
                                    Crear ausencia en RRHH
                                  </span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* ── Tabla: no en maestra ── */}
              {filterTab === "no_maestra" && (
                <div className="overflow-x-auto rounded-lg border border-amber-200">
                  <table className="w-full text-xs">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-amber-700">ID</th>
                        <th className="text-left px-3 py-2 font-medium text-amber-700">Nombre</th>
                        <th className="text-left px-3 py-2 font-medium text-amber-700">Marcajes</th>
                        <th className="text-left px-3 py-2 font-medium text-amber-700">Incidencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {result.noEnMaestra.map(emp => (
                        <tr key={emp.employee_id} className="bg-amber-50/40">
                          <td className="px-3 py-2 font-mono text-slate-600">{emp.employee_id}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{emp.employee_name}</td>
                          <td className="px-3 py-2 text-slate-500">{emp.totalMarcajes}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="flex items-center gap-1"
                              onClick={() => handleOpenCreateEmployeeFromAttendance(emp)}
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span className="text-amber-700 text-[10px] underline underline-offset-2">
                                ID no encontrado en BD
                              </span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Nota metodología */}
              <div className="mt-2 flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>Metodología:</strong> Presencia = primer → último marcaje del día.
                  Tolerancia: <strong>{result.toleranciaEntrada} min</strong> general
                  {result.departamentosEstrictos?.length > 0 && <> · <strong>{result.toleranciaReducida} min</strong> en depts. estrictos</>}.
                  {" "}<strong>🔔 Ficha+ausencia:</strong> empleado con ausencia activa que ha fichado → revisar.
                  {" "}<strong>⚠ Sin ausencia:</strong> sin presencia y sin ausencia → crear ausencia.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {absenceDialogOpen && (
        <Dialog
          open={absenceDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setAbsenceDialogOpen(false);
              setAbsenceInitialData(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {absenceInitialData && absenceInitialData.id ? "Editar Ausencia" : "Comunicar Nueva Ausencia"}
              </DialogTitle>
            </DialogHeader>
            <AbsenceForm
              initialData={absenceInitialData}
              employees={employees}
              absenceTypes={absenceTypes}
              onSubmit={(data) => saveMutation.mutate(data)}
              onCancel={() => {
                setAbsenceDialogOpen(false);
                setAbsenceInitialData(null);
              }}
              onDelete={(id) => deleteMutation.mutate(id)}
              isSubmitting={saveMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {employeeDialogOpen && (
        <MasterEmployeeEditDialog
          employee={null}
          open={employeeDialogOpen}
          onClose={() => {
            setEmployeeDialogOpen(false);
            setEmployeeInitialData(null);
          }}
          initialData={employeeInitialData}
        />
      )}
    </div>
  );
}
