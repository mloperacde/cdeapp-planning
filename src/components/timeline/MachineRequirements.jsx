import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Cog, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function MachineRequirements() {
  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: [],
  });

  const { data: machinePlannings } = useQuery({
    queryKey: ['machinePlannings'],
    queryFn: () => base44.entities.MachinePlanning.list(),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const activeMachines = machines.filter(m => {
    const planning = machinePlannings.find(mp => mp.machine_id === m.id);
    return planning?.activa_planning && m.estado === "Disponible";
  });

  const totalOperatorsNeeded = activeMachines.reduce((sum, m) => {
    const planning = machinePlannings.find(mp => mp.machine_id === m.id);
    return sum + (planning?.operadores_necesarios || 0);
  }, 0);

  // Contar solo empleados incluidos en planning
  const availableOperators = employees.filter(emp => 
    emp.disponibilidad === "Disponible" && emp.incluir_en_planning !== false
  ).length;

  if (activeMachines.length === 0) {
    return null;
  }

  const operatorDeficit = Math.max(0, totalOperatorsNeeded - availableOperators);
  const hasDeficit = operatorDeficit > 0;

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2">
          <Cog className="w-5 h-5 text-blue-600" />
          Requisitos de Máquinas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-blue-700 font-medium">Total Operadores Necesarios</div>
                <div className="text-3xl font-bold text-blue-900">{totalOperatorsNeeded}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-700 font-medium">Máquinas Activas</div>
              <div className="text-2xl font-bold text-blue-900">{activeMachines.length}</div>
            </div>
          </div>

          <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
            hasDeficit 
              ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' 
              : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                hasDeficit ? 'bg-red-600' : 'bg-green-600'
              }`}>
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className={`text-sm font-medium ${hasDeficit ? 'text-red-700' : 'text-green-700'}`}>
                  Operadores Disponibles (en planning)
                </div>
                <div className={`text-3xl font-bold ${hasDeficit ? 'text-red-900' : 'text-green-900'}`}>
                  {availableOperators}
                </div>
              </div>
            </div>
            {hasDeficit && (
              <div className="text-right">
                <div className="text-sm text-red-700 font-medium">Déficit</div>
                <div className="text-2xl font-bold text-red-900">-{operatorDeficit}</div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeMachines.map((machine) => {
            const planning = machinePlannings.find(mp => mp.machine_id === machine.id);
            const operatorsNeeded = planning?.operadores_necesarios || 0;
            
            return (
              <div
                key={machine.id}
                className="p-4 border-2 border-slate-200 rounded-lg bg-white hover:border-blue-300 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-slate-900">{machine.nombre}</div>
                    <div className="text-xs text-slate-500 font-mono">{machine.codigo}</div>
                  </div>
                  <Cog className="w-5 h-5 text-blue-600" />
                </div>
                
                {machine.tipo && (
                  <div className="text-xs text-slate-600 mb-2">{machine.tipo}</div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-600">Operadores:</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 font-semibold">
                    <Users className="w-3 h-3 mr-1" />
                    {operatorsNeeded}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`mt-6 p-4 rounded-lg border-2 ${
          hasDeficit 
            ? 'bg-red-50 border-red-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className={`flex items-center gap-2 ${hasDeficit ? 'text-red-800' : 'text-green-800'}`}>
            <TrendingUp className="w-5 h-5" />
            <span className="font-semibold">
              {hasDeficit 
                ? `⚠️ Déficit de ${operatorDeficit} operador(es): Se necesitan ${totalOperatorsNeeded} pero solo hay ${availableOperators} disponibles (incluidos en planning)`
                : `✓ Cobertura completa: ${availableOperators} operadores disponibles para ${totalOperatorsNeeded} necesarios en ${activeMachines.length} máquina(s)`
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}