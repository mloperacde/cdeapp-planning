import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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

export default function AttendanceManagementPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: attendanceRecords } = useQuery({
    queryKey: ['attendanceRecords'],
    queryFn: () => base44.entities.AttendanceRecord.list('-fecha'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
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
    <div className="h-full flex flex-col p-2 gap-2 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header Section Compact */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <ClipboardCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Gestión de Presencia
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Control de fichajes, validación de asistencia y predicciones ML
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col gap-2">
        {/* Summary Cards - Scrollable horizontally on small screens if needed, or wrap */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 shrink-0">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-green-700 font-medium uppercase">Presentes</p>
                <p className="text-xl font-bold text-green-900">{todayStats.presente}</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-amber-700 font-medium uppercase">Retrasos</p>
                <p className="text-xl font-bold text-amber-900">{todayStats.retrasos}</p>
              </div>
              <Clock className="w-5 h-5 text-amber-600" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-red-700 font-medium uppercase">Ausencias</p>
                <p className="text-xl font-bold text-red-900">{todayStats.ausencias}</p>
              </div>
              <UserX className="w-5 h-5 text-red-600" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-blue-700 font-medium uppercase">% Asistencia</p>
                <p className="text-xl font-bold text-blue-900">{todayStats.porcentajeAsistencia}%</p>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm hidden md:block">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-purple-700 font-medium uppercase">Total</p>
                <p className="text-xl font-bold text-purple-900">{todayStats.total}</p>
              </div>
              <Users className="w-5 h-5 text-purple-600" />
            </CardContent>
          </Card>
        </div>

        {attendancePredictions.length > 0 && (
          <div className="shrink-0 bg-white p-2 rounded-lg border border-purple-200 flex gap-2 overflow-x-auto">
             {/* Simplified predictions view if needed */}
             {attendancePredictions.slice(0, 3).map(pred => {
                  const employee = employees.find(e => e.id === pred.employee_id);
                  if (!employee) return null;
                  return (
                    <div key={pred.id} className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-100 min-w-[200px]">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <div className="flex-1 overflow-hidden">
                           <p className="text-xs font-bold truncate">{employee.nombre}</p>
                           <p className="text-[10px]">{pred.probabilidad}% prob.</p>
                        </div>
                    </div>
                  )
             })}
          </div>
        )}

        <Tabs defaultValue="import" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex w-full flex-nowrap overflow-x-auto mb-2 shrink-0 h-auto bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-800 rounded-lg">
            <TabsTrigger value="import" className="flex-1 text-xs py-1.5">
              <Upload className="w-3 h-3 mr-2" />
              Importar
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex-1 text-xs py-1.5">
              <FileSearch className="w-3 h-3 mr-2" />
              Análisis
            </TabsTrigger>
            <TabsTrigger value="records" className="flex-1 text-xs py-1.5">
              <ClipboardCheck className="w-3 h-3 mr-2" />
              Registros
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex-1 text-xs py-1.5">
              <BarChart3 className="w-3 h-3 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex-1 text-xs py-1.5">
              <Brain className="w-3 h-3 mr-2" />
              Predicciones
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            <TabsContent value="import" className="m-0 space-y-4">
              <AttendanceImporter
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                config={config}
              />
            </TabsContent>

            <TabsContent value="analysis" className="m-0 space-y-4">
              <AttendanceAnalysisReport />
            </TabsContent>

            <TabsContent value="records" className="m-0 space-y-4">
              <AttendanceList
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </TabsContent>

            <TabsContent value="dashboard" className="m-0 space-y-4">
              <AttendanceDashboard />
            </TabsContent>

            <TabsContent value="predictions" className="m-0 space-y-4">
              <AttendancePredictions />
            </TabsContent>
          </div>
        </Tabs>

        <div className="shrink-0">
           {/* Monitor moved to bottom or maybe integrated elsewhere? 
               It was at the bottom in original.
           */}
           <AttendanceMonitor />
        </div>
      </div>
    </div>
  );
}
