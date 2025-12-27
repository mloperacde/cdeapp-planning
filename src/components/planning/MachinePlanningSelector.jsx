import React, { useState, useMemo } from "react";
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
  const [debugInfo, setDebugInfo] = useState(null);

  // Función helper para convertir cualquier dato a array
  const normalizeToArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try {
        // Intentar parsear como JSON
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // Si falla, intentar separar por comas
        return data.split(',').map(item => item.trim()).filter(Boolean);
      }
    }
    return [];
  };

  // Máquinas disponibles (no ya planificadas)
  const availableMachines = useMemo(() => {
    console.log("🛠️ Máquinas disponibles:", {
      totalMachines: machines.length,
      alreadySelectedIds,
      available: machines.filter(m => !alreadySelectedIds.includes(m.id)).length
    });
    return machines.filter(m => !alreadySelectedIds.includes(m.id));
  }, [machines, alreadySelectedIds]);

  // Procesos compatibles con la máquina seleccionada
  const compatibleProcesses = useMemo(() => {
    console.log("🔍 Calculando procesos compatibles...");
    
    if (!selectedMachineId || !machines.length || !processes.length) {
      console.log("❌ Faltan datos para calcular");
      return [];
    }
    
    const machine = machines.find(m => m.id === selectedMachineId);
    if (!machine) {
      console.log("❌ Máquina no encontrada:", selectedMachineId);
      return [];
    }
    
    // DEBUG EXTENDIDO
    console.log("📋 DEBUG MÁQUINA:", {
      id: machine.id,
      nombre: machine.nombre || machine.machine_nombre,
      codigo: machine.codigo,
      // Buscar TODOS los campos relacionados con procesos
      camposRelevantes: Object.entries(machine).filter(([key, value]) => 
        key.toLowerCase().includes('proceso') || 
        key.toLowerCase().includes('process') ||
        (Array.isArray(value) && value.length > 0) ||
        (typeof value === 'string' && value.includes('['))
      )
    });
    
    // ESTRATEGIA 1: Buscar en campos conocidos
    const possibleFields = [
      'procesos_ids',
      'procesos_asignados', 
      'process_ids',
      'assigned_processes',
      'maquinas_procesos'  // Podría ser inverso
    ];
    
    let machineProcessIds = [];
    
    for (const field of possibleFields) {
      if (machine[field]) {
        console.log(`✅ Campo encontrado: ${field} =`, machine[field]);
        const normalized = normalizeToArray(machine[field]);
        if (normalized.length > 0) {
          machineProcessIds = normalized;
          break;
        }
      }
    }
    
    // ESTRATEGIA 2: Si no hay IDs directos, buscar procesos que referencien esta máquina
    if (machineProcessIds.length === 0) {
      console.log("🔄 Buscando procesos que tengan esta máquina...");
      
      const processesWithMachine = processes.filter(process => {
        // Buscar en campos del proceso que puedan referenciar máquinas
        const processFields = [
          'maquinas_asignadas',
          'assigned_machines',
          'machine_ids',
          'maquinas_ids'
        ];
        
        for (const field of processFields) {
          if (process[field]) {
            const normalized = normalizeToArray(process[field]);
            if (normalized.includes(machine.id)) {
              console.log(`✅ Proceso ${process.nombre} tiene máquina en campo ${field}`);
              return true;
            }
          }
        }
        return false;
      });
      
      console.log("📊 Resultado búsqueda inversa:", {
        procesosEncontrados: processesWithMachine.length,
        procesos: processesWithMachine.map(p => p.nombre)
      });
      
      return processesWithMachine;
    }
    
    // Filtrar procesos por los IDs encontrados
    const filteredProcesses = processes.filter(p => machineProcessIds.includes(p.id));
    
    console.log("📊 Resultado:", {
      machineProcessIds,
      totalProcesses: processes.length,
      compatibleProcesses: filteredProcesses.length,
      processNames: filteredProcesses.map(p => p.nombre)
    });
    
    // Guardar debug info
    setDebugInfo({
      machineId: machine.id,
      machineName: machine.nombre || machine.machine_nombre,
      processIdsFound: machineProcessIds,
      compatibleCount: filteredProcesses.length,
      strategy: machineProcessIds.length > 0 ? "direct" : "reverse"
    });
    
    return filteredProcesses;
  }, [selectedMachineId, machines, processes]);

  const selectedProcess = processes.find(p => p.id === selectedProcessId);

  const handleAdd = () => {
    if (!selectedMachineId || !selectedProcessId) return;
    
    const machine = machines.find(m => m.id === selectedMachineId);
    const process = processes.find(p => p.id === selectedProcessId);
    
    if (!machine || !process) return;

    onAddMachine({
      machine_id: machine.id,
      machine_nombre: machine.nombre || machine.machine_nombre,
      machine_codigo: machine.codigo,
      process_id: process.id,
      process_nombre: process.nombre || process.proceso_nombre,
      operadores_requeridos: process.operadores_requeridos || 1,
      observaciones: observaciones || ""
    });

    // Reset
    setSelectedMachineId("");
    setSelectedProcessId("");
    setObservaciones("");
    setDebugInfo(null);
  };

  return (
    <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">Añadir Máquina al Planning</h3>
        </div>
        
        {/* DEBUG PANEL */}
        {debugInfo && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">🔍 Debug Info</span>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setDebugInfo(null)}
                className="h-6 px-2 text-xs"
              >
                Cerrar
              </Button>
            </div>
            <div className="mt-2 text-xs space-y-1">
              <p><strong>Máquina:</strong> {debugInfo.machineName}</p>
              <p><strong>IDs encontrados:</strong> {debugInfo.processIdsFound.length}</p>
              <p><strong>Procesos compatibles:</strong> {debugInfo.compatibleCount}</p>
              <p><strong>Estrategia:</strong> {debugInfo.strategy}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-2">
              <Label className="text-xs">Seleccionar Máquina</Label>
              <Select value={selectedMachineId} onValueChange={(val) => {
                console.log("🔄 Máquina seleccionada:", val);
                setSelectedMachineId(val);
                setSelectedProcessId(""); // Reset proceso
                setDebugInfo(null); // Limpiar debug
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegir máquina..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMachines.map(machine => (
                    <SelectItem key={machine.id} value={machine.id}>
                      <div className="flex items-center gap-2">
                        <Cog className="w-3 h-3" />
                        {machine.nombre || machine.machine_nombre} 
                        ({machine.codigo})
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
                onValueChange={(val) => {
                  console.log("🔄 Proceso seleccionado:", val);
                  setSelectedProcessId(val);
                }}
                disabled={!selectedMachineId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegir proceso..." />
                </SelectTrigger>
                <SelectContent>
                  {compatibleProcesses.length === 0 ? (
                    <div className="p-3">
                      {selectedMachineId ? (
                        <div className="space-y-2">
                          <p className="text-xs text-amber-600 font-semibold">
                            ⚠️ No hay procesos configurados para esta máquina
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                            onClick={() => {
                              const machine = machines.find(m => m.id === selectedMachineId);
                              console.log("🔧 Datos de la máquina:", machine);
                              console.log("🔧 Todos los campos:", Object.keys(machine));
                              console.log("🔧 Primer proceso:", processes[0]);
                            }}
                          >
                            Ver datos de debug
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">
                          Selecciona una máquina primero
                        </p>
                      )}
                    </div>
                  ) : (
                    compatibleProcesses.map(proc => (
                      <SelectItem key={proc.id} value={proc.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{proc.nombre || proc.proceso_nombre}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {proc.operadores_requeridos || 1} op.
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              {/* INFO ADICIONAL */}
              {selectedMachineId && (
                <div className="text-xs text-gray-500 mt-1">
                  <p>
                    Procesos encontrados: {compatibleProcesses.length} de {processes.length}
                  </p>
                </div>
              )}
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
        
        {/* BOTÓN DEBUG PARA DESARROLLADORES */}
        {process.env.NODE_ENV === 'development' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => {
              console.log("=== DEBUG COMPLETO ===");
              console.log("Máquinas:", machines.slice(0, 3));
              console.log("Procesos:", processes.slice(0, 3));
              console.log("Máquina seleccionada:", machines.find(m => m.id === selectedMachineId));
            }}
          >
            🔍 Mostrar Debug Completo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}