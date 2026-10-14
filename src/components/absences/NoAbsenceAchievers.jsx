import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Award, FileSpreadsheet, RefreshCw, Trophy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { exportToExcel } from "@/utils/lockerExport";
import { isNoAbsenceYear, MIN_MONTHS_NO_ABSENCE } from "@/utils/absenceUtils";

/**
 * Reconocimiento: personal que ha cumplido los últimos 12 meses sin ninguna ausencia,
 * con antigüedad suficiente para que el logro sea comparable.
 */
export default function NoAbsenceAchievers({ employees = [], loading = false }) {
  const achievers = useMemo(
    () => employees
      .filter(isNoAbsenceYear)
      .sort((a, b) => (a.departamento || "").localeCompare(b.departamento || "") || (a.nombre || "").localeCompare(b.nombre || "")),
    [employees]
  );

  const period12 = `${format(new Date(new Date().setFullYear(new Date().getFullYear() - 1)), "dd/MM/yyyy")} – ${format(new Date(), "dd/MM/yyyy")}`;
  const analysisDate = format(new Date(), "dd/MM/yyyy HH:mm");

  const byDepartment = useMemo(() => {
    const agg = {};
    for (const e of achievers) {
      const d = e.departamento || "Sin departamento";
      agg[d] = (agg[d] || 0) + 1;
    }
    return Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [achievers]);

  const handleExport = () => {
    if (achievers.length === 0) {
      toast.warning("No hay personal sin ausencias para exportar");
      return;
    }
    const rows = achievers.map((e) => ({
      "Empleado": e.nombre,
      "Código": e.codigo_empleado || "",
      "Departamento": e.departamento,
      "Puesto": e.puesto,
      "Antigüedad": e.antiguedad,
      "Estado empleado": e.estado_empleado,
      "Días ausente 12m": e.days12 || 0,
      "Episodios 12m": e.episodes12 || 0,
      "Días con fichaje 12m": e.presenceDays12 || 0,
      "Fecha de análisis": analysisDate,
      "Periodo (12 meses)": period12,
    }));
    exportToExcel(rows, `sin_ausencias_12_meses_${format(new Date(), "yyyy-MM-dd")}`, "Sin ausencias 12m");
    toast.success(`Exportados ${rows.length} empleados a Excel`);
  };

  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 dark:border-emerald-800 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-4 md:px-5 py-4 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/15 rounded-lg flex-shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold">12 meses sin ausencias</h2>
                <p className="text-[11px] md:text-xs text-emerald-50 mt-0.5">
                  {achievers.length} {achievers.length === 1 ? "persona ha completado" : "personas han completado"} el último año sin ninguna ausencia
                </p>
                <p className="text-[10px] md:text-[11px] text-emerald-100/90 mt-1">
                  Periodo: {period12} · Requiere un mínimo de {MIN_MONTHS_NO_ABSENCE} meses de antigüedad · Análisis: {analysisDate}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={loading || achievers.length === 0}
              className="text-xs h-8 bg-white/15 hover:bg-white/25 text-white border border-white/30"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Exportar listado
            </Button>
          </div>
        </div>

        {byDepartment.length > 0 && (
          <CardContent className="p-3 flex flex-wrap gap-2 border-t border-emerald-100 dark:border-emerald-900">
            {byDepartment.map(([dept, count]) => (
              <Badge key={dept} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                {dept}: {count}
              </Badge>
            ))}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            Personal reconocido ({achievers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : achievers.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              Ningún empleado cumple todavía los 12 meses sin ausencias con la antigüedad mínima requerida.
            </p>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <TableRow>
                    <TableHead className="text-xs">Empleado</TableHead>
                    <TableHead className="text-xs">Código</TableHead>
                    <TableHead className="text-xs">Departamento</TableHead>
                    <TableHead className="text-xs">Puesto</TableHead>
                    <TableHead className="text-xs text-center">Antigüedad</TableHead>
                    <TableHead className="text-xs text-center">Días con fichaje 12m</TableHead>
                    <TableHead className="text-xs text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {achievers.map((e) => (
                    <TableRow key={e.empId} className="bg-emerald-50/40 dark:bg-emerald-950/20">
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          {e.nombre}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{e.codigo_empleado || "—"}</TableCell>
                      <TableCell className="text-xs">{e.departamento}</TableCell>
                      <TableCell className="text-xs">{e.puesto}</TableCell>
                      <TableCell className="text-xs text-center text-slate-500">{e.antiguedad}</TableCell>
                      <TableCell className="text-xs text-center text-slate-600">{e.presenceDays12 || 0}</TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge className="bg-green-100 text-green-700 text-[10px]">{e.estado_empleado}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}