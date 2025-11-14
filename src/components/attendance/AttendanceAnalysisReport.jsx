import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Upload,
  CheckCircle2, 
  AlertCircle, 
  Clock,
  UserX,
  AlertTriangle,
  Send,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function AttendanceAnalysisReport() {
  const [file, setFile] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
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

  const getExpectedShift = (employee, date) => {
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
    } else if (employee.tipo_turno === "Turno Partido") {
      return {
        turno: "Partido",
        hora_entrada: employee.turno_partido_entrada1 || "09:00",
        hora_salida: employee.turno_partido_salida2 || "18:00"
      };
    } else if (employee.tipo_turno === "Rotativo" && employee.equipo) {
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
    }
    
    return null;
  };

  const hasAbsenceForDate = (employeeId, date) => {
    return absences.some(abs => {
      const start = new Date(abs.fecha_inicio);
      const end = new Date(abs.fecha_fin);
      const checkDate = new Date(date);
      return abs.employee_id === employeeId && checkDate >= start && checkDate <= end;
    });
  };

  const calculateTimeDiff = (time1, time2) => {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  };

  const handleAnalyze = async () => {
    if (!file || !selectedDate) {
      toast.error("Selecciona un archivo y una fecha");
      return;
    }

    setAnalyzing(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const hasHeader = lines[0].toLowerCase().includes('codigo') || 
                        lines[0].toLowerCase().includes('nombre');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const extractedData = [];
      const normalizeString = (str) => {
        if (!str) return "";
        return str.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
      };

      for (const line of dataLines) {
        const parts = line.includes(';') ? line.split(';') : line.split(',');
        if (parts.length < 3) continue;

        const codigo = parts[0]?.trim();
        const nombre = parts[1]?.trim();
        const horaEntrada = parts[3]?.trim() || null;
        const horaSalida = parts[4]?.trim() || null;

        let employee = null;
        if (codigo) {
          employee = employees.find(e => e.codigo_empleado === codigo);
        }
        if (!employee && nombre) {
          const normalized = normalizeString(nombre);
          employee = employees.find(e => normalizeString(e.nombre) === normalized);
        }

        if (employee) {
          extractedData.push({
            employee,
            hora_entrada: horaEntrada,
            hora_salida: horaSalida
          });
        }
      }

      // Analizar por departamento
      const expectedEmployees = employees.filter(emp => 
        emp.incluir_en_planning !== false && getExpectedShift(emp, selectedDate) !== null
      );

      const byDepartment = {};
      const incidents = [];
      const absencesToCreate = [];

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

        const fileRecord = extractedData.find(r => r.employee.id === emp.id);
        const expectedShift = getExpectedShift(emp, selectedDate);
        
        if (!fileRecord || (!fileRecord.hora_entrada && !fileRecord.hora_salida)) {
          byDepartment[dept].unregistered++;
          
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

            absencesToCreate.push({
              employee_id: emp.id,
              fecha_inicio: new Date(`${selectedDate}T${expectedShift.hora_entrada}`).toISOString(),
              fecha_fin: new Date(`${selectedDate}T${expectedShift.hora_salida}`).toISOString(),
              motivo: "Ausencia por motivos desconocidos - Detectada automáticamente",
              tipo: "Ausencia por motivos desconocidos",
              remunerada: false,
              notas: `Creado automáticamente el ${format(new Date(), "dd/MM/yyyy", { locale: es })} por análisis de fichajes`
            });
          }
        } else {
          const tolerancia = config?.tolerancia_entrada_minutos || 10;
          const minutosRetraso = fileRecord.hora_entrada 
            ? calculateTimeDiff(expectedShift.hora_entrada, fileRecord.hora_entrada)
            : 0;

          if (minutosRetraso > tolerancia) {
            byDepartment[dept].present++;
            byDepartment[dept].late++;
            byDepartment[dept].incidents.push({
              type: "late",
              employee: emp,
              minutes: minutosRetraso,
              severity: "medium"
            });
            
            incidents.push({
              type: "late",
              employee: emp,
              department: dept,
              message: `Retraso de ${minutosRetraso} minutos`,
              severity: "medium"
            });
          } else {
            byDepartment[dept].present++;
          }
        }
      });

      setAnalysisResult({
        byDepartment,
        incidents,
        totalExpected: expectedEmployees.length,
        totalIncidents: incidents.length,
        absencesToCreate
      });

    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al analizar el archivo");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateAbsences = async () => {
    if (!analysisResult?.absencesToCreate || analysisResult.absencesToCreate.length === 0) {
      toast.info("No hay ausencias para registrar");
      return;
    }

    try {
      await base44.entities.Absence.bulkCreate(analysisResult.absencesToCreate);

      if (config?.destinatarios_notificaciones) {
        for (const dest of config.destinatarios_notificaciones) {
          const incidentText = analysisResult.absencesToCreate.map(abs => {
            const emp = employees.find(e => e.id === abs.employee_id);
            return `- ${emp?.nombre} (${emp?.departamento})`;
          }).join('\n');

          await base44.integrations.Core.SendEmail({
            to: dest.email,
            subject: `ALERTA RRHH: Ausencias sin registrar - ${format(new Date(selectedDate), "d 'de' MMMM", { locale: es })}`,
            body: `Se han detectado y registrado automáticamente ${analysisResult.absencesToCreate.length} ausencias sin justificar:\n\n${incidentText}\n\nEstas ausencias han sido marcadas como "Ausencia por motivos desconocidos" y NO son remuneradas hasta que se justifiquen.\n\nSe requiere revisión y contacto con los empleados afectados.`
          });
        }
      }

      toast.success(`${analysisResult.absencesToCreate.length} ausencias registradas y notificaciones enviadas a RRHH`);
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      setAnalysisResult(null);
      setFile(null);
      
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al crear ausencias");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Análisis Comparativo de Fichajes</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">¿Cómo funciona?</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Selecciona la fecha que deseas analizar</li>
              <li>Sube el archivo CSV con los fichajes de esa fecha</li>
              <li>El sistema comparará con los empleados que deberían estar presentes</li>
              <li>Se detectarán ausencias, retrasos y fichajes faltantes</li>
              <li>Se crearán automáticamente registros de ausencia y se notificará a RRHH</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha a Analizar *</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Archivo de Fichajes *</Label>
              <input
                type="file"
                id="file-analysis"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('file-analysis').click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {file ? file.name : "Seleccionar Archivo"}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={!file || analyzing}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Analizar Fichajes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {analysisResult && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">{analysisResult.totalExpected}</div>
                  <div className="text-xs text-blue-700">Empleados Esperados</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">
                    {Object.values(analysisResult.byDepartment).reduce((sum, dept) => sum + dept.present, 0)}
                  </div>
                  <div className="text-xs text-green-700">Presentes</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-900">
                    {Object.values(analysisResult.byDepartment).reduce((sum, dept) => sum + dept.late, 0)}
                  </div>
                  <div className="text-xs text-amber-700">Con Retraso</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-900">{analysisResult.totalIncidents}</div>
                  <div className="text-xs text-red-700">Total Incidencias</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {analysisResult.absencesToCreate.length > 0 && (
            <Card className="border-2 border-red-300 bg-red-50">
              <CardHeader className="border-b border-red-200">
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Ausencias sin Registrar Detectadas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-red-800 mb-4">
                  Se detectaron {analysisResult.absencesToCreate.length} empleados sin fichaje y sin ausencia registrada.
                  Se crearán automáticamente registros de "Ausencia por motivos desconocidos" y se notificará a RRHH.
                </p>
                <Button
                  onClick={handleCreateAbsences}
                  className="bg-red-600 hover:bg-red-700 w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Registrar Ausencias y Notificar a RRHH
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analysisResult.byDepartment).map(([dept, data]) => (
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
                      <p className="text-xs font-semibold text-slate-700">Empleados con Incidencias:</p>
                      {data.incidents.map((incident, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs p-2 bg-slate-50 rounded">
                          {incident.severity === "high" && <AlertCircle className="w-3 h-3 text-red-600 mt-0.5" />}
                          {incident.severity === "medium" && <Clock className="w-3 h-3 text-amber-600 mt-0.5" />}
                          <div className="flex-1">
                            <div className="font-medium">{incident.employee.nombre}</div>
                            {incident.type === "unregistered_no_absence" && (
                              <div className="text-red-700">Sin fichaje ni ausencia</div>
                            )}
                            {incident.type === "late" && (
                              <div className="text-amber-700">Retraso: {incident.minutes} min</div>
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
        </>
      )}
    </div>
  );
}