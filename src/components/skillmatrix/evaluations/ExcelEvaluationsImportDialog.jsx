import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { parseEvaluationsWorkbook } from "./excelEvaluationsParser";
import { formatDate, isTemporalContract, normalizeName } from "./evaluationUtils";

export default function ExcelEvaluationsImportDialog({ employees, evaluations, onClose }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [fechas, setFechas] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseEvaluationsWorkbook(buffer);

      const byName = {};
      employees.forEach((employee) => {
        const key = normalizeName(employee.nombre);
        (byName[key] = byName[key] || []).push(employee);
      });

      setFileName(file.name);
      setFechas(parsed.fechas);
      setRows(
        parsed.empleados.map((item) => {
          const matches = byName[normalizeName(item.nombre)] || [];
          return {
            ...item,
            employeeId: matches.length === 1 ? matches[0].id : "",
            ambiguous: matches.length > 1,
          };
        })
      );
    } catch (error) {
      toast.error("No se pudo leer el archivo");
    } finally {
      setParsing(false);
    }
  };

  const assignEmployee = (index, employeeId) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, employeeId } : row)));
  };

  const assigned = rows.filter((row) => row.employeeId);
  const totalEvaluaciones = assigned.reduce((sum, row) => sum + row.evaluaciones.length, 0);
  const sinAsignar = rows.length - assigned.length;

  const handleImport = async () => {
    if (!assigned.length) {
      toast.error("Asigna al menos un empleado antes de importar");
      return;
    }

    setImporting(true);
    try {
      const existing = new Set(
        evaluations
          .filter((evaluation) => evaluation.origen === "Excel")
          .map((evaluation) => `${evaluation.employee_id}|${evaluation.fecha_evaluacion}|${evaluation.sala_produccion || ""}`)
      );

      const payload = [];
      assigned.forEach((row) => {
        const employee = employees.find((e) => e.id === row.employeeId);
        if (!employee) return;
        row.evaluaciones.forEach((evaluation) => {
          const key = `${employee.id}|${evaluation.fecha}|${evaluation.sala || ""}`;
          if (existing.has(key)) return;
          existing.add(key);
          payload.push({
            employee_id: employee.id,
            employee_name: employee.nombre,
            employee_code: employee.codigo_empleado,
            department: employee.departamento,
            puesto: employee.puesto,
            turno: employee.equipo || employee.tipo_turno,
            tipo_contrato: employee.tipo_contrato,
            fecha_alta: employee.fecha_alta,
            fecha_fin_contrato: employee.fecha_fin_contrato,
            es_temporal: isTemporalContract(employee),
            fecha_evaluacion: evaluation.fecha,
            modalidad_tecnica: "Genérica",
            ...(typeof evaluation.actd === "number" ? { actitud_puntuacion: evaluation.actd } : {}),
            ...(typeof evaluation.hab === "number" ? { tecnica_puntuacion: evaluation.hab } : {}),
            ...(evaluation.sala ? { sala_produccion: evaluation.sala } : {}),
            ...(evaluation.segunda ? { indicador_2a: evaluation.segunda } : {}),
            datos_excel: {
              hab: evaluation.hab,
              actd: evaluation.actd,
              segunda: evaluation.segunda,
              sala: evaluation.sala,
              turno_archivo: row.turno,
              contrato_archivo: row.contrato,
              incorporacion: row.incorporacion,
              fin_periodo_prueba: row.fin_periodo_prueba,
            },
            origen: "Excel",
            estado: "Registrada",
            observaciones: `Importado del archivo ${fileName}`,
          });
        });
      });

      if (!payload.length) {
        toast.info("No hay evaluaciones nuevas que importar (ya estaban registradas)");
        return;
      }

      await base44.entities.ProductionEvaluation.bulkCreate(payload);
      queryClient.invalidateQueries({ queryKey: ["productionEvaluations"] });
      toast.success(`${payload.length} evaluaciones importadas`);
      onClose();
    } catch (error) {
      toast.error("No se pudieron importar las evaluaciones");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!w-[min(95vw,980px)] !max-w-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Importar evaluaciones desde Excel
          </DialogTitle>
        </DialogHeader>

        {!rows.length ? (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-12 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
              {parsing ? (
                <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
              ) : (
                <Upload className="w-7 h-7 text-slate-400" />
              )}
              <span className="text-sm font-medium text-slate-600">
                {parsing ? "Leyendo archivo…" : "Selecciona el libro de evaluaciones (.xlsx)"}
              </span>
              <span className="text-xs text-slate-400">
                Se leen las fechas de evaluación y los bloques SALA / HAB / ACTD. / 2ª
              </span>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={parsing} />
            </label>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Los valores HAB se registran como habilidad técnica y ACTD. como actitud, con la misma escala del archivo.
                La sala y la columna 2ª se conservan tal cual, sin interpretar.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge className="bg-slate-100 text-slate-700">{fileName}</Badge>
              <Badge className="bg-blue-100 text-blue-700">{rows.length} empleados en el archivo</Badge>
              <Badge className="bg-emerald-100 text-emerald-700">{assigned.length} asignados</Badge>
              {sinAsignar > 0 && <Badge className="bg-amber-100 text-amber-800">{sinAsignar} sin asignar</Badge>}
              <Badge className="bg-sky-100 text-sky-700">{totalEvaluaciones} evaluaciones</Badge>
              {fechas.length > 0 && (
                <span className="text-slate-500 self-center">
                  Fechas: {fechas.map((f) => formatDate(f.iso)).join(" · ")}
                </span>
              )}
            </div>

            {sinAsignar > 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800">
                  Hay nombres del archivo que no coinciden con la base de empleados. Asígnalos o déjalos sin asignar:
                  sus evaluaciones no se importarán.
                </AlertDescription>
              </Alert>
            )}

            <div className="max-h-[45vh] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-slate-500 border-b">
                    <th className="p-2 font-medium">Nombre en el archivo</th>
                    <th className="p-2 font-medium">Empleado asignado</th>
                    <th className="p-2 font-medium text-center">Evaluaciones</th>
                    <th className="p-2 font-medium">Datos del archivo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.nombre}-${index}`} className={row.employeeId ? "" : "bg-amber-50/60"}>
                      <td className="p-2 font-medium text-slate-700">{row.nombre}</td>
                      <td className="p-2">
                        <Select
                          value={row.employeeId || undefined}
                          onValueChange={(value) => assignEmployee(index, value === "none" ? "" : value)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {row.ambiguous && (
                          <span className="text-[10px] text-amber-700">Varios empleados con ese nombre</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <Badge className="bg-slate-100 text-slate-700 text-[10px]">{row.evaluaciones.length}</Badge>
                      </td>
                      <td className="p-2 text-slate-500">
                        {row.turno && <span>{row.turno} · </span>}
                        {row.contrato && <span>{row.contrato} · </span>}
                        {row.fin_periodo_prueba ? `prueba hasta ${formatDate(row.fin_periodo_prueba)}` : "sin fin de prueba"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => { setRows([]); setFileName(""); }}>
                Cambiar archivo
              </Button>
              <Button size="sm" onClick={handleImport} disabled={importing || !assigned.length}>
                {importing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                Importar {totalEvaluaciones} evaluaciones
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}