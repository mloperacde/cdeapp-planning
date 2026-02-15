import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug, CheckCircle2, UserX } from "lucide-react";
import { format } from "date-fns";

export default function AvailabilityDebugPanel({ employees, absences, selectedDate }) {
  const fabricacionEmployees = employees.filter(emp => {
    const d = (emp.departamento || "").toString().trim().toUpperCase();
    return (
      (d === "PRODUCCIÓN" || d === "PRODUCCION") &&
      emp.estado_empleado === "Alta" &&
      emp.incluir_en_planning !== false
    );
  });

  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const ausenciasConfirmadas = absences.filter(abs => {
    if (abs.estado_aprobacion !== "Aprobada") return false;
    const inicio = new Date(abs.fecha_inicio);
    const fin = abs.fecha_fin ? new Date(abs.fecha_fin) : null;
    
    if (abs.fecha_fin_desconocida) return selectedDateObj >= inicio;
    return fin && selectedDateObj >= inicio && selectedDateObj <= fin;
  });

  const empleadosAusentesIds = new Set(ausenciasConfirmadas.map(a => a.employee_id));
  const empleadosAusentes = fabricacionEmployees.filter(emp => empleadosAusentesIds.has(emp.id));
  const empleadosDisponibles = fabricacionEmployees.filter(emp => !empleadosAusentesIds.has(emp.id));

  return (
    <Card className="border-2 border-purple-300 bg-purple-50/50 dark:bg-purple-950/20">
      <CardHeader className="border-b border-purple-200">
        <CardTitle className="text-sm flex items-center gap-2 text-purple-900 dark:text-purple-100">
          <Bug className="w-4 h-4" />
          Panel de Diagnóstico (Solo para Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-white dark:bg-slate-800 rounded border">
            <p className="text-slate-600 dark:text-slate-400 mb-1">Total Empleados DB</p>
            <p className="text-2xl font-bold">{employees.length}</p>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200">
          <p className="text-blue-700 dark:text-blue-300 mb-1">PRODUCCIÓN Alta</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{fabricacionEmployees.length}</p>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
            <p className="text-red-700 dark:text-red-300 mb-1">Ausencias Activas</p>
            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{ausenciasConfirmadas.length}</p>
          </div>
        </div>

        <div className="space-y-1 border-t pt-2">
          <p className="font-semibold text-purple-900 dark:text-purple-100">Empleados Disponibles ({empleadosDisponibles.length}):</p>
          <div className="max-h-32 overflow-y-auto space-y-1 bg-white dark:bg-slate-800 p-2 rounded">
            {empleadosDisponibles.slice(0, 10).map(emp => (
              <div key={emp.id} className="text-xs flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                {emp.nombre}
              </div>
            ))}
            {empleadosDisponibles.length > 10 && (
              <p className="text-slate-500 italic">+ {empleadosDisponibles.length - 10} más...</p>
            )}
          </div>
        </div>

        <div className="space-y-1 border-t pt-2">
          <p className="font-semibold text-red-900 dark:text-red-100">Empleados Ausentes ({empleadosAusentes.length}):</p>
          <div className="max-h-32 overflow-y-auto space-y-1 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {empleadosAusentes.map(emp => {
              const ausencia = ausenciasConfirmadas.find(a => a.employee_id === emp.id);
              return (
                <div key={emp.id} className="text-xs flex items-start gap-2">
                  <UserX className="w-3 h-3 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{emp.nombre}</p>
                    <p className="text-red-600">
                      {ausencia?.tipo} - {ausencia?.fecha_fin_desconocida ? 'Fin desconocido' : format(new Date(ausencia.fecha_fin), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
