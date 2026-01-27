import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Cog, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MachinePlanningSelector({ 
  machines = [], 
  processes = [],
  onAddMachine,
  alreadySelectedIds = []
}) {
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [selectedProcessId, setSelectedProcessId] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Máquinas disponibles (no ya planificadas)
  const availableMachines = useMemo(() => {
    return machines.filter(m => !alreadySelectedIds.includes(m.id));
  }, [machines, alreadySelectedIds]);

  // Procesos compatibles con la máquina seleccionada
  const compatibleProcesses = useMemo(() => {
    if (!selectedMachineId) return [];
    
    const machine = machines.find(m => m.id === selectedMachineId);
    if (!machine) return [];
    
    // Obtener procesos_ids desde procesos_configurados (MachineMasterDatabase)
    let processIds = [];
    if (Array.isArray(machine.procesos_configurados)) {
      processIds = machine.procesos_configurados
        .map(p => p?.process_id)
        .filter(Boolean);
    } else if (Array.isArray(machine.procesos_ids)) {
      processIds = machine.procesos_ids;
    }
    
    if (processIds.length === 0) return [];
    
    return processes.filter(p => processIds.includes(p.id));
  }, [selectedMachineId, machines, processes]);

  const selectedProcess = processes.find(p => p.id === selectedProcessId);

  const handleAdd = () => {
    if (!selectedMachineId || !selectedProcessId) return;
    
    const machine = machines.find(m => m.id === selectedMachineId);
    const process = processes.find(p => p.id === selectedProcessId);
    
    if (!machine || !process) return;

    onAddMachine({
      machine_id: machine.id,
      machine_nombre: machine.nombre,
      machine_codigo: machine.codigo,
      process_id: process.id,
      process_nombre: process.nombre,
      operadores_requeridos: process.operadores_requeridos || 1,
      observaciones: observaciones || ""
    });

    // Reset
    setSelectedMachineId("");
    setSelectedProcessId("");
    setObservaciones("");
  };

  return (
    <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">Añadir Máquina al Planning</h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-2">
              <Label className="text-xs">Seleccionar Máquina</Label>
              <Select value={selectedMachineId} onValueChange={(val) => {
                setSelectedMachineId(val);
                setSelectedProcessId(""); // Reset proceso
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegir máquina..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMachines.map(machine => (
                    <SelectItem key={machine.id} value={machine.id}>
                      <div className="flex items-center gap-2">
                        <Cog className="w-3 h-3" />
                        {machine.nombre} ({machine.codigo})
                        {machine.ubicacion && <span className="text-xs text-slate-400">• {machine.ubicacion}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableMachines.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Todas las máquinas ya están planificadas
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Seleccionar Proceso</Label>
              <Select 
                value={selectedProcessId} 
                onValueChange={setSelectedProcessId}
                disabled={!selectedMachineId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegir proceso..." />
                </SelectTrigger>
                <SelectContent>
                  {compatibleProcesses.length === 0 ? (
                    <div className="p-3 text-xs text-amber-600">
                      ⚠️ No hay procesos configurados para esta máquina
                    </div>
                  ) : (
                    compatibleProcesses.map(proc => (
                      <SelectItem key={proc.id} value={proc.id}>
                        {proc.nombre} 
                        <Badge variant="outline" className="ml-2 text-xs">
                          {proc.operadores_requeridos || 1} op.
                        </Badge>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {selectedProcess && (
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-700">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    Operadores necesarios:
                  </p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {selectedProcess.operadores_requeridos || 1}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              Observaciones (opcional)
            </Label>
            <Input
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Verificar ajuste antes de arrancar, Producto nuevo..."
              className="text-sm"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={handleAdd}
          disabled={!selectedMachineId || !selectedProcessId}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Añadir al Planning
        </Button>
      </CardContent>
    </Card>
  );
}