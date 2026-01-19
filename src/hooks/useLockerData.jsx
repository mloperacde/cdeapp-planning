import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const EMPTY_ARRAY = [];

export function useLockerData() {
  const queryClient = useQueryClient();

  // --- Queries ---

  const { data: employees = EMPTY_ARRAY, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
  });

  const { data: lockerAssignments = EMPTY_ARRAY, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    refetchInterval: 5000,
  });

  const { data: teams = EMPTY_ARRAY } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    staleTime: Infinity, // Config rarely changes
  });

  const { data: lockerRoomConfigs = EMPTY_ARRAY } = useQuery({
    queryKey: ['lockerRoomConfigs'],
    queryFn: () => base44.entities.LockerRoomConfig.list(),
    staleTime: Infinity,
  });

  // --- Mutations ---

  const saveAssignmentsMutation = useMutation({
    mutationFn: async (updates) => {
      if (!Array.isArray(updates)) updates = [updates];
      
      const errors = [];
      let processedCount = 0;

      for (const update of updates) {
        try {
          const { employeeId, ...data } = update;
          // Ensure ID string/number consistency
          const id = String(employeeId);
          
          // Get current state from cache (single source of truth for logic)
          const currentAssignments = queryClient.getQueryData(['lockerAssignments']) || [];
          const existing = currentAssignments.find(la => String(la.employee_id) === id);

          const now = new Date().toISOString();
          
          // Prepare data
          const recordToSave = {
            employee_id: employeeId, // Keep original type if possible, or use id
            requiere_taquilla: data.requiere_taquilla,
            vestuario: data.vestuario || "",
            numero_taquilla_actual: data.numero_taquilla_actual || "",
            numero_taquilla_nuevo: "", // Always clear new after save
            fecha_asignacion: existing?.fecha_asignacion || now,
            notificacion_enviada: data.notificacion_enviada ?? (existing?.notificacion_enviada || false),
            historial_cambios: existing?.historial_cambios || []
          };

          // Update history if changed
          if (existing && (existing.vestuario !== recordToSave.vestuario || existing.numero_taquilla_actual !== recordToSave.numero_taquilla_actual)) {
             recordToSave.historial_cambios.push({
               fecha: now,
               vestuario_anterior: existing.vestuario,
               taquilla_anterior: existing.numero_taquilla_actual,
               vestuario_nuevo: recordToSave.vestuario,
               taquilla_nueva: recordToSave.numero_taquilla_actual,
               motivo: data.motivo || "Actualización"
             });
          }

          if (existing) {
            await base44.entities.LockerAssignment.update(existing.id, recordToSave);
          } else {
            await base44.entities.LockerAssignment.create(recordToSave);
          }

          // Sync EmployeeMasterDatabase
          try {
            await base44.entities.EmployeeMasterDatabase.update(employeeId, {
              taquilla_vestuario: recordToSave.vestuario,
              taquilla_numero: recordToSave.numero_taquilla_actual
            });
          } catch (syncError) {
             console.warn("Could not sync with EmployeeMasterDatabase:", syncError);
          }

          processedCount++;

        } catch (err) {
          console.error(`Error saving assignment for ${update.employeeId}:`, err);
          errors.push(`${update.employeeId}: ${err.message}`);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Errores al guardar: ${errors.join(', ')}`);
      }

      return processedCount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
    }
  });

  return {
    employees,
    lockerAssignments,
    teams,
    lockerRoomConfigs,
    isLoading: isLoadingEmployees || isLoadingAssignments,
    saveAssignments: saveAssignmentsMutation.mutateAsync,
    isSaving: saveAssignmentsMutation.isPending
  };
}
