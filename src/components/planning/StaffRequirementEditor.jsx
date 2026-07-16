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
    <div className="space-y-2 border-t pt-3 mt-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-blue-600" />
          Necesidad de Personal por Orden
        </h4>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-7 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Añadir
        </Button>
      </div>
      <p className="text-[11px] text-slate-500 leading-tight">
        Define los operarios necesarios para esta orden (llenado, etiquetado, proceso completo...).
      </p>

      {rows.length === 0 ? (
        <div className="text-xs text-slate-400 italic py-1">Sin necesidades definidas.</div>
      ) : (
        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <Input
                placeholder="Actividad (ej: Llenado)"
                value={row.actividad || ""}
                onChange={(e) => updateRow(idx, "actividad", e.target.value)}
                className="h-7 text-xs flex-1"
              />
              <Input
                placeholder="Notas"
                value={row.notas || ""}
                onChange={(e) => updateRow(idx, "notas", e.target.value)}
                className="h-7 text-xs flex-1"
              />
              <div className="w-16 flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  value={row.cantidad_operarios ?? 1}
                  onChange={(e) => updateRow(idx, "cantidad_operarios", e.target.value === "" ? "" : parseInt(e.target.value))}
                  className="h-7 text-xs text-center px-1"
                />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-600 shrink-0" onClick={() => removeRow(idx)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
          Total: {total} operarios
        </div>
      </div>
    </div>
  );
}