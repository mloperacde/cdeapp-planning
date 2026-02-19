import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileSpreadsheet,
  Send,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AttendanceImporter({ selectedDate, config }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
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

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Rechazar archivos Excel binarios - deben ir a AttendanceControl
    const name = selectedFile.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      toast.error(
        'Este módulo solo acepta archivos CSV. Para importar el informe de marcajes Excel del sistema de control de acceso, usa la página "Control de Presencia".',
        { duration: 6000 }
      );
      e.target.value = "";
      return;
    }

    setFile(selectedFile);
    setImportResult(null);
    setPreviewData(null);
  };

  const downloadTemplate = () => {
    const csvContent = "codigo_empleado,nombre,fecha,hora_entrada,hora_salida\n" +
      "EMP001,JUAN PEREZ,2024-01-15,07:05,15:02\n" +
      "EMP002,MARIA LOPEZ,2024-01-15,14:10,22:05\n" +
      "EMP003,ANA GARCIA,2024-01-15,,\n";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_fichajes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    if (link.parentNode) link.parentNode.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
        return { turno: "Mañana", hora_entrada: employee.horario_manana_inicio || "07:00", hora_salida: employee.horario_manana_fin || "15:00" };
      } else if (schedule?.turno === "Tarde") {
        return { turno: "Tarde", hora_entrada: employee.horario_tarde_inicio || "14:00", hora_salida: employee.horario_tarde_fin || "22:00" };
      }
    }
    return null;
  };

  const calculateTimeDiff = (time1, time2) => {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  };

  const handleImport = async () => {
    if (!file) { toast.error("Selecciona un archivo primero"); return; }

    setImporting(true);
    try {
      await base44.integrations.Core.UploadFile({ file });

      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const hasHeader = lines[0].toLowerCase().includes('codigo') || lines[0].toLowerCase().includes('nombre');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const extractedData = [];
      for (const line of dataLines) {
        const parts = line.includes(';') ? line.split(';') : line.split(',');
        if (parts.length < 3) continue;
        const codigo = parts[0]?.trim();
        const nombre = parts[1]?.trim();
        const fecha = parts[2]?.trim();
        const horaEntrada = parts[3]?.trim() || null;
        const horaSalida = parts[4]?.trim() || null;
        if (nombre || codigo) {
          extractedData.push({ codigo_empleado: codigo, nombre_empleado: nombre, fecha, hora_entrada: horaEntrada, hora_salida: horaSalida });
        }
      }

      const processedRecords = [];
      const errors = [];
      const notifications = [];

      const normalizeString = (str) => {
        if (!str) return "";
        return str.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
      };

      for (const row of extractedData) {
        let employee = null;
        if (row.codigo_empleado) employee = employees.find(e => e.codigo_empleado === row.codigo_empleado);
        if (!employee && row.nombre_empleado) {
          const normalized = normalizeString(row.nombre_empleado);
          employee = employees.find(e => normalizeString(e.nombre) === normalized);
        }
        if (!employee) { errors.push(`Empleado no encontrado: ${row.nombre_empleado || row.codigo_empleado}`); continue; }

        const expectedShift = getExpectedShift(employee, row.fecha);
        if (!expectedShift) { errors.push(`${employee.nombre}: No se pudo determinar turno programado`); continue; }

        let estado = "Presente";
        let minutosRetraso = 0;
        let minutosAdelanto = 0;
        const tolerancia = config?.tolerancia_entrada_minutos || 10;
        const toleranciaEstricta = config?.tolerancia_reducida_minutos || 5;
        const isDepartamentoEstricto = config?.departamentos_estrictos?.includes(employee.departamento);
        const toleranciaAplicable = isDepartamentoEstricto ? toleranciaEstricta : tolerancia;

        if (!row.hora_entrada && !row.hora_salida) {
          estado = "Ausencia";
          if (config?.notificar_ausencias) {
            notifications.push({ tipo: "Ausencia", empleado: employee.nombre, departamento: employee.departamento, turno: expectedShift.turno });
          }
          if (config?.auto_actualizar_disponibilidad) {
            await base44.entities.EmployeeMasterDatabase.update(employee.id, {
              disponibilidad: "Ausente", ausencia_inicio: new Date(row.fecha).toISOString(), ausencia_motivo: "Ausencia detectada por sistema de fichaje"
            });
          }
          if (config?.crear_ausencia_automatica) {
            await base44.entities.Absence.create({
              employee_id: employee.id,
              fecha_inicio: new Date(`${row.fecha}T${expectedShift.hora_entrada}`).toISOString(),
              fecha_fin: new Date(`${row.fecha}T${expectedShift.hora_salida}`).toISOString(),
              motivo: "Ausencia detectada automáticamente - Sin fichaje",
              tipo: "Ausencia injustificada", remunerada: false, notas: "Creado automáticamente por sistema de presencia"
            });
          }
        } else if (row.hora_entrada) {
          minutosRetraso = calculateTimeDiff(expectedShift.hora_entrada, row.hora_entrada);
          if (minutosRetraso > toleranciaAplicable) {
            estado = "Retraso";
            if (config?.notificar_retrasos && minutosRetraso >= (config?.notificar_retrasos_solo_si_mas_de_minutos || 15)) {
              notifications.push({ tipo: "Retraso", empleado: employee.nombre, departamento: employee.departamento, minutos: minutosRetraso });
            }
          } else {
            estado = "A tiempo";
          }
        }

        if (row.hora_salida && expectedShift.hora_salida) {
          minutosAdelanto = calculateTimeDiff(row.hora_salida, expectedShift.hora_salida);
          if (minutosAdelanto < -(config?.tolerancia_salida_minutos || 10)) estado = "Salida anticipada";
        }

        let horasTrabajadas = null;
        if (row.hora_entrada && row.hora_salida) {
          horasTrabajadas = calculateTimeDiff(row.hora_entrada, row.hora_salida) / 60;
        }

        processedRecords.push({
          employee_id: employee.id, fecha: row.fecha,
          hora_entrada_programada: expectedShift.hora_entrada, hora_salida_programada: expectedShift.hora_salida,
          hora_entrada_real: row.hora_entrada, hora_salida_real: row.hora_salida,
          turno_programado: expectedShift.turno, estado,
          minutos_retraso_entrada: Math.max(0, minutosRetraso),
          minutos_adelanto_salida: Math.abs(Math.min(0, minutosAdelanto)),
          justificado: false, origen: "Importación CSV", notificacion_enviada: false,
          horas_trabajadas: horasTrabajadas, notas: `Importado desde ${file.name}`
        });
      }

      setPreviewData({
        records: processedRecords, errors, notifications,
        stats: {
          total: processedRecords.length,
          presente: processedRecords.filter(r => r.estado === "A tiempo" || r.estado === "Presente").length,
          retrasos: processedRecords.filter(r => r.estado === "Retraso").length,
          ausencias: processedRecords.filter(r => r.estado === "Ausencia").length,
        }
      });

    } catch (error) {
      console.error('Error procesando archivo:', error);
      toast.error("Error al procesar el archivo: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    setImporting(true);
    try {
      await base44.entities.AttendanceRecord.bulkCreate(previewData.records);

      if (previewData.notifications.length > 0 && config?.destinatarios_notificaciones) {
        for (const dest of config.destinatarios_notificaciones) {
          const notifText = previewData.notifications.map(n => `- ${n.empleado} (${n.departamento}): ${n.tipo}${n.minutos ? ` - ${n.minutos} min` : ''}`).join('\n');
          await base44.integrations.Core.SendEmail({
            to: dest.email,
            subject: `Alerta de Presencia - ${format(new Date(selectedDate), "d 'de' MMMM", { locale: es })}`,
            body: `Resumen de incidencias de presencia:\n\n${notifText}\n\nRevisa el sistema para más detalles.`
          });
        }
      }

      setImportResult({ success: true, total: previewData.records.length, stats: previewData.stats, notificationsSent: previewData.notifications.length });
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(`${previewData.records.length} registros importados correctamente`);
      setFile(null);
      setPreviewData(null);
    } catch (error) {
      console.error('Error importando:', error);
      toast.error("Error al importar datos");
      setImportResult({ success: false, message: error.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Aviso de redirección para Excel de marcajes */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">¿Tienes el informe de marcajes Excel del sistema de control de acceso?</p>
          <p className="mt-1">Para importar ese archivo (columnas: ID, Empleado, Sentido, Incidencia, Centro, Departamento, Dispositivo, Fecha, Hora) usa la página 
            <Link to={createPageUrl("AttendanceControl")} className="font-bold underline ml-1">Control de Presencia →</Link>
          </p>
          <p className="mt-1 text-blue-600">Este módulo acepta únicamente archivos <strong>CSV</strong> con formato simplificado (código, nombre, fecha, hora_entrada, hora_salida).</p>
        </div>
      </div>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Importar Fichajes (CSV)</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-2">Instrucciones</h3>
            <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
              <li>Exporta los datos de fichaje en formato CSV</li>
              <li>El archivo debe contener: código/nombre empleado, fecha, hora entrada, hora salida</li>
              <li>El sistema validará automáticamente contra turnos programados</li>
              <li>Se detectarán retrasos, ausencias y salidas anticipadas</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <Button onClick={downloadTemplate} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Descargar Plantilla CSV
            </Button>
            
            <div className="flex-1">
              <input type="file" id="file-upload-attendance" accept=".csv" onChange={handleFileSelect} className="hidden" />
              <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('file-upload-attendance').click()}>
                <Upload className="w-4 h-4 mr-2" />
                Seleccionar CSV
              </Button>
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">{file.name}</span>
              </div>
              <Button onClick={handleImport} disabled={importing} className="bg-blue-600 hover:bg-blue-700">
                {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Procesar</>}
              </Button>
            </div>
          )}

          {previewData && (
            <Card className="border-2 border-blue-300">
              <CardHeader className="bg-blue-50 border-b border-blue-200">
                <CardTitle className="text-blue-900">Vista Previa de Importación</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <div className="text-2xl font-bold text-slate-900">{previewData.stats.total}</div>
                    <div className="text-xs text-slate-600">Total Registros</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-900">{previewData.stats.presente}</div>
                    <div className="text-xs text-green-700">Presentes</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-2xl font-bold text-amber-900">{previewData.stats.retrasos}</div>
                    <div className="text-xs text-amber-700">Retrasos</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-900">{previewData.stats.ausencias}</div>
                    <div className="text-xs text-red-700">Ausencias</div>
                  </div>
                </div>

                {previewData.errors.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 mb-2">
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      Errores Detectados ({previewData.errors.length})
                    </h4>
                    <ul className="text-sm text-amber-800 space-y-1">
                      {previewData.errors.slice(0, 5).map((err, i) => <li key={i}>• {err}</li>)}
                      {previewData.errors.length > 5 && <li>... y {previewData.errors.length - 5} más</li>}
                    </ul>
                  </div>
                )}

                {previewData.notifications.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">
                      <Send className="w-4 h-4 inline mr-2" />
                      Notificaciones a Enviar ({previewData.notifications.length})
                    </h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      {previewData.notifications.slice(0, 5).map((notif, i) => (
                        <li key={i}>• {notif.empleado} ({notif.departamento}): {notif.tipo}{notif.minutos && ` - ${notif.minutos} min`}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => { setPreviewData(null); setFile(null); }}>Cancelar</Button>
                  <Button onClick={handleConfirmImport} disabled={importing} className="bg-green-600 hover:bg-green-700">
                    {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Confirmar Importación</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {importResult && (
            <div className={`p-4 rounded-lg border ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-2">
                {importResult.success ? <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />}
                <div className="flex-1">
                  <p className={`font-semibold ${importResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {importResult.success ? '¡Importación Exitosa!' : 'Error en la Importación'}
                  </p>
                  {importResult.success && (
                    <div className="mt-2 space-y-1 text-sm text-green-800">
                      <p>✅ {importResult.total} registros procesados</p>
                      <p>✅ {importResult.stats.presente} presentes, {importResult.stats.retrasos} retrasos, {importResult.stats.ausencias} ausencias</p>
                      {importResult.notificationsSent > 0 && <p>📧 {importResult.notificationsSent} notificaciones enviadas</p>}
                    </div>
                  )}
                  {!importResult.success && <p className="text-sm mt-1 text-red-800">{importResult.message}</p>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {config && (
        <Card className="bg-slate-50 border border-slate-200">
          <CardHeader><CardTitle className="text-base">Configuración Activa</CardTitle></CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-slate-600">Tolerancia entrada:</p><p className="font-semibold">{config.tolerancia_entrada_minutos} min</p></div>
              <div><p className="text-slate-600">Ausente después de:</p><p className="font-semibold">{config.marcar_ausente_despues_de_minutos} min</p></div>
              <div><p className="text-slate-600">Auto-actualizar:</p><Badge className={config.auto_actualizar_disponibilidad ? "bg-green-600" : "bg-slate-400"}>{config.auto_actualizar_disponibilidad ? "SÍ" : "NO"}</Badge></div>
              <div><p className="text-slate-600">Predicciones ML:</p><Badge className={config.activar_predicciones_ml ? "bg-purple-600" : "bg-slate-400"}>{config.activar_predicciones_ml ? "SÍ" : "NO"}</Badge></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}