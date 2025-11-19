import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ClipboardCheck, 
  Upload, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserX,
  Users,
  Settings,
  BarChart3,
  Brain,
  FileSearch
} from "lucide-react";
import AttendanceImporter from "../components/attendance/AttendanceImporter";
import AttendanceDashboard from "../components/attendance/AttendanceDashboard";
import AttendanceConfig from "../components/attendance/AttendanceConfig";
import AttendanceList from "../components/attendance/AttendanceList";
import AttendancePredictions from "../components/attendance/AttendancePredictions";
import AttendanceAnalysisReport from "../components/attendance/AttendanceAnalysisReport";
import AttendanceMonitor from "../components/attendance/AttendanceMonitor";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AttendanceManagementPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();

  const { data: attendanceRecords } = useQuery({
    queryKey: ['attendanceRecords'],
    queryFn: () => base44.entities.AttendanceRecord.list('-fecha'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: config } = useQuery({
    queryKey: ['attendanceConfig'],
    queryFn: async () => {
      const configs = await base44.entities.AttendanceConfig.list();
      return configs.find(c => c.activo) || null;
    },
  });

  const { data: predictions } = useQuery({
    queryKey: ['mlPredictions'],
    queryFn: () => base44.entities.MLPrediction.list('-fecha_prediccion'),
    initialData: [],
  });

  const todayStats = useMemo(() => {
    const recordsToday = attendanceRecords.filter(r => r.fecha === selectedDate);
    
    const stats = {
      total: recordsToday.length,
      presente: recordsToday.filter(r => r.estado === "A tiempo" || r.estado === "Presente").length,
      retrasos: recordsToday.filter(r => r.estado === "Retraso").length,
      ausencias: recordsToday.filter(r => r.estado === "Ausencia").length,
      salidaAnticipada: recordsToday.filter(r => r.estado === "Salida anticipada").length,
      justificados: recordsToday.filter(r => r.justificado).length,
      porcentajeAsistencia: recordsToday.length > 0 
        ? Math.round((recordsToday.filter(r => r.estado !== "Ausencia").length / recordsToday.length) * 100)
        : 0
    };

    return stats;
  }, [attendanceRecords, selectedDate]);

  const attendancePredictions = useMemo(() => {
    return predictions.filter(p => 
      p.tipo_prediccion === "Rotación Empleado" && 
      p.nivel_riesgo !== "Bajo"
    );
  }, [predictions]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-blue-600" />
            Gestión de Presencia
          </h1>
          <p className="text-slate-600 mt-1">
            Control de fichajes, validación de asistencia y predicciones ML
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Presentes</p>
                  <p className="text-2xl font-bold text-green-900">{todayStats.presente}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Retrasos</p>
                  <p className="text-2xl font-bold text-amber-900">{todayStats.retrasos}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Ausencias</p>
                  <p className="text-2xl font-bold text-red-900">{todayStats.ausencias}</p>
                </div>
                <UserX className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">% Asistencia</p>
                  <p className="text-2xl font-bold text-blue-900">{todayStats.porcentajeAsistencia}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium">Total Registros</p>
                  <p className="text-2xl font-bold text-purple-900">{todayStats.total}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {attendancePredictions.length > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300">
            <CardContent className="p-4">
              <div className="space-y-2">
                {attendancePredictions.slice(0, 3).map(pred => {
                  const employee = employees.find(e => e.id === pred.employee_id);
                  if (!employee) return null;
                  
                  return (
                    <div key={pred.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3">
                        <AlertCircle className={`w-5 h-5 ${
                          pred.nivel_riesgo === "Crítico" ? "text-red-600" :
                          pred.nivel_riesgo === "Alto" ? "text-orange-600" :
                          "text-yellow-600"
                        }`} />
                        <div>
                          <p className="font-semibold text-slate-900">{employee.nombre}</p>
                          <p className="text-xs text-slate-600">
                            {pred.probabilidad}% probabilidad de rotación
                          </p>
                        </div>
                      </div>
                      <Badge className={
                        pred.nivel_riesgo === "Crítico" ? "bg-red-600" :
                        pred.nivel_riesgo === "Alto" ? "bg-orange-600" :
                        "bg-yellow-600"
                      }>
                        {pred.nivel_riesgo}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </TabsTrigger>
            <TabsTrigger value="analysis">
              <FileSearch className="w-4 h-4 mr-2" />
              Análisis
            </TabsTrigger>
            <TabsTrigger value="records">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Registros
            </TabsTrigger>
            <TabsTrigger value="dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="predictions">
              <Brain className="w-4 h-4 mr-2" />
              Predicciones ML
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <AttendanceImporter
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              config={config}
            />
          </TabsContent>

          <TabsContent value="analysis">
            <AttendanceAnalysisReport />
          </TabsContent>

          <TabsContent value="records">
            <AttendanceList
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </TabsContent>

          <TabsContent value="dashboard">
            <AttendanceDashboard />
          </TabsContent>

          <TabsContent value="predictions">
            <AttendancePredictions />
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <AttendanceMonitor />
        </div>
        
        <div className="mt-6">
          <AttendanceConfig config={config} />
        </div>
      </div>
    </div>
  );
}