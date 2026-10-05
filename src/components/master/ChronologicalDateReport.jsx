import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Search, CalendarX, CheckCircle2, Loader2, UserCog, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const formatDate = (d) => (d ? format(new Date(d), "dd/MM/yyyy", { locale: es }) : "—");

export default function ChronologicalDateReport() {
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["allEmployeesMasterChrono"],
    queryFn: async () => {
      const all = await base44.entities.EmployeeMasterDatabase.list(undefined, 1000);
      return all;
    },
  });

  const inconsistencies = useMemo(() => {
    return employees
      .filter((emp) => (onlyActive ? emp.estado_empleado === "Alta" : true))
      .map((emp) => {
        const issues = [];
        // fecha_baja residual en empleado de Alta (contrato anterior no limpiado)
        if (emp.estado_empleado !== "Baja" && emp.fecha_baja) {
          issues.push({
            type: "baja_residual",
            label: "Fecha de baja residual de contrato anterior",
            severity: "alta",
            fixable: true,
          });
        }
        // fecha_baja anterior a fecha_alta
        if (emp.fecha_alta && emp.fecha_baja && new Date(emp.fecha_baja) < new Date(emp.fecha_alta)) {
          issues.push({
            type: "baja_antes_alta",
            label: "Fecha de baja anterior a fecha de alta",
            severity: "alta",
            fixable: true,
          });
        }
        // fecha_fin_contrato anterior a fecha_alta
        if (emp.fecha_alta && emp.fecha_fin_contrato && new Date(emp.fecha_fin_contrato) < new Date(emp.fecha_alta)) {
          issues.push({
            type: "fin_contrato_antes_alta",
            label: "Fecha fin de contrato anterior a fecha de alta",
            severity: "alta",
            fixable: false,
          });
        }
        // fecha_fin_excedencia anterior a fecha_inicio_excedencia
        if (
          emp.fecha_inicio_excedencia &&
          emp.fecha_fin_excedencia &&
          new Date(emp.fecha_fin_excedencia) < new Date(emp.fecha_inicio_excedencia)
        ) {
          issues.push({
            type: "fin_excedencia_antes_inicio",
            label: "Fecha fin de excedencia anterior a fecha de inicio",
            severity: "media",
            fixable: false,
          });
        }
        return { ...emp, chronoIssues: issues };
      })
      .filter((emp) => emp.chronoIssues.length > 0);
  }, [employees, onlyActive]);

  const filtered = useMemo(() => {
    if (!search.trim()) return inconsistencies;
    const q = search.toLowerCase();
    return inconsistencies.filter(
      (emp) =>
        (emp.nombre || "").toLowerCase().includes(q) ||
        (emp.codigo_empleado || "").toString().includes(q)
    );
  }, [inconsistencies, search]);

  const totalIssues = inconsistencies.reduce((acc, emp) => acc + emp.chronoIssues.length, 0);

  // Empleados con fecha_baja residual que se pueden limpiar automáticamente
  const staleBajaEmployees = useMemo(() => {
    return employees.filter(
      (emp) => emp.estado_empleado !== "Baja" && emp.fecha_baja
    );
  }, [employees]);

  const handleCleanStaleBaja = async () => {
    if (staleBajaEmployees.length === 0) return;
    const confirmed = window.confirm(
      `Se limpiarán la fecha de baja y motivo de baja de ${staleBajaEmployees.length} empleado(s) que ya no están en estado "Baja". ¿Continuar?`
    );
    if (!confirmed) return;

    setCleaning(true);
    try {
      // Actualizar cada empleado con fecha_baja residual
      const updates = staleBajaEmployees.map((emp) =>
        base44.entities.EmployeeMasterDatabase.update(emp.id, {
          fecha_baja: null,
          motivo_baja: null,
        })
      );
      await Promise.all(updates);
      toast.success(`Se limpiaron ${staleBajaEmployees.length} registro(s) de baja obsoletos.`);
      queryClient.invalidateQueries({ queryKey: ["allEmployeesMasterChrono"] });
      queryClient.invalidateQueries({ queryKey: ["allEmployeesMaster"] });
      queryClient.invalidateQueries({ queryKey: ["employeeMasterDatabase"] });
    } catch (error) {
      console.error("Error cleaning stale baja:", error);
      toast.error("Error al limpiar las fechas de baja obsoletas.");
    } finally {
      setCleaning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
        <Card className="bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <CalendarX className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{inconsistencies.length}</p>
              <p className="text-xs text-slate-500">Empleados con inconsistencias</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalIssues}</p>
              <p className="text-xs text-slate-500">Inconsistencias totales</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {employees.filter((e) => (onlyActive ? e.estado_empleado === "Alta" : true)).length - inconsistencies.length}
              </p>
              <p className="text-xs text-slate-500">Empleados sin incidencias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de limpieza masiva */}
      {staleBajaEmployees.length > 0 && (
        <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex-1 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {staleBajaEmployees.length} empleado(s) con fecha de baja residual de contratos anteriores
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Estos empleados ya no están en estado "Baja" pero conservan la fecha de baja del contrato anterior. Puedes limpiarlos automáticamente.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="default"
            onClick={handleCleanStaleBaja}
            disabled={cleaning}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0"
          >
            {cleaning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                Limpiando...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Limpiar fechas de baja obsoletas
              </>
            )}
          </Button>
        </div>
      )}

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="pl-9"
          />
        </div>
        <Button
          variant={onlyActive ? "default" : "outline"}
          onClick={() => setOnlyActive(!onlyActive)}
          className="text-xs"
        >
          {onlyActive ? "Solo activos" : "Todos los estados"}
        </Button>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No se detectaron inconsistencias cronológicas
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Todas las fechas de alta, baja y contrato siguen un orden cronológico correcto.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
              <tr className="text-left text-xs text-slate-500 uppercase">
                <th className="px-3 py-2">Empleado</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">F. Alta</th>
                <th className="px-3 py-2">F. Baja</th>
                <th className="px-3 py-2">F. Fin Contrato</th>
                <th className="px-3 py-2">Inconsistencia</th>
                <th className="px-3 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{emp.nombre}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={
                        emp.estado_empleado === "Alta"
                          ? "border-green-300 text-green-700 bg-green-50 dark:bg-green-950/30"
                          : emp.estado_empleado === "Baja"
                          ? "border-red-300 text-red-700 bg-red-50 dark:bg-red-950/30"
                          : "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30"
                      }
                    >
                      {emp.estado_empleado || "—"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(emp.fecha_alta)}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                    {emp.fecha_baja ? (
                      <span className="text-red-600 dark:text-red-400 font-medium">{formatDate(emp.fecha_baja)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(emp.fecha_fin_contrato)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {emp.chronoIssues.map((issue, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={
                            issue.severity === "alta"
                              ? "border-red-300 text-red-700 bg-red-50 dark:bg-red-950/30"
                              : "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30"
                          }
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {issue.label}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      to={`/MasterEmployeeDatabase?context=config&employeeId=${emp.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      Corregir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}