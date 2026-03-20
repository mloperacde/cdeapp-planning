import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Clock, AlertCircle, UserPlus, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG = {
  'Asignado': { color: 'bg-blue-100 text-blue-700', icon: Clock },
  'En Progreso': { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  'Completado': { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  'Vencido': { color: 'bg-red-100 text-red-700', icon: AlertCircle },
  'Cancelado': { color: 'bg-slate-100 text-slate-500', icon: AlertCircle },
};

export default function TrainingAssignmentPanel({ module }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [fechaLimite, setFechaLimite] = useState('');

  const { data: assignments = [] } = useQuery({
    queryKey: ['training-assignments', module?.id],
    queryFn: () => base44.entities.TrainingAssignment.filter({ trainingModuleId: module?.id }),
    enabled: !!module?.id
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-training'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.filter({ estado_empleado: 'Alta' }, 'nombre', 200),
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const records = selectedEmployees.map(emp => ({
        employeeId: emp.id,
        employeeName: emp.nombre,
        employeeDepartamento: emp.departamento || '',
        employeePuesto: emp.puesto || '',
        trainingModuleId: module.id,
        trainingModuleTitulo: module.titulo,
        fechaAsignacion: today,
        fechaLimite: fechaLimite || null,
        estado: 'Asignado'
      }));
      return base44.entities.TrainingAssignment.bulkCreate(records);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments', module?.id] });
      setShowAssignDialog(false);
      setSelectedEmployees([]);
      setFechaLimite('');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, estado, puntuacion, superado }) =>
      base44.entities.TrainingAssignment.update(id, { estado, puntuacion, superado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['training-assignments', module?.id] })
  });

  const filtered = assignments.filter(a =>
    a.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
    a.employeeDepartamento?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEmployees = employees.filter(e =>
    !assignments.find(a => a.employeeId === e.id)
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Empleados Asignados</h3>
          <p className="text-sm text-slate-500">{assignments.length} asignaciones activas</p>
        </div>
        <Button size="sm" onClick={() => setShowAssignDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4" /> Asignar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = assignments.filter(a => a.estado === status).length;
          if (!count && status === 'Cancelado') return null;
          const Icon = cfg.icon;
          return (
            <div key={status} className="bg-white dark:bg-card border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
              <Badge className={`${cfg.color} text-xs mt-1`}>{status}</Badge>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empleado..." className="pl-9" />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay empleados asignados aún</p>
          </div>
        ) : (
          filtered.map(assignment => {
            const cfg = STATUS_CONFIG[assignment.estado] || STATUS_CONFIG['Asignado'];
            const Icon = cfg.icon;
            return (
              <div key={assignment.id} className="flex items-center justify-between bg-white dark:bg-card border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {assignment.employeeName?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{assignment.employeeName}</p>
                    <p className="text-xs text-slate-500">{assignment.employeeDepartamento} · {assignment.employeePuesto}</p>
                    {assignment.fechaLimite && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        Límite: {format(new Date(assignment.fechaLimite), 'dd MMM yyyy', { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${cfg.color} text-xs`}>{assignment.estado}</Badge>
                  {assignment.puntuacion != null && (
                    <Badge className={assignment.superado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {assignment.puntuacion}%
                    </Badge>
                  )}
                  {assignment.estado === 'Asignado' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatusMutation.mutate({ id: assignment.id, estado: 'En Progreso' })}>
                      Iniciar
                    </Button>
                  )}
                  {assignment.estado === 'En Progreso' && (
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => updateStatusMutation.mutate({ id: assignment.id, estado: 'Completado', puntuacion: 100, superado: true })}>
                      Completar
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Módulo a Empleados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fecha Límite (opcional)</Label>
              <Input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Seleccionar Empleados ({selectedEmployees.length} seleccionados)</Label>
              <div className="mt-2 max-h-64 overflow-y-auto border rounded-lg divide-y">
                {filteredEmployees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={selectedEmployees.some(e => e.id === emp.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedEmployees(prev => [...prev, emp]);
                        else setSelectedEmployees(prev => prev.filter(e => e.id !== emp.id));
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium">{emp.nombre}</p>
                      <p className="text-xs text-slate-500">{emp.departamento} · {emp.puesto}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={selectedEmployees.length === 0 || assignMutation.isPending} onClick={() => assignMutation.mutate()}>
              {assignMutation.isPending ? 'Asignando...' : `Asignar a ${selectedEmployees.length} empleado(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}