import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  SCALE_OPTIONS,
  contractInfo,
  emptyEvaluationForm,
  formatDate,
  isTemporalContract,
  normalizeName,
} from "./evaluationUtils";

const ScoreSelect = ({ value, onChange }) => (
  <Select
    value={typeof value === "number" ? String(value) : "none"}
    onValueChange={(v) => onChange(v === "none" ? null : Number(v))}
  >
    <SelectTrigger className="h-8 text-xs">
      <SelectValue placeholder="Sin valorar" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Sin valorar</SelectItem>
      {SCALE_OPTIONS.map((n) => (
        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default function EvaluationFormDialog({ employee, onClose, onSaved }) {
  const [form, setForm] = useState(emptyEvaluationForm());
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["skills"],
    queryFn: () => base44.entities.Skill.list("nombre"),
    initialData: [],
  });

  const availableSkills = skills.filter((skill) => {
    if (skill.activo === false) return false;
    const departments = skill.departamentos_aplicables || [];
    if (!departments.length) return true;
    return departments.some((d) => /PRODUC|FABRICAC/.test(normalizeName(d)));
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => base44.entities.ProductionEvaluation.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productionEvaluations"] });
      toast.success("Evaluación registrada");
      onSaved?.();
      onClose();
    },
    onError: () => toast.error("No se pudo guardar la evaluación"),
  });

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const addDestreza = () =>
    update({ destrezas: [...form.destrezas, { skill_id: "", puntuacion: null, observaciones: "" }] });

  const updateDestreza = (index, patch) =>
    update({ destrezas: form.destrezas.map((d, i) => (i === index ? { ...d, ...patch } : d)) });

  const removeDestreza = (index) =>
    update({ destrezas: form.destrezas.filter((_, i) => i !== index) });

  const handleSave = () => {
    if (!form.fecha_evaluacion) {
      toast.error("Indica la fecha de la evaluación");
      return;
    }

    const destrezas = form.modalidad_tecnica === "Por destrezas"
      ? form.destrezas
          .filter((d) => d.skill_id)
          .map((d) => ({
            skill_id: d.skill_id,
            skill_nombre: availableSkills.find((s) => s.id === d.skill_id)?.nombre || "",
            puntuacion: typeof d.puntuacion === "number" ? d.puntuacion : undefined,
            observaciones: d.observaciones || undefined,
          }))
      : [];

    const hasScore =
      typeof form.actitud_puntuacion === "number" ||
      typeof form.desempeno_puntuacion === "number" ||
      typeof form.tecnica_puntuacion === "number" ||
      destrezas.some((d) => typeof d.puntuacion === "number");

    if (!hasScore) {
      toast.error("Valora al menos un aspecto (actitud, desempeño o técnica)");
      return;
    }

    const payload = {
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
      fecha_evaluacion: form.fecha_evaluacion,
      evaluador_nombre: currentUser?.full_name || "",
      evaluador_email: currentUser?.email || "",
      modalidad_tecnica: form.modalidad_tecnica,
      actitud_puntuacion: form.actitud_puntuacion,
      actitud_observaciones: form.actitud_observaciones,
      desempeno_puntuacion: form.desempeno_puntuacion,
      desempeno_observaciones: form.desempeno_observaciones,
      tecnica_puntuacion: form.modalidad_tecnica === "Genérica" ? form.tecnica_puntuacion : null,
      tecnica_observaciones: form.modalidad_tecnica === "Genérica" ? form.tecnica_observaciones : "",
      destrezas,
      observaciones: form.observaciones,
      estado: form.estado,
      origen: "Manual",
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === null || payload[key] === undefined || payload[key] === "") delete payload[key];
    });

    saveMutation.mutate(payload);
  };

  const contract = contractInfo(employee);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!w-[min(95vw,860px)] !max-w-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Evaluar a {employee.nombre}
            {contract.temporal && <Badge className="bg-amber-100 text-amber-800 text-[10px]">Temporal</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div><span className="text-slate-500">Puesto</span><p className="font-medium">{employee.puesto || "—"}</p></div>
          <div><span className="text-slate-500">Turno</span><p className="font-medium">{employee.equipo || employee.tipo_turno || "—"}</p></div>
          <div><span className="text-slate-500">Contrato</span><p className="font-medium">{contract.label}</p></div>
          <div>
            <span className="text-slate-500">Fin de contrato</span>
            <p className="font-medium">{employee.fecha_fin_contrato ? formatDate(employee.fecha_fin_contrato) : "—"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Fecha de evaluación</Label>
            <Input type="date" value={form.fecha_evaluacion} onChange={(e) => update({ fecha_evaluacion: e.target.value })} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valoración técnica</Label>
            <Select value={form.modalidad_tecnica} onValueChange={(v) => update({ modalidad_tecnica: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Genérica">Genérica</SelectItem>
                <SelectItem value="Por destrezas">Por destrezas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Estado</Label>
            <Select value={form.estado} onValueChange={(v) => update({ estado: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Registrada">Registrada</SelectItem>
                <SelectItem value="Borrador">Borrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Actitud</Label>
              <div className="w-24"><ScoreSelect value={form.actitud_puntuacion} onChange={(v) => update({ actitud_puntuacion: v })} /></div>
            </div>
            <Textarea
              value={form.actitud_observaciones}
              onChange={(e) => update({ actitud_observaciones: e.target.value })}
              placeholder="Implicación, puntualidad, trabajo en equipo…"
              className="text-xs min-h-[70px]"
            />
          </div>

          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Desempeño en producción</Label>
              <div className="w-24"><ScoreSelect value={form.desempeno_puntuacion} onChange={(v) => update({ desempeno_puntuacion: v })} /></div>
            </div>
            <Textarea
              value={form.desempeno_observaciones}
              onChange={(e) => update({ desempeno_observaciones: e.target.value })}
              placeholder="Ritmo, calidad del trabajo, autonomía…"
              className="text-xs min-h-[70px]"
            />
          </div>
        </div>

        {form.modalidad_tecnica === "Genérica" ? (
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Habilidad técnica (valoración global)</Label>
              <div className="w-24"><ScoreSelect value={form.tecnica_puntuacion} onChange={(v) => update({ tecnica_puntuacion: v })} /></div>
            </div>
            <Textarea
              value={form.tecnica_observaciones}
              onChange={(e) => update({ tecnica_observaciones: e.target.value })}
              placeholder="Destreza con la maquinaria, manejo de proceso, polivalencia…"
              className="text-xs min-h-[70px]"
            />
          </div>
        ) : (
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Destrezas evaluadas</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addDestreza}>
                <Plus className="w-3 h-3 mr-1" /> Añadir destreza
              </Button>
            </div>
            {form.destrezas.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Añade las destrezas concretas a valorar. El catálogo se gestiona en la pestaña Habilidades.
              </p>
            ) : (
              <div className="space-y-2">
                {form.destrezas.map((destreza, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-5">
                      <Select value={destreza.skill_id || undefined} onValueChange={(v) => updateDestreza(index, { skill_id: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Destreza" /></SelectTrigger>
                        <SelectContent>
                          {availableSkills.map((skill) => (
                            <SelectItem key={skill.id} value={skill.id}>{skill.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <ScoreSelect value={destreza.puntuacion} onChange={(v) => updateDestreza(index, { puntuacion: v })} />
                    </div>
                    <div className="col-span-4">
                      <Input
                        value={destreza.observaciones}
                        onChange={(e) => updateDestreza(index, { observaciones: e.target.value })}
                        placeholder="Observaciones"
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="col-span-1 h-8 w-8 text-red-600"
                      onClick={() => removeDestreza(index)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Observaciones generales</Label>
          <Textarea
            value={form.observaciones}
            onChange={(e) => update({ observaciones: e.target.value })}
            placeholder="Conclusiones de la evaluación, aspectos a reforzar, siguiente revisión…"
            className="text-xs min-h-[70px]"
          />
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-[11px] text-slate-400">
            Evaluador: {currentUser?.full_name || currentUser?.email || "—"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
              Guardar evaluación
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}