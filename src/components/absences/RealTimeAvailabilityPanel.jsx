import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, UserX, RefreshCw, Clock, AlertCircle, Bot, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function RealTimeAvailabilityPanel() {
  const [employees, setEmployees] = useState([]);
  const [systemAbsences, setSystemAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const todayISO = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    const [emps, absences] = await Promise.all([
      base44.entities.EmployeeMasterDatabase.filter({ estado_empleado: 'Alta' }, undefined, 2000),
      base44.entities.Absence.list('-updated_date', 100)
    ]);

    const controlled = emps.filter(e =>
      e.sujeto_a_control_horario !== false && e.incluir_en_planning !== false
    );
    setEmployees(controlled);

    // Ausencias de hoy generadas o modificadas por el sistema
    const today = new Date(todayISO + 'T00:00:00');
    const empMap = Object.fromEntries(controlled.map(e => [e.id, e]));
    const sysEvents = absences.filter(a => {
      const isToday = a.updated_date && new Date(a.updated_date).toISOString().slice(0, 10) === todayISO;
      const isAuto = a.notas?.includes('[SISTEMA]') || a.comentario_aprobacion?.includes('[SISTEMA]');
      return isToday || isAuto;
    }).slice(0, 15).map(a => ({
      ...a,
      empName: empMap[a.employee_id]?.nombre || '—',
      empDept: empMap[a.employee_id]?.departamento || '—',
      isAuto: a.notas?.includes('[SISTEMA]') || a.comentario_aprobacion?.includes('[SISTEMA]'),
      isReactivated: a.comentario_aprobacion?.includes('[SISTEMA]') && a.estado_aprobacion === 'Cancelada'
    }));

    setSystemAbsences(sysEvents);
    setLastUpdate(new Date());
    setLoading(false);
  }, [todayISO]);

  useEffect(() => {
    loadData();

    // Suscripción en tiempo real a cambios de empleados
    const unsubscribe = base44.entities.EmployeeMasterDatabase.subscribe((event) => {
      if (event.type === 'update' && event.data) {
        setEmployees(prev => prev.map(e => e.id === event.id ? { ...e, ...event.data } : e));
        setLastUpdate(new Date());
      }
    });

    return () => unsubscribe();
  }, [loadData]);

  const disponibles = employees.filter(e => e.disponibilidad !== 'Ausente');
  const ausentes = employees.filter(e => e.disponibilidad === 'Ausente');
  const total = employees.length;
  const pct = total > 0 ? ((disponibles.length / total) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-500 mr-2" />
        <span className="text-sm text-slate-500">Cargando datos en tiempo real...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabecera con indicador de tiempo real */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Panel en tiempo real</span>
          <Badge variant="outline" className="text-[10px] py-0">Hoy · {todayISO}</Badge>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(lastUpdate, 'HH:mm:ss')}
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={loadData}>
            <RefreshCw className="w-3 h-3" /> Actualizar
          </Button>
        </div>
      </div>

      {/* Contadores principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-green-100 dark:bg-green-800/40 rounded-xl">
              <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-green-700 dark:text-green-300">{disponibles.length}</p>
              <p className="text-xs text-green-600 dark:text-green-500 font-medium">Disponibles ahora</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-red-100 dark:bg-red-800/40 rounded-xl">
              <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-red-700 dark:text-red-300">{ausentes.length}</p>
              <p className="text-xs text-red-600 dark:text-red-500 font-medium">Ausentes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-800/40 rounded-xl">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{pct}%</p>
              <p className="text-xs text-blue-600 dark:text-blue-500 font-medium">Disponibilidad ({total} total)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listas detalladas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Empleados ausentes */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-500" />
              Ausentes en este momento
              <Badge variant="destructive" className="text-[10px] ml-auto">{ausentes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {ausentes.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-sm text-slate-400">Todos los empleados están disponibles</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {ausentes.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{emp.nombre}</p>
                      <p className="text-[10px] text-slate-500">{emp.departamento || '—'}</p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      {emp.ausencia_motivo?.includes('[SISTEMA]') || emp.ausencia_motivo?.includes('automát') ? (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[9px] px-1.5 py-0">Auto</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">Comunicada</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventos automáticos del sistema */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-500" />
              Eventos del sistema (hoy)
              <Badge variant="outline" className="text-[10px] ml-auto">{systemAbsences.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {systemAbsences.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Sin eventos automáticos registrados hoy</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {systemAbsences.map(event => (
                  <div key={event.id} className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${
                    event.isReactivated
                      ? 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30'
                      : 'bg-orange-50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/30'
                  }`}>
                    {event.isReactivated
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                      : <AlertCircle className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
                    }
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{event.empName}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-slate-500">{event.empDept}</span>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {event.isReactivated ? '✅ Presencia detectada — ausencia cerrada' : event.motivo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barra de progreso de disponibilidad */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Disponibilidad global</span>
            <span>{disponibles.length} de {total} empleados</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span className="text-red-400">{ausentes.length} ausentes</span>
            <span className="text-green-400">{disponibles.length} disponibles</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}