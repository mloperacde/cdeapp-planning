import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Editor de necesidades de operarios por orden de trabajo.
// Cada fila define una actividad/etapa y el nº de operarios necesarios.
export default function StaffRequirementEditor({ value = [], onChange }) {
  const rows = Array.isArray(value) ? value : [];

  const updateRow = (idx, field, val) => {
    const next = rows.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    onChange(next);
  };

  const addRow = () => onChange([...rows, { actividad: "", cantidad_operarios: 1, notas: "" }]);

  const removeRow = (idx) => onChange(rows.filter((_, i) => i !== idx));

  const total = rows.reduce((s, r) => s + (Number(r.cantidad_operarios) || 0), 0);

  return (
    <div className="space-y-3 border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          Necesidad de Personal por Orden
        </h4>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-7">
          <Plus className="w-3.5 h-3.5 mr-1" /> Añadir
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Define los operarios necesarios para esta orden concreta (llenado, etiquetado, proceso completo...). Se guarda por orden de trabajo.
      </p>

      {rows.length === 0 ? (
        <div className="text-xs text-slate-400 italic py-2">Sin necesidades definidas. Añade filas para configurar el personal.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Actividad (ej: Llenado, Etiquetado, Proceso Completo)"
                  value={row.actividad || ""}
                  onChange={(e) => updateRow(idx, "actividad", e.target.value)}
                  className="h-8 text-xs"
                />
                <Textarea
                  placeholder="Notas"
                  value={row.notas || ""}
                  onChange={(e) => updateRow(idx, "notas", e.target.value)}
                  rows={1}
                  className="text-xs min-h-0 py-1"
                />
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-[10px] text-slate-500">Operarios</Label>
                <Input
                  type="number"
                  min={0}
                  value={row.cantidad_operarios ?? 1}
                  onChange={(e) => updateRow(idx, "cantidad_operarios", e.target.value === "" ? "" : parseInt(e.target.value))}
                  className="h-8 text-xs text-center"
                />
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => removeRow(idx)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
          Total operarios: {total}
        </div>
      </div>
    </div>
  );
}