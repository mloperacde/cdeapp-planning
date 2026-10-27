import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { contractInfo, evaluationAverage, fmtScore, formatDate, scoreTone, technicalScore } from "./evaluationUtils";

const ScoreBlock = ({ label, value }) => (
  <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5">
    <p className="text-[10px] text-slate-500">{label}</p>
    <p className={`text-sm font-semibold ${scoreTone(value)}`}>{fmtScore(value)}</p>
  </div>
);

export default function EvaluationHistoryDialog({ employee, evaluations, onClose }) {
  const queryClient = useQueryClient();
  const contract = contractInfo(employee);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductionEvaluation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productionEvaluations"] });
      toast.success("Evaluación eliminada");
    },
    onError: () => toast.error("No se pudo eliminar la evaluación"),
  });

  const ordered = [...evaluations].sort((a, b) =>
    String(b.fecha_evaluacion || "").localeCompare(String(a.fecha_evaluacion || ""))
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!w-[min(95vw,880px)] !max-w-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            Historial de {employee.nombre}
            {contract.temporal && <Badge className="bg-amber-100 text-amber-800 text-[10px]">Temporal</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-slate-500">
          {employee.puesto || "—"} · {contract.label}
          {employee.fecha_fin_contrato ? ` · fin ${formatDate(employee.fecha_fin_contrato)}` : ""}
          {" · "}{ordered.length} evaluación{ordered.length === 1 ? "" : "es"}
        </div>

        <div className="space-y-3">
          {ordered.map((evaluation) => (
            <div key={evaluation.id} className="border border-slate-200 rounded-lg p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{formatDate(evaluation.fecha_evaluacion)}</span>
                  <Badge className={evaluation.origen === "Excel" ? "bg-sky-100 text-sky-700 text-[10px]" : "bg-blue-100 text-blue-700 text-[10px]"}>
                    {evaluation.origen || "Manual"}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-600 text-[10px]">{evaluation.modalidad_tecnica}</Badge>
                  <Badge className={evaluation.estado === "Borrador" ? "bg-amber-100 text-amber-800 text-[10px]" : "bg-emerald-100 text-emerald-700 text-[10px]"}>
                    {evaluation.estado || "Registrada"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Media {fmtScore(evaluationAverage(evaluation))}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-600"
                    onClick={() => {
                      if (window.confirm("¿Eliminar esta evaluación?")) deleteMutation.mutate(evaluation.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <ScoreBlock label="Actitud" value={evaluation.actitud_puntuacion} />
                <ScoreBlock label="Desempeño" value={evaluation.desempeno_puntuacion} />
                <ScoreBlock label="Técnica" value={technicalScore(evaluation)} />
                <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5">
                  <p className="text-[10px] text-slate-500">Sala / 2ª</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {evaluation.sala_produccion || "—"}{evaluation.indicador_2a ? ` · ${evaluation.indicador_2a}` : ""}
                  </p>
                </div>
              </div>

              {(evaluation.destrezas || []).length > 0 && (
                <div className="space-y-1">
                  {evaluation.destrezas.map((destreza, index) => (
                    <div key={index} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1">
                      <span className="text-slate-700">{destreza.skill_nombre || "Destreza"}</span>
                      <div className="flex items-center gap-2">
                        {destreza.observaciones && <span className="text-[10px] text-slate-500">{destreza.observaciones}</span>}
                        <span className={`font-semibold ${scoreTone(destreza.puntuacion)}`}>{fmtScore(destreza.puntuacion)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {[
                ["Actitud", evaluation.actitud_observaciones],
                ["Desempeño", evaluation.desempeno_observaciones],
                ["Técnica", evaluation.tecnica_observaciones],
                ["General", evaluation.observaciones],
              ]
                .filter(([, text]) => text)
                .map(([label, text]) => (
                  <p key={label} className="text-xs text-slate-600">
                    <span className="font-medium text-slate-500">{label}: </span>
                    {text}
                  </p>
                ))}

              {evaluation.evaluador_nombre && (
                <p className="text-[10px] text-slate-400">Evaluado por {evaluation.evaluador_nombre}</p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}