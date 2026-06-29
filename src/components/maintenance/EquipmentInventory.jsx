import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Search, Filter, MapPin, Tag, Calendar, Hash, Building2,
  Wrench, Plus, Eye, ChevronRight, LayoutGrid, List,
  CheckCircle2, AlertTriangle, Clock, X, Package
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AssignPlanDialog from "@/components/maintenance/AssignPlanDialog";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const parseArea = (ubicacion) => {
  if (!ubicacion) return "Sin área";
  // Format: "ÁREA PRINCIPAL/ sublocation" — extract main area before "/"
  return ubicacion.split("/")[0].trim();
};

const STATUS_COLORS = {
  "con-plan": "bg-green-100 text-green-700 border-green-200",
  "vencido": "bg-red-100 text-red-700 border-red-200",
  "sin-plan": "bg-slate-100 text-slate-500 border-slate-200",
};

// ─── Equipment Detail Dialog ──────────────────────────────────────────────────
function EquipmentDetailDialog({ equipment, plans, onClose, onAssignPlan }) {
  const equipPlans = plans; // already filtered by plansByMachine resolver

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent style={{ width: "min(92vw, 860px)", maxWidth: "none", maxHeight: "90vh", overflowY: "auto" }} className="overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="w-5 h-5 text-blue-600" />
            {equipment.nombre}
            <Badge variant="outline" className="text-xs font-mono">{equipment.codigo}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Ficha Técnica</TabsTrigger>
            <TabsTrigger value="plans">
              Planes de Mantenimiento
              {equipPlans.length > 0 && (
                <Badge className="ml-2 bg-blue-600 text-white text-xs">{equipPlans.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Código", value: equipment.codigo, icon: Hash },
                { label: "Nombre", value: equipment.nombre, icon: Package },
                { label: "Fabricante / Marca", value: equipment.marca, icon: Building2 },
                { label: "Modelo", value: equipment.modelo, icon: Tag },
                { label: "Número de Serie", value: equipment.numero_serie, icon: Hash },
                { label: "Tipo", value: equipment.tipo, icon: Wrench },
                {
                  label: "Fecha de Compra",
                  value: equipment.fecha_compra
                    ? format(new Date(equipment.fecha_compra), "dd/MM/yyyy", { locale: es })
                    : null,
                  icon: Calendar,
                },
                { label: "Ubicación", value: equipment.ubicacion, icon: MapPin },
              ].map(({ label, value, icon: Icon }) => (
                value ? (
                  <div key={label} className="flex items-start gap-2">
                    <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 break-words">{value}</p>
                    </div>
                  </div>
                ) : null
              ))}
            </div>
            {equipment.descripcion && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Descripción</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  {equipment.descripcion}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="plans" className="mt-4">
            <div className="flex justify-end mb-3">
              <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={onAssignPlan}>
                <Plus className="w-3.5 h-3.5" />
                Asignar Plan
              </Button>
            </div>
            {equipPlans.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin planes de mantenimiento asignados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {equipPlans.map(plan => (
                  <div key={plan.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-medium text-sm">{plan.nombre_plan}</p>
                      <p className="text-xs text-slate-400">{plan.periodicidad} · {plan.tipo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.proxima_fecha && (
                        <span className="text-xs text-slate-500">
                          Próx: {format(new Date(plan.proxima_fecha), "dd/MM/yy", { locale: es })}
                        </span>
                      )}
                      <Badge className={plan.activo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                        {plan.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}



// ─── Main Component ───────────────────────────────────────────────────────────
export default function EquipmentInventory() {
  const [search, setSearch] = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState("table"); // table | grid
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showAssignPlan, setShowAssignPlan] = useState(false);

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["equipment-inventory"],
    queryFn: () => base44.entities.Machine.list("codigo", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["maintenancePlans"],
    queryFn: () => base44.entities.MaintenancePlan.list(undefined, 500),
    staleTime: 5 * 60 * 1000,
  });

  // Also load MachineMasterDatabase to cross-reference plans by name
  const { data: legacyMachines = [] } = useQuery({
    queryKey: ["machineMasterDatabase-all"],
    queryFn: () => base44.entities.MachineMasterDatabase.list(undefined, 500),
    staleTime: 10 * 60 * 1000,
  });

  // Normalize a machine name for fuzzy matching: lowercase, remove spaces/dots/hyphens
  const normalizeName = (name) => (name || "").toLowerCase().replace(/[\s.\-_]+/g, "");

  // Build lookup: machine_id → plans
  const plansByMachine = useMemo(() => {
    const map = new Map();

    // Direct ID match (plans whose machine_id is a Machine entity id)
    plans.forEach(p => {
      if (!p.machine_id) return;
      if (!map.has(p.machine_id)) map.set(p.machine_id, []);
      map.get(p.machine_id).push(p);
    });

    // Build fuzzy name lookup for plans referencing MachineMasterDatabase IDs
    const legacyIdToName = new Map(legacyMachines.map(m => [m.id, m.nombre || ""]));
    // Inventory: normalized name → machine id (allow multiple with same normalized name)
    const inventoryNormMap = new Map();
    equipment.forEach(m => {
      const norm = normalizeName(m.nombre);
      if (!inventoryNormMap.has(norm)) inventoryNormMap.set(norm, m.id);
    });

    plans.forEach(p => {
      if (!p.machine_id) return;
      if (equipment.some(e => e.id === p.machine_id)) return; // already resolved via direct ID
      // Get name from legacy map or plan itself
      const rawName = legacyIdToName.get(p.machine_id) || p.machine_name || "";
      const norm = normalizeName(rawName);
      if (!norm) return;
      const inventoryId = inventoryNormMap.get(norm);
      if (inventoryId) {
        if (!map.has(inventoryId)) map.set(inventoryId, []);
        if (!map.get(inventoryId).some(x => x.id === p.id)) {
          map.get(inventoryId).push(p);
        }
      }
    });

    return map;
  }, [plans, equipment, legacyMachines]);

  const getStatus = (machineId) => {
    const mp = plansByMachine.get(machineId) || [];
    if (mp.length === 0) return "sin-plan";
    const overdue = mp.some(p => p.activo && p.proxima_fecha && new Date(p.proxima_fecha) < new Date());
    return overdue ? "vencido" : "con-plan";
  };

  const areas = useMemo(() => {
    const s = new Set(equipment.map(e => parseArea(e.ubicacion)));
    return Array.from(s).sort();
  }, [equipment]);

  const tipos = useMemo(() => {
    const s = new Set(equipment.map(e => e.tipo).filter(Boolean));
    return Array.from(s).sort();
  }, [equipment]);

  const filtered = useMemo(() => {
    return equipment.filter(e => {
      const st = getStatus(e.id);
      const matchSearch = !search ||
        e.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        e.codigo?.toLowerCase().includes(search.toLowerCase()) ||
        e.marca?.toLowerCase().includes(search.toLowerCase()) ||
        e.ubicacion?.toLowerCase().includes(search.toLowerCase());
      const matchArea = filterArea === "all" || parseArea(e.ubicacion) === filterArea;
      const matchTipo = filterTipo === "all" || e.tipo === filterTipo;
      const matchStatus = filterStatus === "all" || st === filterStatus;
      return matchSearch && matchArea && matchTipo && matchStatus;
    });
  }, [equipment, search, filterArea, filterTipo, filterStatus, plansByMachine]);

  // KPIs
  const kpis = useMemo(() => {
    const total = equipment.length;
    const conPlan = equipment.filter(e => getStatus(e.id) === "con-plan").length;
    const vencidos = equipment.filter(e => getStatus(e.id) === "vencido").length;
    const sinPlan = equipment.filter(e => getStatus(e.id) === "sin-plan").length;
    return { total, conPlan, vencidos, sinPlan };
  }, [equipment, plansByMachine]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Equipos", value: kpis.total, icon: Package, color: "blue", bg: "from-blue-50 to-blue-100 border-blue-200", text: "text-blue-900", sub: "text-blue-700" },
          { label: "Con Plan Activo", value: kpis.conPlan, icon: CheckCircle2, color: "green", bg: "from-green-50 to-green-100 border-green-200", text: "text-green-900", sub: "text-green-700" },
          { label: "Plan Vencido", value: kpis.vencidos, icon: AlertTriangle, color: "red", bg: "from-red-50 to-red-100 border-red-200", text: "text-red-900", sub: "text-red-700" },
          { label: "Sin Plan", value: kpis.sinPlan, icon: Clock, color: "slate", bg: "from-slate-50 to-slate-100 border-slate-200", text: "text-slate-900", sub: "text-slate-700" },
        ].map(({ label, value, icon: Icon, bg, text, sub }) => (
          <Card key={label} className={`bg-gradient-to-br ${bg}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${sub}`}>{label}</p>
                <p className={`text-2xl font-bold ${text}`}>{value}</p>
              </div>
              <Icon className={`w-7 h-7 ${sub}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, código, fabricante..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Estado plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="con-plan">Con plan activo</SelectItem>
              <SelectItem value="vencido">Plan vencido</SelectItem>
              <SelectItem value="sin-plan">Sin plan</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 ${viewMode === "table" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Mostrando <strong>{filtered.length}</strong> de <strong>{equipment.length}</strong> equipos
      </p>

      {/* Table View */}
      {viewMode === "table" && (
        <Card className="border shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="text-xs font-semibold">Código</TableHead>
                  <TableHead className="text-xs font-semibold w-[35%]">Descripción</TableHead>
                  <TableHead className="text-xs font-semibold">Fabricante</TableHead>
                  <TableHead className="text-xs font-semibold">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold">Área / Ubicación</TableHead>
                  <TableHead className="text-xs font-semibold">Plan</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                      No hay equipos con los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : filtered.map(eq => {
                  const st = getStatus(eq.id);
                  const plansCount = plansByMachine.get(eq.id)?.length || 0;
                  return (
                    <TableRow key={eq.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer" onClick={() => setSelectedEquipment(eq)}>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                          {eq.codigo}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                       <span className="line-clamp-2">{eq.descripcion || "—"}</span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-400">{eq.marca || "—"}</TableCell>
                      <TableCell>
                        {eq.tipo ? (
                          <Badge variant="outline" className="text-xs">{eq.tipo}</Badge>
                        ) : <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[180px]">
                        <span className="truncate block">{parseArea(eq.ubicacion)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${STATUS_COLORS[st]}`}>
                          {st === "con-plan" && `${plansCount} plan${plansCount > 1 ? "es" : ""}`}
                          {st === "vencido" && "Vencido"}
                          {st === "sin-plan" && "Sin plan"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => setSelectedEquipment(eq)}
                            title="Ver detalle"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => { setSelectedEquipment(eq); setShowAssignPlan(true); }}
                            title="Asignar plan"
                          >
                            <Plus className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">No hay equipos con los filtros seleccionados</div>
          ) : filtered.map(eq => {
            const st = getStatus(eq.id);
            const plansCount = plansByMachine.get(eq.id)?.length || 0;
            return (
              <Card
                key={eq.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 dark:border-slate-700"
                onClick={() => setSelectedEquipment(eq)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                      {eq.codigo}
                    </span>
                    <Badge className={`text-xs border ${STATUS_COLORS[st]}`}>
                      {st === "con-plan" && `${plansCount}p`}
                      {st === "vencido" && "Vencido"}
                      {st === "sin-plan" && "Sin plan"}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">{eq.nombre}</h3>
                  {eq.marca && <p className="text-xs text-slate-500">{eq.marca} {eq.modelo && `· ${eq.modelo}`}</p>}
                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{parseArea(eq.ubicacion)}</span>
                  </div>
                  {eq.tipo && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">{eq.tipo}</Badge>
                    </div>
                  )}
                  <div className="flex justify-end mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-green-600"
                      onClick={(e) => { e.stopPropagation(); setSelectedEquipment(eq); setShowAssignPlan(true); }}
                    >
                      <Plus className="w-3 h-3" />
                      Plan
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-blue-600">
                      <ChevronRight className="w-3 h-3" />
                      Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      {selectedEquipment && !showAssignPlan && (
        <EquipmentDetailDialog
          equipment={selectedEquipment}
          plans={plansByMachine.get(selectedEquipment.id) || []}
          onClose={() => setSelectedEquipment(null)}
          onAssignPlan={() => setShowAssignPlan(true)}
        />
      )}

      {/* Assign Plan Dialog */}
      {selectedEquipment && showAssignPlan && (
        <AssignPlanDialog
          equipment={selectedEquipment}
          onClose={() => { setShowAssignPlan(false); setSelectedEquipment(null); }}
        />
      )}
    </div>
  );
}