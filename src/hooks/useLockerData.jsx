import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const EMPTY_ARRAY = [];

export function useLockerData() {
  const queryClient = useQueryClient();
  const [isDemoMode, setIsDemoMode] = useState(false);

  // --- Queries ---

  const { data: employees = EMPTY_ARRAY, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    enabled: !isDemoMode,
    staleTime: isDemoMode ? Infinity : 0,
  });

  const { data: lockerAssignments = EMPTY_ARRAY, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    refetchInterval: isDemoMode ? false : 5000,
    enabled: !isDemoMode,
    staleTime: isDemoMode ? Infinity : 0,
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

  // --- Actions ---

  const loadTestData = useCallback(() => {
    setIsDemoMode(true);
    // Cancel any ongoing refetches
    queryClient.cancelQueries({ queryKey: ['employees'] });
    queryClient.cancelQueries({ queryKey: ['lockerAssignments'] });

    const dummyEmployees = Array.from({ length: 50 }, (_, i) => ({
      id: `dummy-${i + 1}`,
      nombre: `Empleado Prueba ${i + 1}`,
      departamento: i % 3 === 0 ? "Producción" : i % 3 === 1 ? "Logística" : "Calidad",
      estado_empleado: "Alta",
      codigo_empleado: `EMP${1000 + i}`
    }));

    const dummyAssignments = dummyEmployees.slice(0, 30).map((emp, i) => ({
      id: `assign-${i + 1}`,
      employee_id: emp.id,
      vestuario: i % 2 === 0 ? "Vestuario Masculino Planta Baja" : "Vestuario Femenino Planta Baja",
      numero_taquilla_actual: `${100 + i}`,
      requiere_taquilla: true,
      fecha_asignacion: new Date().toISOString(),
      notificacion_enviada: false,
      historial_cambios: []
    }));

    // Update query cache directly
    queryClient.setQueryData(['employees'], dummyEmployees);
    queryClient.setQueryData(['lockerAssignments'], dummyAssignments);
    
    toast.success("Datos de prueba cargados (Modo Demo Activo)");
  }, [queryClient]);

  const toggleDemoMode = useCallback((value) => {
    if (value === false) {
      setIsDemoMode(false);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      toast.info("Modo Demo desactivado. Datos reales recargados.");
    } else {
      loadTestData();
    }
  }, [queryClient, loadTestData]);

  // --- Mutations ---

  // Unified save function for single or batch updates
  // updates: Array of objects { employeeId, ...fieldsToUpdate }
  const saveAssignmentsMutation = useMutation({
    mutationFn: async (updates) => {
      if (!Array.isArray(updates)) updates = [updates];
      
      console.log("[saveAssignments] Starting save for", updates.length, "updates. Demo Mode:", isDemoMode);
      
      const errors = [];
      let processedCount = 0;

      // Local helper to update cache
      const updateCache = (updater) => {
        queryClient.setQueryData(['lockerAssignments'], (oldData) => {
          const currentData = oldData || [];
          console.log("[saveAssignments] Updating cache. Current items:", currentData.length);
          return updater(currentData);
        });
      };

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

          // --- DEMO MODE ---
          if (isDemoMode || id.startsWith('dummy-')) {
             console.log(`[TEST MODE] Saving for ${id}`, recordToSave);
             updateCache(currentData => {
               const newData = [...currentData];
               const index = newData.findIndex(la => String(la.employee_id) === id);
               const finalRecord = {
                 ...recordToSave,
                 id: existing?.id || `assign-${Date.now()}-${Math.random()}`
               };
               
               if (index >= 0) {
                 newData[index] = { ...newData[index], ...finalRecord };
               } else {
                 newData.push(finalRecord);
               }
               return newData;
             });
             
             // Simulate delay
             await new Promise(resolve => setTimeout(resolve, 50));
             processedCount++;
             continue;
          }

          // --- REAL MODE ---
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
             console.warn("Could not sync with EmployeeMasterDatabase (might be expected if permissions missing):", syncError);
             // Don't fail the whole operation just because sync failed, especially if permissions are tight
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
      console.log("[saveAssignments] Mutation successful");
      // Invalidate queries to refetch fresh data (only in real mode)
      if (!isDemoMode) {
        queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      } else {
         // Force a re-render by invalidating but not refetching (since we updated cache)
         // Actually, setQueryData triggers re-render. We don't need to invalidate if we updated correctly.
         // But let's invalidate 'lockerAssignments' just in case, relying on staleTime: Infinity to NOT fetch but re-read cache?
         // No, invalidating triggers fetch if enabled.
         // Since enabled is false, it won't fetch.
         queryClient.invalidateQueries({ queryKey: ['lockerAssignments'], refetchType: 'none' });
      }
    }
  });

  return {
    employees,
    lockerAssignments,
    teams,
    lockerRoomConfigs,
    isLoading: isLoadingEmployees || isLoadingAssignments,
    isDemoMode,
    toggleDemoMode,
    loadTestData,
    saveAssignments: saveAssignmentsMutation.mutateAsync,
    isSaving: saveAssignmentsMutation.isPending
  };
}
