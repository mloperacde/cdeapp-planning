import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Send
} from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function AttendanceAnalyzer() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: attendanceRecords } = useQuery({
    queryKey: ['attendanceRecords', selectedDate],
    queryFn: () => base44.entities.AttendanceRecord.filter({ fecha: selectedDate }),
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

  const createAbsenceMutation = useMutation({
    mutationFn: (data) => base44.entities.Absence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
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

  const analysis = useMemo(() => {
    const expectedEmployees = employees.filter(emp => 
      emp.incluir_en_planning !== false && getExpectedShift(emp, selectedDate) !== null
    );

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

      const record = attendanceRecords.find(r => r.employee_id === emp.id);
      
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
        if (record.estado === "Ausencia") {
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
          }
        } else if (record.estado === "Retraso") {
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
        const expectedShift = getExpectedShift(incident.employee, selectedDate);
        
        await createAbsenceMutation.mutateAsync({
          employee_id: incident.employee.id,
          fecha_inicio: new Date(`${selectedDate}T${expectedShift.hora_entrada}`).toISOString(),
          fecha_fin: new Date(`${selectedDate}T${expectedShift.hora_salida}`).toISOString(),
          motivo: "Ausencia detectada automáticamente por análisis de presencia",
          tipo: "Ausencia por motivos desconocidos",
          remunerada: false,
          notas: "Creado automáticamente - Sin fichaje detectado en fecha " + format(new Date(selectedDate), "dd/MM/yyyy", { locale: es })
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

          {analysis.totalIncidents > 0 && (
            <Button
              onClick={handleCreateMissingAbsences}
              className="bg-red-600 hover:bg-red-700 w-full"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Registrar Ausencias sin Justificar y Notificar a RRHH
            </Button>
          )}
        </CardContent>
      </Card>

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
                          <div className="text-red-700">Sin fichaje ni ausencia</div>
                        )}
                        {incident.type === "absence_no_record" && (
                          <div className="text-red-700">Ausente sin registro</div>
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
                  {getSeverityBadge(incident.severity)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}