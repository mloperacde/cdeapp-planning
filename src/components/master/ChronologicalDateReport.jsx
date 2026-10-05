import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Search, CalendarX, CheckCircle2, Loader2, UserCog } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const formatDate = (d) => (d ? format(new Date(d), "dd/MM/yyyy", { locale: es }) : "—");

export default function ChronologicalDateReport() {
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

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
        // fecha_baja anterior a fecha_alta
        if (emp.fecha_alta && emp.fecha_baja && new Date(emp.fecha_baja) < new Date(emp.fecha_alta)) {
          issues.push({
            type: "baja_antes_alta",
            label: "Fecha de baja anterior a fecha de alta",
            severity: "alta",
          });
        }
        // fecha_fin_contrato anterior a fecha_alta
        if (emp.fecha_alta && emp.fecha_fin_contrato && new Date(emp.fecha_fin_contrato) < new Date(emp.fecha_alta)) {
          issues.push({
            type: "fin_contrato_antes_alta",
            label: "Fecha fin de contrato anterior a fecha de alta",
            severity: "alta",
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
                <th className="px-3 py-2">Código</th>
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
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{emp.codigo_empleado || "—"}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(emp.fecha_alta)}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{formatDate(emp.fecha_baja)}</td>
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