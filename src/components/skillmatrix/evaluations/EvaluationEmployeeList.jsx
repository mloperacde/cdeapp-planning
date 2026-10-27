import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, History, Loader2, Plus } from "lucide-react";
import { bestEvaluation, contractInfo, fmtScore, formatDate, scoreTone, technicalScore } from "./evaluationUtils";

export default function EvaluationEmployeeList({ rows, loading, onEvaluate, onHistory }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Cargando empleados de producción…</span>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
        <ClipboardCheck className="w-10 h-10 mb-3 text-slate-300" />
        <p className="text-sm">No hay empleados que coincidan con el filtro</p>
      </div>
    );
  }

  return (
    <div className="max-h-[560px] overflow-auto rounded-lg border border-slate-200">
      <Table>
        <TableHeader className="sticky top-0 bg-white z-10">
          <TableRow>
            <TableHead className="text-xs">Empleado</TableHead>
            <TableHead className="text-xs">Puesto</TableHead>
            <TableHead className="text-xs">Turno</TableHead>
            <TableHead className="text-xs">Contrato</TableHead>
            <TableHead className="text-xs text-center">Evaluaciones</TableHead>
            <TableHead className="text-xs text-center">Última</TableHead>
            <TableHead className="text-xs text-center">Actitud</TableHead>
            <TableHead className="text-xs text-center">Técnica</TableHead>
            <TableHead className="text-xs text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ employee, evaluations, temporal }) => {
            const contract = contractInfo(employee);
            const last = bestEvaluation(evaluations);
            return (
              <TableRow key={employee.id} className={temporal ? "bg-amber-50/40" : ""}>
                <TableCell className="text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span>{employee.nombre}</span>
                    {temporal && (
                      <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5">Temporal</Badge>
                    )}
                    {employee.estado_empleado && employee.estado_empleado !== "Alta" && (
                      <Badge className="bg-slate-200 text-slate-600 text-[10px] px-1.5">{employee.estado_empleado}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-600">{employee.puesto || "—"}</TableCell>
                <TableCell className="text-xs text-slate-600">{employee.equipo || employee.tipo_turno || "—"}</TableCell>
                <TableCell className="text-xs">
                  <div className="flex flex-col gap-0.5">
                    <Badge className={`${contract.className} text-[10px] w-fit px-1.5`}>{contract.label}</Badge>
                    {employee.fecha_fin_contrato && (
                      <span className="text-[10px] text-slate-500">hasta {formatDate(employee.fecha_fin_contrato)}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-center">
                  {evaluations.length ? (
                    <Badge className="bg-blue-100 text-blue-700 text-[10px]">{evaluations.length}</Badge>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-center text-slate-600">
                  {last ? formatDate(last.fecha_evaluacion) : "Sin evaluar"}
                </TableCell>
                <TableCell className={`text-xs text-center font-semibold ${scoreTone(last?.actitud_puntuacion)}`}>
                  {last ? fmtScore(last.actitud_puntuacion) : "—"}
                </TableCell>
                <TableCell className={`text-xs text-center font-semibold ${scoreTone(technicalScore(last))}`}>
                  {last ? fmtScore(technicalScore(last)) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onEvaluate(employee)}>
                      <Plus className="w-3 h-3 mr-1" /> Evaluar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      disabled={!evaluations.length}
                      onClick={() => onHistory(employee)}
                    >
                      <History className="w-3 h-3 mr-1" /> Historial
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}