import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { Cog, Users, CheckCircle2, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getMachineAlias } from "@/utils/machineAlias";

export default function MachinePlanningManager({ open, onOpenChange, machines, onUpdate }) {
  const { data: machinePlannings, refetch } = useQuery({
    queryKey: ['machinePlannings'],
    queryFn: () => base44.entities.MachinePlanning.list(),
    initialData: [],
    staleTime: 2 * 60 * 1000,
    enabled: open, // Solo cargar cuando el diálogo esté abierto
  });

  const saveMutation = useMutation({
    mutationFn: async ({ machineId, active }) => {
      const existing = machinePlannings.find(mp => mp.machine_id === machineId);
      
      if (existing) {
        return base44.entities.MachinePlanning.update(existing.id, {
          activa_planning: active,
          fecha_actualizacion: new Date().toISOString()
        });
      } else {
        return base44.entities.MachinePlanning.create({
          machine_id: machineId,
          activa_planning: active,
          fecha_actualizacion: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      refetch();
      if (onUpdate) onUpdate();
    },
  });

  const isActivePlanning = (machineId) => {
    const planning = machinePlannings.find(mp => mp.machine_id === machineId);
    return planning?.activa_planning || false;
  };

  const handleToggle = (machineId, currentState) => {
    saveMutation.mutate({ machineId, active: !currentState });
  };

  const sortedMachines = Array.isArray(machines) ? [...machines].sort((a, b) => {
    const ao = (a.orden ?? 999);
    const bo = (b.orden ?? 999);
    return ao - bo;
  }) : [];

  const activeMachines = sortedMachines.filter(m => {
    const planning = machinePlannings.find(mp => mp.machine_id === m.id);
    return planning?.activa_planning;
  });

  const totalOperatorsNeeded = activeMachines.reduce((sum, m) => sum + (m.requiere_operadores || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Cog className="w-6 h-6 text-blue-600" />
            Planificación de Máquinas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-sm text-blue-700">Total Operadores Necesarios</div>
                <div className="text-3xl font-bold text-blue-900">{totalOperatorsNeeded}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-700">Máquinas Activas</div>
              <div className="text-2xl font-bold text-blue-900">
                {activeMachines.length} / {machines.length}
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-16">Estado</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Operadores</TableHead>
                  <TableHead className="text-center">Estado Máquina</TableHead>
                  <TableHead className="text-center">Planning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMachines.map((machine) => {
                  const isActive = isActivePlanning(machine.id);
                  const isAvailable = machine.estado_disponibilidad ? (machine.estado_disponibilidad === "Disponible") : true;
                  return (
                    <TableRow key={machine.id} className={isActive ? "bg-green-50" : ""}>
                      <TableCell>
                        {isActive ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-slate-900">{getMachineAlias(machine)}</span>
                      </TableCell>
                      <TableCell className="text-slate-600">{machine.tipo || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <Users className="w-3 h-3 mr-1" />
                          {machine.requiere_operadores || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {machine.estado_disponibilidad ? (
                          <Badge className={isAvailable ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}>
                            {machine.estado_disponibilidad}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600">-</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => handleToggle(machine.id, isActive)}
                          disabled={saveMutation.isPending}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {activeMachines.length > 0 && (
            <div className="border rounded-lg p-4 bg-slate-50">
              <h4 className="font-semibold mb-3 text-slate-900">Máquinas Activas en Planning</h4>
              <div className="space-y-2">
                {activeMachines.map((machine) => (
                  <div key={machine.id} className="flex justify-between items-center p-2 bg-white rounded border">
                    <div>
                      <span className="font-semibold text-slate-900">{getMachineAlias(machine)}</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      <Users className="w-3 h-3 mr-1" />
                      {machine.requiere_operadores || 0} operadores
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
