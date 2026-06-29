import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, CheckCircle2, ChevronDown, ChevronUp, Plus, Zap, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";

const PERIODICIDADES = {
  'Diaria': 1, 'Semanal': 7, 'Quincenal': 15, 'Mensual': 30,
  'Trimestral': 90, 'Semestral': 180, 'Anual': 365,
};

function PlanCard({ type, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const tareas = [];
  for (let i = 1; i <= 6; i++) {
    const t = type[`tarea_${i}`];
    if (t?.nombre) tareas.push(t);
  }

  return (
    <div
      className={`rounded-lg border cursor-pointer transition-colors ${
        selected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
      }`}
      onClick={() => onSelect(type.id)}
    >
      <div className="flex items-start gap-3 p-3">
        <input type="radio" className="mt-1 flex-shrink-0" checked={selected} onChange={() => onSelect(type.id)} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{type.nombre}</p>
          {type.descripcion && <p className="text-xs text-slate-500 truncate">{type.descripcion}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400">{tareas.length} tarea(s)</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">{type.machine_ids?.length || 0} equipo(s)</span>
          </div>
        </div>
        {tareas.length > 0 && (
          <button
            className="text-xs text-blue-600 flex-shrink-0 flex items-center gap-0.5"
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>
      {expanded && tareas.length > 0 && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-100 dark:border-slate-700 mt-0">
          <ul className="space-y-1 mt-2">
            {tareas.map((t, idx) => (
              <li key={idx} className="text-xs flex items-start gap-1.5">
                <span className="text-blue-500 font-bold">{idx + 1}.</span>
                <span className="text-slate-700 dark:text-slate-300">{t.nombre}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AssignPlanDialog({ equipment, onClose }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("existing");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [generateOrder, setGenerateOrder] = useState(true);
  const [orderMode, setOrderMode] = useState("schedule"); // schedule | immediate
  const [periodicidad, setPeriodicidad] = useState("Mensual");
  const [ultimaEjecucion, setUltimaEjecucion] = useState(new Date().toISOString().split("T")[0]);

  // New plan form
  const [newForm, setNewForm] = useState({ nombre_plan: "", tipo: "Preventivo", periodicidad: "Mensual" });

  const { data: maintenanceTypes = [] } = useQuery({
    queryKey: ["maintenanceTypes"],
    queryFn: () => base44.entities.MaintenanceType.list(),
    staleTime: 5 * 60 * 1000,
  });

  const assignedTypeIds = new Set(
    maintenanceTypes.filter(t => t.machine_ids?.includes(equipment.id)).map(t => t.id)
  );
  const availableTypes = maintenanceTypes.filter(t => !assignedTypeIds.has(t.id) && t.activo !== false);
  const alreadyAssigned = maintenanceTypes.filter(t => assignedTypeIds.has(t.id));

  // Assign existing MaintenanceType → sync → optionally create WO
  const assignMutation = useMutation({
    mutationFn: async (typeId) => {
      const type = maintenanceTypes.find(t => t.id === typeId);
      // 1. Add machine to type's machine_ids
      const updatedIds = Array.from(new Set([...(type.machine_ids || []), equipment.id]));
      await base44.entities.MaintenanceType.update(typeId, { machine_ids: updatedIds });

      // 2. Sync → creates MaintenancePlan for this machine×type combo
      const syncRes = await base44.functions.invoke("syncMaintenancePlansWithMachines", {});
      const syncData = syncRes?.data;

      // 3. If requested, find the new plan and create a work order
      if (generateOrder) {
        const diasIntervalo = PERIODICIDADES[periodicidad] || 30;
        const baseDate = new Date(ultimaEjecucion);
        const proxima = addDays(baseDate, diasIntervalo);

        // Find newly created plan
        const allPlans = await base44.entities.MaintenancePlan.list(undefined, 500);
        const plan = allPlans.find(p => p.machine_id === equipment.id && p.maintenance_type_id === typeId);

        if (plan) {
          // Update plan with periodicidad config
          await base44.entities.MaintenancePlan.update(plan.id, {
            periodicidad,
            dias_intervalo: diasIntervalo,
            ultima_ejecucion: new Date(ultimaEjecucion).toISOString(),
            proxima_fecha: proxima.toISOString().split("T")[0],
          });

          // Generate work order
          await base44.functions.invoke("triggerMaintenanceExecution", {
            plan_id: plan.id,
            immediate: orderMode === "immediate",
          });
        }
      }

      return syncData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenanceTypes"] });
      queryClient.invalidateQueries({ queryKey: ["maintenancePlans"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-inventory"] });
      toast.success(generateOrder ? "Plan asignado y orden de trabajo generada" : "Plan asignado al equipo");
      onClose();
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  // Create new direct MaintenancePlan (no MaintenanceType) + optional WO
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const plan = await base44.entities.MaintenancePlan.create(data);
      if (generateOrder && plan?.data?.id) {
        await base44.functions.invoke("triggerMaintenanceExecution", {
          plan_id: plan.data.id,
          immediate: orderMode === "immediate",
        });
      }
      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenancePlans"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      toast.success(generateOrder ? "Plan creado y orden de trabajo generada" : "Plan creado y asignado");
      onClose();
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const handleAssignExisting = () => {
    if (!selectedTypeId) return;
    assignMutation.mutate(selectedTypeId);
  };

  const handleCreateNew = (e) => {
    e.preventDefault();
    const diasIntervalo = PERIODICIDADES[newForm.periodicidad] || 30;
    const proxima = addDays(new Date(ultimaEjecucion), diasIntervalo);
    createMutation.mutate({
      machine_id: equipment.id,
      machine_name: equipment.nombre,
      nombre_plan: newForm.nombre_plan,
      tipo: newForm.tipo,
      periodicidad: newForm.periodicidad,
      dias_intervalo: diasIntervalo,
      ultima_ejecucion: new Date(ultimaEjecucion).toISOString(),
      proxima_fecha: proxima.toISOString().split("T")[0],
      activo: true,
    });
  };

  const isPending = assignMutation.isPending || createMutation.isPending;
  const proximaFechaPreview = addDays(
    new Date(ultimaEjecucion),
    PERIODICIDADES[tab === "existing" ? periodicidad : newForm.periodicidad] || 30
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-600" />
            Asignar Plan de Mantenimiento
          </DialogTitle>
          <p className="text-xs text-slate-500">
            {equipment.nombre} · <span className="font-mono">{equipment.codigo}</span>
          </p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="text-xs">Plan existente</TabsTrigger>
            <TabsTrigger value="new" className="text-xs">Crear plan nuevo</TabsTrigger>
          </TabsList>

          {/* ── EXISTING MaintenanceType ── */}
          <TabsContent value="existing" className="space-y-4 mt-3">
            {availableTypes.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Todos los planes activos ya están asignados
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {availableTypes.map(type => (
                  <PlanCard key={type.id} type={type} selected={selectedTypeId === type.id} onSelect={setSelectedTypeId} />
                ))}
              </div>
            )}

            {alreadyAssigned.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Ya asignados:</p>
                <div className="flex flex-wrap gap-1">
                  {alreadyAssigned.map(t => (
                    <Badge key={t.id} className="text-xs bg-green-100 text-green-700">{t.nombre}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Config periodicidad + OT */}
            {selectedTypeId && (
              <div className="border rounded-lg p-3 space-y-3 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Configurar periodicidad</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Periodicidad</Label>
                    <Select value={periodicidad} onValueChange={setPeriodicidad}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(PERIODICIDADES).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Última intervención</Label>
                    <Input type="date" className="h-8 text-xs" value={ultimaEjecucion}
                      onChange={e => setUltimaEjecucion(e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-blue-600">
                  Próxima fecha calculada: <strong>{format(proximaFechaPreview, "dd/MM/yyyy", { locale: es })}</strong>
                </p>

                {/* Generate work order? */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={generateOrder} onChange={e => setGenerateOrder(e.target.checked)} className="rounded" />
                    <span className="text-xs font-medium">Generar orden de trabajo automáticamente</span>
                  </label>
                  {generateOrder && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderMode("schedule")}
                        className={`flex-1 text-xs rounded-lg border py-1.5 px-2 flex items-center justify-center gap-1 transition-colors ${
                          orderMode === "schedule" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
                        }`}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        Programada
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderMode("immediate")}
                        className={`flex-1 text-xs rounded-lg border py-1.5 px-2 flex items-center justify-center gap-1 transition-colors ${
                          orderMode === "immediate" ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-600"
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Inmediata
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="whitespace-nowrap">Cancelar</Button>
              <Button
                size="sm"
                disabled={!selectedTypeId || isPending}
                onClick={handleAssignExisting}
                className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
              >
                {isPending ? "Procesando..." : generateOrder ? "Asignar y generar OT" : "Asignar plan"}
              </Button>
            </div>
          </TabsContent>

          {/* ── NEW plan ── */}
          <TabsContent value="new">
            <form onSubmit={handleCreateNew} className="space-y-4 mt-3">
              <div>
                <Label className="text-xs">Nombre del plan *</Label>
                <Input
                  value={newForm.nombre_plan}
                  onChange={e => setNewForm(f => ({ ...f, nombre_plan: e.target.value }))}
                  placeholder="Ej: Mantenimiento Preventivo Mensual"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={newForm.tipo} onValueChange={v => setNewForm(f => ({ ...f, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Preventivo", "Correctivo", "Predictivo", "Mixto"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Periodicidad</Label>
                  <Select value={newForm.periodicidad} onValueChange={v => setNewForm(f => ({ ...f, periodicidad: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(PERIODICIDADES).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Última intervención</Label>
                <Input type="date" className="h-8 text-xs" value={ultimaEjecucion}
                  onChange={e => setUltimaEjecucion(e.target.value)} />
                <p className="text-xs text-blue-600 mt-1">
                  Próxima: <strong>{format(proximaFechaPreview, "dd/MM/yyyy", { locale: es })}</strong>
                </p>
              </div>

              <div className="border rounded-lg p-3 space-y-2 bg-slate-50 dark:bg-slate-800/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={generateOrder} onChange={e => setGenerateOrder(e.target.checked)} className="rounded" />
                  <span className="text-xs font-medium">Generar orden de trabajo automáticamente</span>
                </label>
                {generateOrder && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setOrderMode("schedule")}
                      className={`flex-1 text-xs rounded-lg border py-1.5 px-2 flex items-center justify-center gap-1 transition-colors ${
                        orderMode === "schedule" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
                      }`}>
                      <CalendarPlus className="w-3.5 h-3.5" /> Programada
                    </button>
                    <button type="button" onClick={() => setOrderMode("immediate")}
                      className={`flex-1 text-xs rounded-lg border py-1.5 px-2 flex items-center justify-center gap-1 transition-colors ${
                        orderMode === "immediate" ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-600"
                      }`}>
                      <Zap className="w-3.5 h-3.5" /> Inmediata
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 flex-wrap">
                <Button type="button" variant="outline" size="sm" onClick={onClose} className="whitespace-nowrap">Cancelar</Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
                  {isPending ? "Procesando..." : generateOrder ? "Crear y generar OT" : "Crear plan"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}