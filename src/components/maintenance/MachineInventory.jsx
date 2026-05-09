import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight, AlertCircle, Plus, Zap } from 'lucide-react';
import { getMachineAlias } from '@/utils/machineAlias';
import NewMachineDialog from './NewMachineDialog';
import MaintenancePlanTemplatesLibrary from './MaintenancePlanTemplatesLibrary';

export default function MachineInventory({ onSelectMachine, selectedMachineId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewMachineDialog, setShowNewMachineDialog] = useState(false);
  const [showTemplatesLibrary, setShowTemplatesLibrary] = useState(false);
  const [selectedMachineForPlan, setSelectedMachineForPlan] = useState(null);
  const queryClient = useQueryClient();

  const { data: machines = [] } = useQuery({
    queryKey: ['machines-inventory'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 500);
      return (Array.isArray(data) ? data : [])
        .filter(m => m.estado_operativo !== 'Retirada')
        .sort((a, b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999));
    },
    staleTime: 10 * 60 * 1000,
  });

  const createMachineMutation = useMutation({
    mutationFn: (data) => base44.entities.MachineMasterDatabase.create(data),
    onSuccess: (newMachine) => {
      queryClient.invalidateQueries({ queryKey: ['machines-inventory'] });
      onSelectMachine(newMachine);
    }
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['maintenance-plans'],
    queryFn: () => base44.entities.MaintenancePlan.list(),
    staleTime: 10 * 60 * 1000,
  });

  const filteredMachines = machines.filter(m => 
    getMachineAlias(m).toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.area_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMachineStatus = (machineId) => {
    const activePlans = plans.filter(p => p.machine_id === machineId && p.activo);
    if (!activePlans || activePlans.length === 0) return { status: 'sin-plan', color: 'bg-slate-100 text-slate-700' };
    
    const overduePlan = activePlans.some(p => p.proxima_fecha && new Date(p.proxima_fecha) < new Date());
    if (overduePlan) return { status: 'vencido', color: 'bg-red-100 text-red-700' };
    
    return { status: 'activo', color: 'bg-green-100 text-green-700' };
  };

  const handleCreatePlanFromTemplate = (template) => {
    if (!selectedMachineForPlan) return;
    
    // Crear nuevo plan basado en plantilla
    const newPlan = {
      machine_id: selectedMachineForPlan.id,
      machine_name: getMachineAlias(selectedMachineForPlan),
      nombre_plan: template.nombre,
      descripcion: template.descripcion,
      tipo: template.tipo,
      periodicidad: template.periodicidad,
      dias_intervalo: template.dias_intervalo,
      tareas: template.tareas || [],
      proxima_fecha: new Date().toISOString().split('T')[0],
      activo: true
    };

    base44.entities.MaintenancePlan.create(newPlan).then(() => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] });
      setShowTemplatesLibrary(false);
      setSelectedMachineForPlan(null);
    });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        <Search className="w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar máquina..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 focus-visible:ring-0 p-0 h-auto"
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowNewMachineDialog(true)}
          className="flex-1 h-8 gap-1 text-xs"
        >
          <Plus className="w-3 h-3" />
          Nueva Máquina
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {filteredMachines.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No hay máquinas disponibles
          </div>
        ) : (
          filteredMachines.map((machine) => {
            const { status, color } = getMachineStatus(machine.id);
            const machineActivePlans = plans.filter(p => p.machine_id === machine.id && p.activo);
            
            return (
              <button
                key={machine.id}
                onClick={() => onSelectMachine(machine)}
                className={`w-full p-3 rounded-lg text-left transition-all border ${
                  selectedMachineId === machine.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {getMachineAlias(machine)}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {machine.area_name} • {machine.tipo || 'General'}
                    </p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Badge className={color + ' text-xs'}>
                        {status === 'sin-plan' && 'Sin Plan'}
                        {status === 'vencido' && 'Vencido'}
                        {status === 'activo' && 'Activo'}
                      </Badge>
                      {machineActivePlans.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {machineActivePlans.length} plan(es)
                        </Badge>
                      )}
                    </div>
                    {status === 'sin-plan' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 w-full h-7 text-xs gap-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        onClick={() => {
                          setSelectedMachineForPlan(machine);
                          setShowTemplatesLibrary(true);
                        }}
                      >
                        <Zap className="w-3 h-3" />
                        Crear Plan
                      </Button>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {showNewMachineDialog && (
        <NewMachineDialog
          open={showNewMachineDialog}
          onOpenChange={setShowNewMachineDialog}
          onMachineCreated={(machine) => {
            createMachineMutation.mutate(machine);
          }}
        />
      )}

      {showTemplatesLibrary && (
        <MaintenancePlanTemplatesLibrary
          open={showTemplatesLibrary}
          onOpenChange={setShowTemplatesLibrary}
          onSelectTemplate={handleCreatePlanFromTemplate}
        />
      )}
    </div>
  );
}