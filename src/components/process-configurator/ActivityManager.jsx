import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Tag, Zap } from "lucide-react";
import { toast } from "sonner";

const EMPTY_ACTIVITY = {
  name: "",
  description: "",
  type: "Manual",
  interactions_per_minute: 30,
  time_seconds: 2,
  component_keywords: [],
  component_code_patterns: [],
  priority: 5,
  active: true
};

export default function ActivityManager() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [form, setForm] = useState(EMPTY_ACTIVITY);
  const [keywordInput, setKeywordInput] = useState("");
  const [patternInput, setPatternInput] = useState("");

  useEffect(() => { loadActivities(); }, []);

  const loadActivities = async () => {
    setLoading(true);
    const data = await base44.entities.Activity.list();
    setActivities(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingActivity(null);
    setForm({ ...EMPTY_ACTIVITY });
    setKeywordInput("");
    setPatternInput("");
    setDialogOpen(true);
  };

  const openEdit = (act) => {
    setEditingActivity(act);
    setForm({
      name: act.name || "",
      description: act.description || "",
      type: act.type || "Manual",
      interactions_per_minute: act.interactions_per_minute || 30,
      time_seconds: act.time_seconds || 2,
      component_keywords: act.component_keywords || [],
      component_code_patterns: act.component_code_patterns || [],
      priority: act.priority || 5,
      active: act.active !== false
    });
    setKeywordInput("");
    setPatternInput("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    const payload = {
      ...form,
      time_seconds: form.interactions_per_minute > 0 ? 60 / form.interactions_per_minute : 0
    };
    if (editingActivity) {
      await base44.entities.Activity.update(editingActivity.id, payload);
      toast.success("Actividad actualizada");
    } else {
      await base44.entities.Activity.create(payload);
      toast.success("Actividad creada");
    }
    setDialogOpen(false);
    loadActivities();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta actividad?")) return;
    await base44.entities.Activity.delete(id);
    toast.success("Actividad eliminada");
    loadActivities();
  };

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !form.component_keywords.includes(kw)) {
      setForm(f => ({ ...f, component_keywords: [...f.component_keywords, kw] }));
    }
    setKeywordInput("");
  };

  const addPattern = () => {
    const p = patternInput.trim().toUpperCase();
    if (p && !form.component_code_patterns.includes(p)) {
      setForm(f => ({ ...f, component_code_patterns: [...f.component_code_patterns, p] }));
    }
    setPatternInput("");
  };

  const typeColors = {
    "Máquina": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "Manual": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    "Acondicionamiento Secundario": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    "Logística": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Catálogo de Actividades</h3>
          <p className="text-xs text-muted-foreground">Define las actividades del proceso con sus velocidades y palabras clave de detección automática</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Actividad
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : activities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay actividades definidas</p>
            <p className="text-sm mt-1">Crea las actividades del proceso con sus velocidades y criterios de detección automática.</p>
            <Button size="sm" onClick={openCreate} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Crear primera actividad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px] pr-2">
          <div className="space-y-2">
            {activities.map(act => (
              <div key={act.id} className="flex items-start gap-3 p-3 border rounded-lg bg-white dark:bg-slate-900 hover:shadow-sm transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{act.name}</span>
                    <Badge className={`text-xs py-0 ${typeColors[act.type] || 'bg-muted text-muted-foreground'}`}>{act.type}</Badge>
                    {!act.active && <Badge variant="outline" className="text-xs text-slate-400">Inactiva</Badge>}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      <strong className="text-foreground">{act.interactions_per_minute}</strong> uds/min
                    </span>
                    <span>({(60 / (act.interactions_per_minute || 1)).toFixed(1)}s/ud)</span>
                    {act.priority && <span>Prioridad: {act.priority}</span>}
                  </div>
                  {(act.component_keywords?.length > 0 || act.component_code_patterns?.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {act.component_keywords?.map(kw => (
                        <span key={kw} className="inline-flex items-center gap-0.5 text-[10px] bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 border border-violet-200 dark:border-violet-800 rounded px-1.5 py-0.5">
                          <Tag className="h-2.5 w-2.5" />{kw}
                        </span>
                      ))}
                      {act.component_code_patterns?.map(p => (
                        <span key={p} className="inline-flex items-center gap-0.5 text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5">
                          #{p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(act)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete(act.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingActivity ? "Editar Actividad" : "Nueva Actividad"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Montaje de estuche" />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Máquina">Máquina</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="Acondicionamiento Secundario">Acond. Secundario</SelectItem>
                    <SelectItem value="Logística">Logística</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Velocidad (uds/min) *</Label>
                <Input type="number" min="0.1" step="0.5"
                  value={form.interactions_per_minute}
                  onChange={e => setForm(f => ({ ...f, interactions_per_minute: parseFloat(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">= {form.interactions_per_minute > 0 ? (60 / form.interactions_per_minute).toFixed(2) : 0}s por unidad</p>
              </div>
              <div className="space-y-1">
                <Label>Prioridad en el proceso</Label>
                <Input type="number" min="1" max="10" value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 5 }))} />
                <p className="text-xs text-muted-foreground">1=primera, 10=última</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4 text-violet-600" />
                Palabras clave de detección automática
              </Label>
              <p className="text-xs text-muted-foreground">Palabras en nombres de componentes que activan esta actividad automáticamente</p>
              <div className="flex gap-2">
                <Input placeholder="Ej: estuche, tapa, etiqueta..." value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addKeyword()} />
                <Button type="button" variant="outline" size="sm" onClick={addKeyword}>+</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {form.component_keywords.map(kw => (
                  <span key={kw} className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded px-2 py-0.5 cursor-pointer hover:bg-red-50 hover:text-red-600"
                    onClick={() => setForm(f => ({ ...f, component_keywords: f.component_keywords.filter(k => k !== kw) }))}>
                    {kw} ×
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t pt-2">
              <Label className="text-sm font-semibold">Patrones de código de componente</Label>
              <p className="text-xs text-muted-foreground">Prefijos de código (ej: ES=estuche, ET=etiqueta, TA=tapa)</p>
              <div className="flex gap-2">
                <Input placeholder="Ej: ES, ET, TA..." value={patternInput}
                  onChange={e => setPatternInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPattern()} />
                <Button type="button" variant="outline" size="sm" onClick={addPattern}>+</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {form.component_code_patterns.map(p => (
                  <span key={p} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5 cursor-pointer hover:bg-red-50 hover:text-red-600"
                    onClick={() => setForm(f => ({ ...f, component_code_patterns: f.component_code_patterns.filter(x => x !== p) }))}>
                    #{p} ×
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}