import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ClipboardCheck, 
  Upload, 
  CheckCircle2,
  Clock,
  Users,
  BarChart3,
  Brain,
  FileSearch,
  Settings
} from "lucide-react";
import AttendanceControl from "./AttendanceControl";
import AttendanceDashboard from "../components/attendance/AttendanceDashboard";
import AttendanceConfig from "../components/attendance/AttendanceConfig";
import AttendanceList from "../components/attendance/AttendanceList";
import AttendancePredictions from "../components/attendance/AttendancePredictions";
import AttendanceMonitor from "../components/attendance/AttendanceMonitor";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

// Wrapper que carga la config activa y la pasa al formulario (evita crear duplicados)
function AttendanceConfigWrapper() {
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['attendanceConfig'],
    queryFn: () => base44.entities.AttendanceConfig.list(),
    staleTime: 0,
  });

  // Usar solo la config activa más reciente; si hay varias activas, tomar la última creada
  const activeConfig = configs.find(c => c.activo) || configs[0] || null;

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return <AttendanceConfig config={activeConfig} />;
}

export default function AttendanceManagementPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendanceRecords'],
    queryFn: () => base44.entities.AttendanceRecord.list('-record_date', 500),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
  });

  const { data: predictions = [] } = useQuery({
    queryKey: ['mlPredictions'],
    queryFn: () => base44.entities.MLPrediction.list('-fecha_prediccion'),
  });

  const todayStats = useMemo(() => {
    const recordsToday = attendanceRecords.filter(r => r.record_date === selectedDate);
    return {
      total: recordsToday.length,
      presente: recordsToday.filter(r => r.direction === "E").length,
      retrasos: 0,
      ausencias: 0,
      porcentajeAsistencia: recordsToday.length > 0 ? 100 : 0
    };
  }, [attendanceRecords, selectedDate]);

  const attendancePredictions = useMemo(() => {
    return predictions.filter(p => 
      p.tipo_prediccion === "Rotación Empleado" && p.nivel_riesgo !== "Bajo"
    );
  }, [predictions]);

  return (
    <div className="h-full flex flex-col p-4 gap-4 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <ClipboardCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Gestión de Presencia</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Control de fichajes, validación de asistencia y predicciones
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-green-700 font-medium uppercase">Entradas hoy</p>
              <p className="text-xl font-bold text-green-900">{todayStats.presente}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-blue-700 font-medium uppercase">Marcajes hoy</p>
              <p className="text-xl font-bold text-blue-900">{todayStats.total}</p>
            </div>
            <Clock className="w-5 h-5 text-blue-600" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-purple-700 font-medium uppercase">Alertas ML</p>
              <p className="text-xl font-bold text-purple-900">{attendancePredictions.length}</p>
            </div>
            <Brain className="w-5 h-5 text-purple-600" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-700 font-medium uppercase">Empleados</p>
              <p className="text-xl font-bold text-slate-900">{employees.length}</p>
            </div>
            <Users className="w-5 h-5 text-slate-600" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="import" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="flex w-full flex-nowrap overflow-x-auto mb-2 shrink-0 h-auto bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-800 rounded-lg">
          <TabsTrigger value="import" className="flex-1 text-xs py-1.5">
            <Upload className="w-3 h-3 mr-1" />
            Importar
          </TabsTrigger>
          <TabsTrigger value="records" className="flex-1 text-xs py-1.5">
            <ClipboardCheck className="w-3 h-3 mr-1" />
            Registros
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex-1 text-xs py-1.5">
            <FileSearch className="w-3 h-3 mr-1" />
            Análisis
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex-1 text-xs py-1.5">
            <BarChart3 className="w-3 h-3 mr-1" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex-1 text-xs py-1.5">
            <Brain className="w-3 h-3 mr-1" />
            Predicciones
          </TabsTrigger>
          <TabsTrigger value="config" className="flex-1 text-xs py-1.5">
            <Settings className="w-3 h-3 mr-1" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto min-h-0">
          <TabsContent value="import" className="m-0">
            <AttendanceControl />
          </TabsContent>

          <TabsContent value="records" className="m-0 space-y-4">
            <AttendanceList
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </TabsContent>

          {/* Análisis: solo Monitor de presencia en tiempo real */}
          <TabsContent value="analysis" className="m-0 space-y-4">
            <AttendanceMonitor />
          </TabsContent>

          <TabsContent value="dashboard" className="m-0 space-y-4">
            <AttendanceDashboard />
          </TabsContent>

          <TabsContent value="predictions" className="m-0 space-y-4">
            <AttendancePredictions />
          </TabsContent>

          {/* Nueva pestaña Configuración */}
          <TabsContent value="config" className="m-0 space-y-4">
            <AttendanceConfigWrapper />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}