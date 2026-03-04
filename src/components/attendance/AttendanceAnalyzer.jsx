import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppData } from "@/components/data/DataProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  UserX,
  AlertTriangle,
  Send,
  XCircle,
  FileQuestion
} from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function AttendanceAnalyzer() {
  // Debug: Component Loaded
  console.log("AttendanceAnalyzer loaded");
  // FIX: Ensure initial state is a valid string date, avoiding 'Invalid time value' on mount
  const [selectedDate, setSelectedDate] = useState(() => {
     try {
       return format(new Date(), 'yyyy-MM-dd');
     } catch (e) {
       return new Date().toISOString().split('T')[0];
     }
  });
  const queryClient = useQueryClient();
  const { employees: employeesData } = useAppData();

  const employees = employeesData || [];

  const { data: attendanceRecords } = useQuery({
    queryKey: ['attendanceRecords', selectedDate],
    queryFn: async () => {
      // Intentar cargar registros locales
      // Si selectedDate es inválido, devolver vacío para evitar crash
      if (!selectedDate || selectedDate === 'Invalid Date') return [];
      
      const records = await base44.entities.AttendanceRecord.filter({ record_date: selectedDate });
      
      // Si no hay registros locales, quizás no se han sincronizado o están en formato antiguo
      // En este caso, el analyzer depende totalmente de lo que haya en la base de datos
      // tras la sincronización manual desde AttendanceControl.
      return records;
    },
    initialData: [],
    staleTime: 60 * 1000,
  });

  const { data: absences } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: teamSchedules } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(),
    initialData: [],
  });

  const { data: config } = useQuery({
    queryKey: ['attendanceConfig'],
    queryFn: async () => {
      const configs = await base44.entities.AttendanceConfig.list();
      return configs.find(c => c.activo) || null;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createAbsenceMutation = useMutation({
    mutationFn: (data) => base44.entities.Absence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (incident) => {
      const result = await base44.entities.AttendanceIncident.create(incident);
      // Notify HR if high severity
      if (incident.severity === 'high' || incident.severity === 'critical') {
        const { notifyAttendanceDiscrepancy } = await import("../notifications/AdvancedNotificationService");
        await notifyAttendanceDiscrepancy(
          result.id, 
          incident.employee_name_ref, // Pass name for notification
          incident.description, 
          incident.severity
        );
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Incidencia registrada y notificada a RRHH");
    },
    onError: () => toast.error("Error al registrar incidencia")
  });

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [selectedIncident, setSelectedIncident] = useState(null);

  const handleAnalyzeWithAI = async () => {
    setAnalyzing(true);
    try {
      // Prepare data summary for AI (Lightweight version)
      const summary = {
        date: selectedDate,
        stats: {
           expected: analysis.totalExpected,
           incidents: analysis.totalIncidents
        },
        // Limit incidents to avoid token limit
        top_incidents: analysis.incidents.slice(0, 50).map(i => ({
          type: i.type,
          dept: i.department,
          msg: i.message
        })),
        dept_stats: Object.entries(analysis.byDepartment).map(([d, s]) => ({
           dept: d,
           absent: s.absent,
           late: s.late,
           unreg: s.unregistered
        }))
      };

      // Use a safer call structure or mock if LLM is unavailable/failing
      // The 500 error suggests the backend function 'InvokeLLM' is failing or timing out
      // We'll wrap this in a more robust error handler and maybe simplify the prompt
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze attendance data (JSON). Spanish language. Brief points.
        Data: ${JSON.stringify(summary)}`,
        response_json_schema: {
          type: "object",
          properties: {
            patterns: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            risk_assessment: { type: "string" }
          }
        }
      });

      setAiAnalysis(response);
      toast.success("Análisis de IA completado");
    } catch (error) {
      console.error("AI Analysis failed:", error);
      // Fallback UI for error
      toast.error("El servicio de IA no está disponible en este momento. Intente más tarde.");
      setAiAnalysis({
         patterns: ["No se pudo completar el análisis automático."],
         recommendations: ["Revise los datos manualmente en la tabla inferior."],
         risk_assessment: "Desconocido (Error de servicio)"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFlagIncident = (incident) => {
    setSelectedIncident(incident);
  };

  const submitIncidentFlag = () => {
    if (!selectedIncident) return;

    createIncidentMutation.mutate({
      employee_id: selectedIncident.employee.id,
      date: selectedDate,
      type: mapIncidentTypeToEnum(selectedIncident.type),
      severity: selectedIncident.severity,
      description: selectedIncident.message,
      manager_comment: commentText,
      flagged_by: currentUser?.id,
      employee_name_ref: selectedIncident.employee.nombre // For notification helper
    });
    setSelectedIncident(null);
    setCommentText("");
  };

  const mapIncidentTypeToEnum = (type) => {
    if (type === 'late') return 'late_arrival';
    if (type === 'early_exit') return 'early_exit';
    if (type === 'absence_no_record' || type === 'unregistered_no_absence') return 'unreported_absence';
    if (type === 'presence_during_absence') return 'presence_during_absence';
    return 'other';
  };

  const getExpectedShift = (employee, date) => {
    // Basic shifts
    if (employee.tipo_turno === "Fijo Mañana") {
      return {
        turno: "Mañana",
        hora_entrada: employee.horario_manana_inicio || "07:00",
        hora_salida: employee.horario_manana_fin || "15:00"
      };
    } else if (employee.tipo_turno === "Fijo Tarde") {
      return {
        turno: "Tarde",
        hora_entrada: employee.horario_tarde_inicio || "14:00",
        hora_salida: employee.horario_tarde_fin || "22:00"
      };
    } else if (employee.tipo_turno === "Rotativo" && employee.equipo) {
      try {
        const weekStart = startOfWeek(new Date(date), { weekStartsOn: 1 });
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const team = teams.find(t => t.team_name === employee.equipo);
        const schedule = teamSchedules.find(s => 
          s.team_key === team?.team_key && s.fecha_inicio_semana === weekStartStr
        );
        
        if (schedule?.turno === "Mañana") {
          return {
            turno: "Mañana",
            hora_entrada: employee.horario_manana_inicio || "07:00",
            hora_salida: employee.horario_manana_fin || "15:00"
          };
        } else if (schedule?.turno === "Tarde") {
          return {
            turno: "Tarde",
            hora_entrada: employee.horario_tarde_inicio || "14:00",
            hora_salida: employee.horario_tarde_fin || "22:00"
          };
        }
      } catch (e) {
         console.warn("Error calculating shift for", employee.nombre, e);
      }
    }
    
    // Default fallback shift
    return null; 
  };

  const hasAbsenceForDate = (employeeId, date) => {
    try {
      if (!date || date === 'Invalid Date') return false;
      // Convert check date to string YYYY-MM-DD for simpler comparison
      const checkDateStr = date instanceof Date ? date.toISOString().split('T')[0] : String(date).split('T')[0];
      
      return absences.some(abs => {
        // Consider pending absences as valid for attendance check
        if (abs.estado_aprobacion === 'Rechazada') return false;
        if (!abs.fecha_inicio) return false;
        
        const start = new Date(abs.fecha_inicio).toISOString().split('T')[0];
        // Handle unknown end date as "forever" or far future
        const end = abs.fecha_fin_desconocida ? '2099-12-31' : new Date(abs.fecha_fin || abs.fecha_inicio).toISOString().split('T')[0];
        
        // Strict string comparison to avoid timezone issues with Date objects
        return String(abs.employee_id) === String(employeeId) && checkDateStr >= start && checkDateStr <= end;
      });
    } catch (e) {
      console.warn("Error in hasAbsenceForDate:", e);
      return false;
    }
  };

  const normalizeId = (v) => (v == null ? "" : String(v).trim());

  const analysis = useMemo(() => {
    // Debug: Log analysis start
    console.log("Analyzing for date:", selectedDate);
    console.log("Total Employees Loaded:", employees.length);
    console.log("Total Records Loaded:", attendanceRecords.length);

    const expectedEmployees = employees.filter(emp => {
      const code = emp.codigo_empleado ? String(emp.codigo_empleado) : "";
      if (code === "999" || code === "998" || code === "997") return false;
      // Relaxed check: Include everyone unless explicitly excluded, even if shift is unknown
      return emp.incluir_en_planning !== false;
    });

    console.log("Expected Employees:", expectedEmployees.length);

    const byDepartment = {};
    const incidents = [];

    expectedEmployees.forEach(emp => {
      const dept = emp.departamento || "Sin Departamento";
      if (!byDepartment[dept]) {
        byDepartment[dept] = {
          expected: 0,
          present: 0,
          absent: 0,
          late: 0,
          unregistered: 0,
          incidents: []
        };
      }

      byDepartment[dept].expected++;

      const record = attendanceRecords.find(r => {
        // Normalización estricta para evitar falsos negativos
        const rId = normalizeId(r.employee_id);
        const empId = normalizeId(emp.id);
        const empCode = normalizeId(emp.codigo_empleado);
        
        // 1. Coincidencia directa por ID interno
        if (rId === empId) return true;
        // 2. Coincidencia por código de empleado (cruce externo)
        if (empCode && rId === empCode) return true;
        
        // 3. Coincidencia por nombre (fallback desesperado para importaciones v2)
        // A veces el employee_id en sync_v2 es "UNKNOWN" o un código raro, pero el nombre está
        // Usar primer apellido o nombre completo normalizado
        if (r.employee_name && emp.nombre) {
           const rName = normalizeId(r.employee_name);
           const empName = normalizeId(emp.nombre);
           if (rName.includes(empName) || empName.includes(rName)) return true;
           // Intento por primer token (Nombre)
           if (rName.split(' ')[0] === empName.split(' ')[0] && rName.length > 3) return true;
        }

        return false;
      });
      
      if (!record) {
        byDepartment[dept].unregistered++;
        
        // Verificar si tiene ausencia registrada
        const hasAbsence = hasAbsenceForDate(emp.id, selectedDate);
        
        if (!hasAbsence) {
          byDepartment[dept].incidents.push({
            type: "unregistered_no_absence",
            employee: emp,
            severity: "high"
          });
          
          incidents.push({
            type: "unregistered_no_absence",
            employee: emp,
            department: dept,
            message: `Sin fichaje ni ausencia registrada`,
            severity: "high"
          });
        } else {
          byDepartment[dept].incidents.push({
            type: "expected_absence",
            employee: emp,
            severity: "low"
          });
        }
      } else {
        // Calcular estado si no viene pre-calculado
        let estado = record.estado || "Presente";
        let minRetraso = record.minutos_retraso_entrada || 0;
        let minSalida = record.minutos_adelanto_salida || 0;

        // Si es importación bruta (sync_v2), calcular retrasos al vuelo
        if (record.import_batch && record.import_batch.startsWith("sync_v2")) {
           const expected = getExpectedShift(emp, selectedDate);
           if (expected && record.record_time) {
              const actualTime = record.record_time.substring(0, 5); // HH:mm
              if (actualTime > expected.hora_entrada) {
                 const [hA, mA] = actualTime.split(':').map(Number);
                 const [hE, mE] = expected.hora_entrada.split(':').map(Number);
                 const diff = (hA * 60 + mA) - (hE * 60 + mE);
                 if (diff > 5) { // Tolerancia 5 min
                    estado = "Retraso";
                    minRetraso = diff;
                 }
              }
           }
        }

        if (estado === "Ausencia") {
          byDepartment[dept].absent++;
          
          const hasAbsence = hasAbsenceForDate(emp.id, selectedDate);
          if (!hasAbsence) {
            byDepartment[dept].incidents.push({
              type: "absence_no_record",
              employee: emp,
              severity: "high"
            });
            
            incidents.push({
              type: "absence_no_record",
              employee: emp,
              department: dept,
              message: `Ausente sin registro de ausencia`,
              severity: "high"
            });
          } else {
             // Reconciliation: Recorded as "Ausencia" AND has reported Absence -> Good (Matched)
          }
        } else if (record.estado === "Presente" || record.estado === "A tiempo" || record.estado === "Retraso" || record.estado === "Salida anticipada") {
           // Reconciliation: Recorded as Present (in some form)
           const hasAbsence = hasAbsenceForDate(emp.id, selectedDate);
           if (hasAbsence) {
              // Flag discrepancy: Reported Absence BUT Presence Data Exists
              byDepartment[dept].incidents.push({
                type: "presence_during_absence",
                employee: emp,
                severity: "high"
              });

              incidents.push({
                type: "presence_during_absence",
                employee: emp,
                department: dept,
                message: `Fichaje detectado durante ausencia reportada`,
                severity: "high"
              });
           }
        }

        if (record.estado === "Retraso") {
          byDepartment[dept].present++;
          byDepartment[dept].late++;
          byDepartment[dept].incidents.push({
            type: "late",
            employee: emp,
            minutes: record.minutos_retraso_entrada,
            severity: "medium"
          });
          
          incidents.push({
            type: "late",
            employee: emp,
            department: dept,
            message: `Retraso de ${record.minutos_retraso_entrada} minutos`,
            severity: "medium"
          });
        } else if (record.estado === "Salida anticipada") {
          byDepartment[dept].present++;
          byDepartment[dept].incidents.push({
            type: "early_exit",
            employee: emp,
            minutes: record.minutos_adelanto_salida,
            severity: "medium"
          });
          
          incidents.push({
            type: "early_exit",
            employee: emp,
            department: dept,
            message: `Salida anticipada (${record.minutos_adelanto_salida} min)`,
            severity: "medium"
          });
        } else {
          byDepartment[dept].present++;
        }
      }
    });

    return {
      byDepartment,
      incidents,
      totalExpected: expectedEmployees.length,
      totalIncidents: incidents.length
    };
  }, [employees, attendanceRecords, absences, selectedDate, teams, teamSchedules]);

  const handleCreateMissingAbsences = async () => {
    const highSeverityIncidents = analysis.incidents.filter(i => 
      i.type === "absence_no_record" || i.type === "unregistered_no_absence"
    );

    if (highSeverityIncidents.length === 0) {
      toast.info("No hay ausencias sin registrar");
      return;
    }

    try {
      for (const incident of highSeverityIncidents) {
        let expectedShift = getExpectedShift(incident.employee, selectedDate);
        
        // Fallback if shift is unknown (e.g. 9-5)
        if (!expectedShift) {
           expectedShift = { hora_entrada: "09:00", hora_salida: "17:00" };
        }

        // Validate date format to prevent RangeError
        // Ensure selectedDate is YYYY-MM-DD
        const datePart = selectedDate.includes('T') ? selectedDate.split('T')[0] : selectedDate;
        const startIso = new Date(`${datePart}T${expectedShift.hora_entrada}:00`).toISOString();
        const endIso = new Date(`${datePart}T${expectedShift.hora_salida}:00`).toISOString();

        await createAbsenceMutation.mutateAsync({
          employee_id: incident.employee.id,
          fecha_inicio: startIso,
          fecha_fin: endIso,
          motivo: "Ausencia detectada automáticamente por análisis de presencia",
          tipo: "Ausencia por motivos desconocidos",
          remunerada: false,
          notas: "Creado automáticamente - Sin fichaje detectado en fecha " + format(new Date(datePart), "dd/MM/yyyy", { locale: es })
        });
      }

      // Enviar notificación a RRHH
      if (config?.destinatarios_notificaciones) {
        for (const dest of config.destinatarios_notificaciones) {
          const incidentText = highSeverityIncidents.map(i => 
            `- ${i.employee.nombre} (${i.department}): ${i.message}`
          ).join('\n');

          await base44.integrations.Core.SendEmail({
            to: dest.email,
            subject: `ALERTA: Ausencias sin registrar - ${format(new Date(selectedDate), "d 'de' MMMM", { locale: es })}`,
            body: `Se han detectado y registrado automáticamente las siguientes ausencias sin justificar:\n\n${incidentText}\n\nSe requiere revisión y justificación de Recursos Humanos.\n\nEstas ausencias han sido marcadas como "Ausencia por motivos desconocidos" y no son remuneradas hasta que se justifiquen.`
          });
        }
      }

      toast.success(`${highSeverityIncidents.length} ausencias registradas y notificaciones enviadas`);
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al crear ausencias");
    }
  };

  const getSeverityBadge = (severity) => {
    if (severity === "high") {
      return <Badge className="bg-red-600 text-white">Alta</Badge>;
    } else if (severity === "medium") {
      return <Badge className="bg-amber-600 text-white">Media</Badge>;
    } else {
      return <Badge className="bg-green-600 text-white">Baja</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Análisis Comparativo de Presencia</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Fecha a Analizar</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{analysis.totalExpected}</div>
              <div className="text-xs text-blue-700">Empleados Esperados</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-900">
                {Object.values(analysis.byDepartment).reduce((sum, dept) => sum + dept.present, 0)}
              </div>
              <div className="text-xs text-green-700">Presentes</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-900">
                {Object.values(analysis.byDepartment).reduce((sum, dept) => sum + dept.late, 0)}
              </div>
              <div className="text-xs text-amber-700">Con Retraso</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-900">{analysis.totalIncidents}</div>
              <div className="text-xs text-red-700">Incidencias Detectadas</div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleAnalyzeWithAI}
              disabled={analyzing}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {analyzing ? (
                <>Analyzing...</> 
              ) : (
                <>
                  <FileQuestion className="w-4 h-4 mr-2" />
                  Analizar Patrones con IA
                </>
              )}
            </Button>
            
            {analysis.totalIncidents > 0 && (
              <Button
                onClick={handleCreateMissingAbsences}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Registrar Ausencias (Automático)
              </Button>
            )}
          </div>

          {aiAnalysis && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4 animate-in fade-in slide-in-from-top-4">
              <h3 className="font-bold text-purple-900 flex items-center gap-2 mb-2">
                <FileQuestion className="w-5 h-5" />
                Insights de IA
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-purple-800 text-sm">Patrones Detectados:</span>
                  <ul className="list-disc list-inside text-sm text-purple-700 mt-1">
                    {aiAnalysis.patterns?.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <span className="font-semibold text-purple-800 text-sm">Recomendaciones:</span>
                  <ul className="list-disc list-inside text-sm text-purple-700 mt-1">
                    {aiAnalysis.recommendations?.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
                <div className="text-sm font-medium text-purple-900 bg-purple-100 p-2 rounded">
                  Evaluación de Riesgo: {aiAnalysis.risk_assessment}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flagging Dialog */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Reportar Incidencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{selectedIncident.employee.nombre}</p>
                <p className="text-sm text-slate-500">{selectedIncident.message}</p>
              </div>
              <div className="space-y-2">
                <Label>Comentarios del Manager</Label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Añadir contexto o justificación..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedIncident(null)}>Cancelar</Button>
                <Button onClick={submitIncidentFlag} className="bg-red-600 text-white">
                  Reportar a RRHH
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Por Departamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(analysis.byDepartment).map(([dept, data]) => (
          <Card key={dept} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base">{dept}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-600">Esperados:</span>
                  <span className="font-bold ml-1">{data.expected}</span>
                </div>
                <div>
                  <span className="text-slate-600">Presentes:</span>
                  <span className="font-bold ml-1 text-green-600">{data.present}</span>
                </div>
                <div>
                  <span className="text-slate-600">Retrasos:</span>
                  <span className="font-bold ml-1 text-amber-600">{data.late}</span>
                </div>
                <div>
                  <span className="text-slate-600">Sin fichar:</span>
                  <span className="font-bold ml-1 text-red-600">{data.unregistered}</span>
                </div>
              </div>

              {data.incidents.length > 0 && (
                <div className="space-y-2 pt-3 border-t">
                  <p className="text-xs font-semibold text-slate-700">Incidencias:</p>
                  {data.incidents.map((incident, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      {incident.severity === "high" && <AlertCircle className="w-3 h-3 text-red-600 mt-0.5" />}
                      {incident.severity === "medium" && <Clock className="w-3 h-3 text-amber-600 mt-0.5" />}
                      {incident.severity === "low" && <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5" />}
                      <div className="flex-1">
                        <div className="font-medium">{incident.employee.nombre}</div>
                        {incident.type === "unregistered_no_absence" && (
                          <div className="flex items-center gap-1 text-red-700 font-bold">
                            <FileQuestion className="w-3 h-3" />
                            Sin fichaje ni ausencia
                          </div>
                        )}
                        {incident.type === "absence_no_record" && (
                          <div className="text-red-700">Ausente sin registro</div>
                        )}
                        {incident.type === "presence_during_absence" && (
                          <div className="flex items-center gap-1 text-red-700 font-bold">
                            <XCircle className="w-3 h-3" />
                            Fichaje durante ausencia reportada
                          </div>
                        )}
                        {incident.type === "late" && (
                          <div className="text-amber-700">Retraso: {incident.minutes} min</div>
                        )}
                        {incident.type === "early_exit" && (
                          <div className="text-amber-700">Salida anticipada: {incident.minutes} min</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista detallada de incidencias */}
      {analysis.incidents.length > 0 && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Detalle de Incidencias</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2">
              {analysis.incidents.map((incident, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-3 flex-1">
                    {incident.severity === "high" && <UserX className="w-5 h-5 text-red-600" />}
                    {incident.severity === "medium" && <Clock className="w-5 h-5 text-amber-600" />}
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{incident.employee.nombre}</div>
                      <div className="text-sm text-slate-600">
                        {incident.department} • {incident.message}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(incident.severity)}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleFlagIncident(incident)}
                      className="ml-2 text-xs h-7"
                    >
                      Reportar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
