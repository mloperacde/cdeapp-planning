import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Database,
  Trash2,
  ArrowLeft,
  Loader2,
  Users,
  CalendarDays
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function SystemHealthPage() {
  const [syncingEmployees, setSyncingEmployees] = useState(false);
  const [syncReport, setSyncReport] = useState(null);
  const [cleaningData, setCleaningData] = useState(false);

  const { data: employeesMaster = [], refetch: refetchMaster } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: []
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: []
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      return (Array.isArray(data) ? data : [])
        .map(m => ({
          id: m.id,
          nombre: m.nombre || '',
          codigo: m.codigo_maquina || m.codigo || '',
          orden: m.orden_visualizacion || 999
        }))
        .sort((a, b) => (a.orden || 999) - (b.orden || 999));
    },
    initialData: []
  });

  const handleSyncEmployees = async () => {
    setSyncingEmployees(true);
    setSyncReport(null);
    
    try {
      const response = await base44.functions.invoke('syncEmployeeData');
      setSyncReport(response.data);
      
      if (response.data.success) {
        toast.success('Sincronización completada');
        refetchMaster();
      } else {
        toast.error('Sincronización completada con errores');
      }
    } catch (error) {
      toast.error('Error en sincronización: ' + error.message);
      setSyncReport({ success: false, error: error.message });
    } finally {
      setSyncingEmployees(false);
    }
  };

  const handleCleanDuplicates = async () => {
    if (!confirm('⚠️ Esta acción eliminará registros duplicados. ¿Continuar?')) return;
    
    setCleaningData(true);
    try {
      await base44.functions.invoke('cleanDuplicateRoles');
      toast.success('Limpieza completada');
      refetchMaster();
    } catch (error) {
      toast.error('Error en limpieza: ' + error.message);
    } finally {
      setCleaningData(false);
    }
  };

  // Calcular estadísticas de salud
  const healthStats = {
    empleados_master: employeesMaster.length,
    empleados_activos: employeesMaster.filter(e => e.estado_empleado === 'Alta').length,
    empleados_disponibles: employeesMaster.filter(e => e.disponibilidad === 'Disponible').length,
    empleados_ausentes: employeesMaster.filter(e => e.disponibilidad === 'Ausente').length,
    ausencias_activas: absences.filter(a => {
      const now = new Date();
      const start = new Date(a.fecha_inicio);
      const end = a.fecha_fin_desconocida ? new Date('2099-12-31') : new Date(a.fecha_fin);
      return now >= start && now <= end;
    }).length,
    maquinas_total: machines.length,
    empleados_sin_departamento: employeesMaster.filter(e => !e.departamento).length,
    empleados_sin_equipo: employeesMaster.filter(e => !e.equipo && e.tipo_turno === 'Rotativo').length,
    empleados_sin_taquilla: employeesMaster.filter(e => !e.taquilla_numero).length,
  };

  const healthScore = ((
    (healthStats.empleados_sin_departamento === 0 ? 25 : 0) +
    (healthStats.empleados_sin_equipo === 0 ? 25 : 0) +
    (healthStats.empleados_sin_taquilla < 5 ? 25 : 0) +
    (healthStats.empleados_disponibles > 0 ? 25 : 0)
  ));

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            Salud del Sistema
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Monitoreo, sincronización y limpieza de datos
          </p>
        </div>

        {/* Score de Salud */}
        <Card className={`mb-6 shadow-xl border-2 ${
          healthScore >= 75 ? 'border-green-300 bg-green-50 dark:bg-green-900/20' :
          healthScore >= 50 ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' :
          'border-red-300 bg-red-50 dark:bg-red-900/20'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">Puntuación de Salud</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {healthScore >= 75 ? '✅ Sistema en buen estado' :
                   healthScore >= 50 ? '⚠️ Requiere atención' :
                   '🔴 Acción inmediata requerida'}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-5xl font-bold ${
                  healthScore >= 75 ? 'text-green-600' :
                  healthScore >= 50 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {healthScore}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Empleados Activos</p>
                  <p className="text-2xl font-bold text-blue-900">{healthStats.empleados_activos}</p>
                  <p className="text-xs text-blue-600">de {healthStats.empleados_master} total</p>
                </div>
                <Users className="w-10 h-10 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Disponibles</p>
                  <p className="text-2xl font-bold text-green-900">{healthStats.empleados_disponibles}</p>
                  <p className="text-xs text-green-600">{healthStats.empleados_ausentes} ausentes</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Ausencias Activas</p>
                  <p className="text-2xl font-bold text-orange-900">{healthStats.ausencias_activas}</p>
                  <p className="text-xs text-orange-600">de {absences.length} total</p>
                </div>
                <CalendarDays className="w-10 h-10 text-orange-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Indicadores de Calidad de Datos */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Calidad de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-sm font-medium">Empleados sin departamento</span>
                <Badge className={healthStats.empleados_sin_departamento === 0 ? "bg-green-600" : "bg-red-600"}>
                  {healthStats.empleados_sin_departamento}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-sm font-medium">Empleados sin equipo (rotativos)</span>
                <Badge className={healthStats.empleados_sin_equipo === 0 ? "bg-green-600" : "bg-red-600"}>
                  {healthStats.empleados_sin_equipo}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-sm font-medium">Empleados sin taquilla asignada</span>
                <Badge className={healthStats.empleados_sin_taquilla < 5 ? "bg-green-600" : "bg-yellow-600"}>
                  {healthStats.empleados_sin_taquilla}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acciones de Mantenimiento */}
        <Card className="shadow-lg mb-6">
          <CardHeader className="border-b">
            <CardTitle>Acciones de Mantenimiento</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Sincronizar Empleados
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Actualiza disponibilidad, completa datos faltantes y normaliza formatos
                </p>
              </div>
              <Button
                onClick={handleSyncEmployees}
                disabled={syncingEmployees}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {syncingEmployees ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Ejecutar Sync
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Limpiar Duplicados
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Elimina registros duplicados en roles y configuraciones
                </p>
              </div>
              <Button
                onClick={handleCleanDuplicates}
                disabled={cleaningData}
                variant="destructive"
              >
                {cleaningData ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Limpiando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpiar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reporte de Sincronización */}
        {syncReport && (
          <Card className={`shadow-xl border-2 ${
            syncReport.success ? 'border-green-300' : 'border-red-300'
          }`}>
            <CardHeader className={
              syncReport.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
            }>
              <CardTitle className="flex items-center gap-2">
                {syncReport.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Sincronización Exitosa
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Error en Sincronización
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {syncReport.stats && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-blue-700">{syncReport.stats.total_procesados}</p>
                      <p className="text-xs text-blue-600">Procesados</p>
                    </div>
                    <div className="text-center p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-green-700">{syncReport.stats.disponibilidad_actualizada}</p>
                      <p className="text-xs text-green-600">Disponibilidad</p>
                    </div>
                    <div className="text-center p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-purple-700">{syncReport.stats.datos_completados}</p>
                      <p className="text-xs text-purple-600">Datos Completados</p>
                    </div>
                    <div className="text-center p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-indigo-700">{syncReport.stats.equipos_asignados}</p>
                      <p className="text-xs text-indigo-600">Equipos Asignados</p>
                    </div>
                    <div className="text-center p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-orange-700">{syncReport.stats.fechas_normalizadas}</p>
                      <p className="text-xs text-orange-600">Fechas Normalizadas</p>
                    </div>
                    <div className="text-center p-3 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-teal-700">{syncReport.stats.taquillas_asignadas}</p>
                      <p className="text-xs text-teal-600">Taquillas Asignadas</p>
                    </div>
                  </div>

                  {syncReport.stats.errores && syncReport.stats.errores.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                        ❌ Errores ({syncReport.stats.errores.length}):
                      </h4>
                      <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 ml-4 list-disc max-h-40 overflow-y-auto">
                        {syncReport.stats.errores.map((e, i) => (
                          <li key={i}><strong>{e.empleado}:</strong> {e.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 dark:text-slate-400 pt-4 border-t">
                    <p>Timestamp: {new Date(syncReport.timestamp).toLocaleString('es-ES')}</p>
                  </div>
                </>
              )}

              {syncReport.error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-lg p-4">
                  <p className="text-sm text-red-800 dark:text-red-200">{syncReport.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
