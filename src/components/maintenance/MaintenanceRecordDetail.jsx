import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Clock, User, Wrench, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MaintenanceRecordDetail({ record, onClose }) {
  if (!record) return null;

  const formatDate = (dt) => dt ? format(new Date(dt), "dd/MM/yyyy HH:mm", { locale: es }) : "—";

  return (
    <Dialog open={!!record} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Registro de Mantenimiento
            <span className="text-sm font-mono text-slate-400 ml-2">{record.numero_registro || record.id?.slice(0, 8)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Máquina e info general */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Máquina</p>
              <p className="font-semibold">{record.machine_name || "—"}</p>
              <p className="text-xs text-slate-400">{record.machine_codigo}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Plan de mantenimiento</p>
              <p className="font-semibold">{record.maintenance_plan_nombre || "—"}</p>
              <p className="text-xs text-slate-400">{record.periodicidad}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Tipo</p>
              <Badge className="mt-1">{record.tipo}</Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Estado</p>
              <div className="mt-1">
                {record.estado === "Completado" && <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Completado</Badge>}
                {record.estado === "Completado con incidencias" && <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Con incidencias</Badge>}
                {record.estado === "Cancelado" && <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>}
              </div>
            </div>
          </div>

          {/* Fechas y duración */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Inicio</p>
                <p className="text-sm font-medium">{formatDate(record.fecha_inicio)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Fin</p>
                <p className="text-sm font-medium">{formatDate(record.fecha_fin)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Wrench className="w-4 h-4 text-blue-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Duración</p>
                <p className="text-sm font-medium">{record.duracion_minutos ? `${record.duracion_minutos} min` : "—"}</p>
              </div>
            </div>
          </div>

          {/* Técnico y supervisor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Técnico responsable</p>
                <p className="text-sm font-medium">{record.tecnico_nombre || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Supervisor</p>
                <p className="text-sm font-medium">{record.supervisor_nombre || "—"}</p>
              </div>
            </div>
          </div>

          {/* Tareas realizadas */}
          {record.tareas_realizadas?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tareas realizadas</p>
              <div className="space-y-2">
                {record.tareas_realizadas.map((tarea, i) => (
                  <div key={i} className="border rounded-lg p-3 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      {tarea.completada
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <XCircle className="w-4 h-4 text-red-400" />}
                      <span className="font-medium text-sm">{tarea.titulo}</span>
                    </div>
                    {tarea.observaciones && (
                      <p className="text-xs text-slate-500 mt-1 ml-6">{tarea.observaciones}</p>
                    )}
                    {tarea.subtareas?.length > 0 && (
                      <div className="ml-6 mt-2 space-y-1">
                        {tarea.subtareas.map((st, j) => (
                          <div key={j} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            {st.completada
                              ? <CheckCircle2 className="w-3 h-3 text-green-400" />
                              : <XCircle className="w-3 h-3 text-red-300" />}
                            {st.titulo}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observaciones e incidencias */}
          {(record.observaciones || record.incidencias || record.materiales_usados) && (
            <div className="space-y-3">
              {record.observaciones && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Observaciones</p>
                  <p className="text-sm bg-slate-50 dark:bg-slate-800 rounded p-3">{record.observaciones}</p>
                </div>
              )}
              {record.incidencias && (
                <div>
                  <p className="text-xs text-yellow-600 uppercase tracking-wide mb-1">Incidencias detectadas</p>
                  <p className="text-sm bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded p-3">{record.incidencias}</p>
                </div>
              )}
              {record.materiales_usados && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Materiales / Repuestos utilizados</p>
                  <p className="text-sm bg-slate-50 dark:bg-slate-800 rounded p-3">{record.materiales_usados}</p>
                </div>
              )}
            </div>
          )}

          {/* Próxima fecha */}
          {record.proxima_fecha_calculada && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-blue-600 font-medium">Próximo mantenimiento calculado</p>
                <p className="font-semibold text-blue-800 dark:text-blue-300">
                  {format(new Date(record.proxima_fecha_calculada), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
            </div>
          )}

          {/* Registro por */}
          <p className="text-xs text-slate-400 text-right">Registrado por: {record.ejecutado_por || record.created_by || "—"}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}