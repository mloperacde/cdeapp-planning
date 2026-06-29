import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Plus, AlertTriangle, CheckCircle2, Clock, MapPin } from "lucide-react";
import NewMachineDialog from "./NewMachineDialog";
import { useQueryClient } from "@tanstack/react-query";

const parseArea = (ubicacion) => {
  if (!ubicacion) return "Sin área";
  return ubicacion.split("/")[0].trim();
};

export default function GmaoMachinePanel({ selectedMachineId, onSelectMachine }) {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const queryClient = useQueryClient();

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ["machines"],
    queryFn: () => base44.entities.Machine.list("codigo", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["maintenance-plans"],
    queryFn: () => base44.entities.MaintenancePlan.list(undefined, 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: maintenanceTypes = [] } = useQuery({
    queryKey: ["maintenanceTypes"],
    queryFn: () => base44.entities.MaintenanceType.list(),
    staleTime: 5 * 60 * 1000,
  });

  const getStatus = (machineId) => {
    const assignedTypes = maintenanceTypes.filter(mt => mt.machine_ids?.includes(machineId));
    const machinePlans = plans.filter(p => p.machine_id === machineId && p.activo);
    if (assignedTypes.length === 0) return "sin-plan";
    const overdue = machinePlans.some(p => p.proxima_fecha && new Date(p.proxima_fecha) < new Date());
    if (overdue) return "vencido";
    return "activo";
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return machines.filter(m =>
      m.estado_operativo !== "Retirada" &&
      (!s || m.nombre?.toLowerCase().includes(s) || m.codigo?.toLowerCase().includes(s) || parseArea(m.ubicacion).toLowerCase().includes(s))
    );
  }, [machines, search]);

  const statusConfig = {
    "activo": { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    "vencido": { color: "bg-red-100 text-red-700", icon: AlertTriangle },
    "sin-plan": { color: "bg-slate-100 text-slate-500", icon: Clock },
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          placeholder="Buscar máquina..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1"
        onClick={() => setShowNew(true)}
      >
        <Plus className="w-3 h-3" />
        Nueva Máquina
      </Button>

      {/* Machine list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {isLoading ? (
          <div className="text-center py-8 text-xs text-slate-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">Sin máquinas</div>
        ) : filtered.map(machine => {
          const st = getStatus(machine.id);
          const cfg = statusConfig[st];
          const Icon = cfg.icon;
          const isSelected = selectedMachineId === machine.id;
          const assignedCount = maintenanceTypes.filter(mt => mt.machine_ids?.includes(machine.id)).length;

          return (
            <button
              key={machine.id}
              onClick={() => onSelectMachine(machine)}
              className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{machine.nombre}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-mono text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1 rounded">{machine.codigo}</span>
                    {machine.ubicacion && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5 truncate">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{parseArea(machine.ubicacion)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge className={`${cfg.color} text-[10px] px-1.5 py-0 flex items-center gap-0.5`}>
                    <Icon className="w-2.5 h-2.5" />
                    {st === "activo" ? `${assignedCount}p` : st === "vencido" ? "Venc." : "Sin plan"}
                  </Badge>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-[10px] text-slate-400 text-center">{filtered.length} equipo(s)</div>

      {showNew && (
        <NewMachineDialog
          open={showNew}
          onOpenChange={setShowNew}
          onMachineCreated={async (data) => {
            const m = await base44.entities.Machine.create(data);
            queryClient.invalidateQueries({ queryKey: ["machines"] });
            onSelectMachine(m);
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}