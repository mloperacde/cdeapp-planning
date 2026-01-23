import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Wrench } from "lucide-react";

export default function MachineDisplayVerification({ employeeId }) {
  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ['employeeMaster', employeeId],
    queryFn: async () => {
      const all = await base44.entities.EmployeeMasterDatabase.list();
      return all.find(e => e.id === employeeId);
    },
    enabled: !!employeeId
  });

  const { data: allMachines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ['allMachinesMaster'],
    queryFn: async () => {
      const machines = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      return machines.map(m => ({
        id: m.id,
        nombre: m.nombre,
        codigo: m.codigo_maquina
      }));
    },
  });

  const { data: employeeSkills = [] } = useQuery({
    queryKey: ['employeeSkills', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const all = await base44.entities.EmployeeMachineSkill.list(undefined, 1000);
      return all.filter(s => s.employee_id === employeeId);
    },
    enabled: !!employeeId,
  });

  if (!employeeId) return null;
  if (empLoading || machinesLoading) {
    return (
      <Card className="border-blue-300">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2">Cargando verificación...</span>
        </CardContent>
      </Card>
    );
  }

  // Recopilar máquinas desde campos legacy y skills
  const machinesFromLegacy = [];
  const machinesFromSkills = [];

  for (let i = 1; i <= 10; i++) {
    const machineId = employee?.[`maquina_${i}`];
    if (machineId) {
      const machine = allMachines.find(m => m.id === machineId);
      if (machine) {
        machinesFromLegacy.push({ priority: i, ...machine });
      }
    }

    const skill = employeeSkills.find(s => s.orden_preferencia === i);
    if (skill?.machine_id) {
      const machine = allMachines.find(m => m.id === skill.machine_id);
      if (machine) {
        machinesFromSkills.push({ priority: i, skill: skill, ...machine });
      }
    }
  }

  const totalMachines = Math.max(machinesFromLegacy.length, machinesFromSkills.length);
  const isSync = machinesFromLegacy.length === machinesFromSkills.length;

  return (
    <Card className="border-2 border-blue-400 bg-blue-50/30">
      <CardHeader className="bg-blue-100/50 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-600" />
          Verificación de Visualización de Máquinas - {employee?.nombre}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          {isSync ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-amber-600" />
          )}
          <span className="font-semibold">
            {isSync ? "✅ Sincronizado" : "⚠️ Desincronizado"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-slate-700">Campos Legacy (maquina_X):</h4>
            {machinesFromLegacy.length === 0 ? (
              <p className="text-xs text-slate-500">Sin máquinas asignadas</p>
            ) : (
              <div className="space-y-1">
                {machinesFromLegacy.map(m => (
                  <div key={m.priority} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="w-6 justify-center">{m.priority}</Badge>
                    <span>{m.nombre} ({m.codigo})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-slate-700">EmployeeMachineSkill:</h4>
            {machinesFromSkills.length === 0 ? (
              <p className="text-xs text-slate-500">Sin registros de skills</p>
            ) : (
              <div className="space-y-1">
                {machinesFromSkills.map(m => (
                  <div key={m.id} className="flex items-center gap-2 text-xs p-1 hover:bg-slate-50 rounded">
                    <Badge variant="outline" className="w-6 justify-center">{m.priority}</Badge>
                    <span>{m.descripcion || m.nombre} ({m.codigo})</span>
                    <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                      {m.skill.nivel_habilidad || 'N/A'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-3 space-y-1">
          <p className="text-xs text-slate-600">
            <strong>Total máquinas:</strong> {totalMachines}
          </p>
          <p className="text-xs text-slate-600">
            <strong>Fuente de datos:</strong> MachineMasterDatabase ({allMachines.length} máquinas disponibles)
          </p>
          <p className="text-xs text-slate-600">
            <strong>Estado integración:</strong> {
              machinesFromSkills.length > 0 
                ? "✅ Skills creados correctamente" 
                : "⚠️ Sin registros EmployeeMachineSkill"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}