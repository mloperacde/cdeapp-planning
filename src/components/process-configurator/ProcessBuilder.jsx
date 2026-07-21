import { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Plus, X, Clock, Zap, Layers, GripVertical, Pencil, Wand2, ChevronUp, ChevronDown
} from "lucide-react";
import { toast } from "sonner";

const ACTIVITY_TYPES = ["Máquina", "Manual", "Acondicionamiento Secundario", "Logística"];

const typeColors = {
  "Máquina": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Manual": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "Acondicionamiento Secundario": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Logística": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
};

const formatTime = (seconds) => {
  if (!seconds) return "0 seg";
  if (seconds < 60) return `${seconds.toFixed(1)} seg`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
};

const EMPTY_NEW = {
  name: "",
  description: "",
  type: "Manual",
  interactions_per_minute: 30,
  priority: 5,
  active: true
};

/**
 * ProcessBuilder — Herramienta completa para componer un proceso:
 *  - Elegir N actividades del catálogo (entidad Activity)
 *  - Crear nuevas actividades con su capacidad (uds/min)
 *  - Reordenar y ver tiempo total
 */
export default function ProcessBuilder({ selectedIds = [], onChange, onDetailsChange }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ ...EMPTY_NEW });
  const [creating, setCreating] = useState(false);

  // Orden de las actividades seleccionadas (por id) — permite reordenar manualmente
  const [order, setOrder] = useState([]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Activity.list("-priority");
      setCatalog(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Error al cargar el catálogo de actividades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // Mantener orden sincronizado con selección
  useEffect(() => {
    setOrder(prev => {
      const filtered = prev.filter(id => selectedIds.includes(id));
      const added = selectedIds.filter(id => !filtered.includes(id));
      return [...filtered, ...added];
    });
  }, [selectedIds]);

  const selectedActivities = useMemo(() => {
    return order
      .map(id => catalog.find(a => a.id === id))
      .filter(Boolean);
  }, [order, catalog]);

  const totalTime = useMemo(() => {
    return selectedActivities.reduce((sum, a) => {
      const t = a.interactions_per_minute > 0 ? 60 / a.interactions_per_minute : 0;
      return sum + t;
    }, 0);
  }, [selectedActivities]);

  // Notificar cambios al padre
  useEffect(() => {
    if (onChange) {
      // solo IDs en orden
      const ids = selectedActivities.map(a => a.id);
      if (JSON.stringify(ids) !== JSON.stringify(selectedIds)) {
        onChange(ids);
      }
    }
    if (onDetailsChange) {
      onDetailsChange({
        totalTime,
        activities: selectedActivities.map((a, i) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          interactions_per_minute: a.interactions_per_minute,
          time_seconds: a.interactions_per_minute > 0 ? 60 / a.interactions_per_minute : 0,
          number: a.priority || (i + 1)
        }))
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedActivities, totalTime]);

  const toggleActivity = (id) => {
    if (selectedIds.includes(id)) {
      onChange?.(selectedIds.filter(x => x !== id));
    } else {
      onChange?.([...selectedIds, id]);
    }
  };

  const moveActivity = (id, direction) => {
    setOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  };

  const filteredCatalog = useMemo(() => {
    return catalog.filter(a => {
      const matchType = filterType === "all" || a.type === filterType;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (a.name || "").toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [catalog, filterType, search]);

  const handleCreateActivity = async () => {
    if (!newForm.name.trim()) {
      toast.error("El nombre de la actividad es obligatorio");
      return;
    }
    if (!newForm.interactions_per_minute || newForm.interactions_per_minute <= 0) {
      toast.error("La capacidad (uds/min) debe ser mayor que 0");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        name: newForm.name.trim(),
        description: newForm.description || "",
        type: newForm.type,
        interactions_per_minute: Number(newForm.interactions_per_minute),
        time_seconds: 60 / Number(newForm.interactions_per_minute),
        priority: Number(newForm.priority) || 5,
        component_keywords: [],
        component_code_patterns: [],
        active: true
      };
      const created = await base44.entities.Activity.create(payload);
      setCatalog(prev => [...prev, created]);
      onChange?.([...selectedIds, created.id]);
      toast.success(`Actividad "${created.name}" creada y añadida al proceso`);
      setShowCreate(false);
      setNewForm({ ...EMPTY_NEW });
    } catch (e) {
      toast.error("Error al crear la actividad");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Proceso compuesto */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Proceso compuesto</Label>
            <Badge variant="outline">{selectedActivities.length} actividades</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono font-medium text-foreground">{formatTime(totalTime)}</span>
          </div>
        </div>

        {selectedActivities.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
            <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p>Aún no hay actividades en este proceso.</p>
            <p className="text-xs mt-1">Añade actividades desde el catálogo o crea una nueva.</p>
          </div>
        ) : (
          <div className="space-y-1.5 border rounded-md p-2 bg-muted/20">
            {selectedActivities.map((act, idx) => {
              const timePerUnit = act.interactions_per_minute > 0 ? 60 / act.interactions_per_minute : 0;
              return (
                <div key={act.id} className="flex items-center gap-2 p-2 rounded border bg-background hover:shadow-sm transition-shadow">
                  <div className="flex flex-col items-center">
                    <button onClick={() => moveActivity(act.id, -1)} disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30" title="Subir">
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <span className="text-[10px] text-muted-foreground font-mono">{idx + 1}</span>
                    <button onClick={() => moveActivity(act.id, 1)} disabled={idx === selectedActivities.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30" title="Bajar">
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{act.name}</span>
                      <Badge className={`text-[10px] py-0 ${typeColors[act.type] || 'bg-muted text-muted-foreground'}`}>{act.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        <strong className="text-foreground">{act.interactions_per_minute}</strong> uds/min
                      </span>
                      <span>= {timePerUnit.toFixed(2)}s/ud</span>
                    </div>
                  </div>
                  <button onClick={() => toggleActivity(act.id)}
                    className="h-6 w-6 flex items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                    title="Quitar del proceso">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Catálogo de actividades */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-semibold">Catálogo de actividades</Label>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Crear nueva
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar actividad..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[260px] border rounded-md">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p>No se encontraron actividades.</p>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="mt-3 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Crear nueva actividad
              </Button>
            </div>
          ) : (
            <div className="p-1.5 space-y-1">
              {filteredCatalog.map(act => {
                const isSelected = selectedIds.includes(act.id);
                const timePerUnit = act.interactions_per_minute > 0 ? 60 / act.interactions_per_minute : 0;
                return (
                  <div key={act.id}
                    className={`flex items-center gap-2 p-2 rounded border transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{act.name}</span>
                        <Badge className={`text-[10px] py-0 ${typeColors[act.type] || 'bg-muted text-muted-foreground'}`}>{act.type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          <strong className="text-foreground">{act.interactions_per_minute}</strong> uds/min
                        </span>
                        <span>= {timePerUnit.toFixed(2)}s/ud</span>
                        {!act.active && <Badge variant="outline" className="text-[10px] text-slate-400">Inactiva</Badge>}
                      </div>
                    </div>
                    <Button size="sm" variant={isSelected ? "secondary" : "outline"}
                      onClick={() => toggleActivity(act.id)}
                      className="h-7 px-2 text-xs gap-1 shrink-0">
                      {isSelected ? <><X className="h-3 w-3" /> Quitar</> : <><Plus className="h-3 w-3" /> Añadir</>}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Dialog crear nueva actividad */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear nueva actividad</DialogTitle>
            <DialogDescription>
              Define una nueva actividad para el catálogo. La capacidad indica cuántas unidades puede realizar un operario por minuto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nombre *</Label>
                <Input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Carga manual de frascos" />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={newForm.type} onValueChange={v => setNewForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Capacidad (uds/min) *</Label>
                <Input type="number" min="0.1" step="0.5"
                  value={newForm.interactions_per_minute}
                  onChange={e => setNewForm(f => ({ ...f, interactions_per_minute: parseFloat(e.target.value) || 0 }))}
                  placeholder="Ej: 30" />
                <p className="text-xs text-muted-foreground">
                  = {newForm.interactions_per_minute > 0 ? (60 / newForm.interactions_per_minute).toFixed(2) : 0}s por unidad
                </p>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Descripción (opcional)</Label>
                <Input value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Notas sobre cómo se realiza esta actividad" />
              </div>
              <div className="space-y-1">
                <Label>Prioridad en el proceso</Label>
                <Input type="number" min="1" max="10" value={newForm.priority}
                  onChange={e => setNewForm(f => ({ ...f, priority: parseInt(e.target.value) || 5 }))} />
                <p className="text-xs text-muted-foreground">1=primera, 10=última</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button onClick={handleCreateActivity} disabled={creating} className="gap-1.5">
                {creating ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Plus className="h-4 w-4" />}
                Crear y añadir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}