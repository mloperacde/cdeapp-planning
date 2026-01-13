import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Hook global para mutaciones de entidades con:
 * - Invalidación automática de queries relacionadas
 * - Manejo de errores estandarizado
 * - Mensajes de éxito/error automáticos
 * - Propagación de cambios a módulos relacionados
 */
export function useEntityMutation(entityName, options = {}) {
  const queryClient = useQueryClient();
  const {
    onSuccessMessage = 'Guardado correctamente',
    onErrorMessage = 'Error al guardar',
    invalidateQueries = [],
    onSuccess: customOnSuccess,
    onError: customOnError,
    ...restOptions
  } = options;

  // Mapeo de entidades relacionadas que deben invalidarse
  const RELATED_QUERIES = {
    EmployeeMasterDatabase: [
      'employeeMasterDatabase',
      'allEmployeesMaster',
      'employeesMaster',
      'employees',
      'currentEmployee',
      'lockerAssignments',
      'employeeSkills',
      'employeeMachineSkills',
      'machineAssignments',
      'shiftAssignments'
    ],
    Machine: [
      'machines',
      'machinesMaster',
      'machinePlanning',
      'machineAssignments',
      'employeeMachineSkills',
      'maintenanceSchedules'
    ],
    MachineMasterDatabase: [
      'machines',
      'machinesMaster',
      'machinePlanning',
      'machineAssignments',
      'employeeMachineSkills',
      'maintenanceSchedules'
    ],
    EmployeeMachineSkill: [
      'employeeMachineSkills',
      'employeeSkills',
      'machineAssignments',
      'employeeMasterDatabase',
      'employees'
    ],
    Absence: [
      'absences',
      'employeeMasterDatabase',
      'employees',
      'absenceTypes'
    ],
    MachineAssignment: [
      'machineAssignments',
      'employeeMachineSkills',
      'machines',
      'employees'
    ],
    ShiftAssignment: [
      'shiftAssignments',
      'employees',
      'machines',
      'teamConfigs'
    ],
    TeamConfig: [
      'teamConfigs',
      'employees',
      'shiftAssignments'
    ],
    LockerAssignment: [
      'lockerAssignments',
      'employees'
    ]
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities[entityName].create(data),
    onSuccess: (data, variables, context) => {
      // Invalidar queries relacionadas
      const relatedQueries = RELATED_QUERIES[entityName] || [];
      const queriesToInvalidate = [...new Set([...relatedQueries, ...invalidateQueries, entityName.toLowerCase()])];
      
      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      toast.success(onSuccessMessage);
      customOnSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      console.error(`Error creating ${entityName}:`, error);
      toast.error(`${onErrorMessage}: ${error.message || 'Error desconocido'}`);
      customOnError?.(error, variables, context);
    },
    ...restOptions
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities[entityName].update(id, data),
    onSuccess: (data, variables, context) => {
      const relatedQueries = RELATED_QUERIES[entityName] || [];
      const queriesToInvalidate = [...new Set([...relatedQueries, ...invalidateQueries, entityName.toLowerCase()])];
      
      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      toast.success(onSuccessMessage);
      customOnSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      console.error(`Error updating ${entityName}:`, error);
      toast.error(`${onErrorMessage}: ${error.message || 'Error desconocido'}`);
      customOnError?.(error, variables, context);
    },
    ...restOptions
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[entityName].delete(id),
    onSuccess: (data, variables, context) => {
      const relatedQueries = RELATED_QUERIES[entityName] || [];
      const queriesToInvalidate = [...new Set([...relatedQueries, ...invalidateQueries, entityName.toLowerCase()])];
      
      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      toast.success('Eliminado correctamente');
      customOnSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      console.error(`Error deleting ${entityName}:`, error);
      toast.error(`Error al eliminar: ${error.message || 'Error desconocido'}`);
      customOnError?.(error, variables, context);
    },
    ...restOptions
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  };
}