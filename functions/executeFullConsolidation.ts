import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const executionLog = [];
  
  function log(message, data = null) {
    const entry = { timestamp: new Date().toISOString(), message, data };
    executionLog.push(entry);
    console.log(`[${entry.timestamp}] ${message}`, data || '');
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 });
    }

    log('=== INICIANDO CONSOLIDACIÓN COMPLETA DE MÁQUINAS ===');

    // PASO 1: Ejecutar consolidateMachines
    log('PASO 1: Ejecutando consolidateMachines...');
    const consolidationResult = await base44.asServiceRole.functions.invoke('consolidateMachines', {});
    
    if (!consolidationResult?.data?.success) {
      throw new Error(`consolidateMachines falló: ${consolidationResult?.data?.error || 'Error desconocido'}`);
    }

    log('consolidateMachines completado', consolidationResult.data.summary);

    // PASO 2: Ejecutar updateMachineReferences
    log('PASO 2: Ejecutando updateMachineReferences...');
    const referencesResult = await base44.asServiceRole.functions.invoke('updateMachineReferences', {});
    
    if (!referencesResult?.data?.success) {
      throw new Error(`updateMachineReferences falló: ${referencesResult?.data?.error || 'Error desconocido'}`);
    }

    log('updateMachineReferences completado', referencesResult.data.summary);

    // PASO 3: Verificación final
    log('PASO 3: Realizando verificación final...');
    
    const finalMaster = await base44.asServiceRole.entities.MachineMasterDatabase.list('', 500);
    const finalLegacy = await base44.asServiceRole.entities.Machine.list('', 500);
    const masterIds = new Set(finalMaster.filter(m => !m.is_deleted).map(m => m.id));
    
    const [maintenance, assignments, planning, status] = await Promise.all([
      base44.asServiceRole.entities.MaintenanceSchedule.list('', 500),
      base44.asServiceRole.entities.MachineAssignment.list('', 500),
      base44.asServiceRole.entities.MachinePlanning.list('', 500),
      base44.asServiceRole.entities.MachineStatus?.list('', 500).catch(() => [])
    ]);
    
    const brokenMaintenance = maintenance.filter(m => m.machine_id && !masterIds.has(m.machine_id)).length;
    const brokenAssignments = assignments.filter(a => a.machine_id && !masterIds.has(a.machine_id)).length;
    const brokenPlanning = planning.filter(p => p.machine_id && !masterIds.has(p.machine_id)).length;
    
    log('Verificación final de integridad', {
      totalMasterMachines: masterIds.size,
      totalLegacyMachines: finalLegacy.length,
      maintenanceTotal: maintenance.length,
      brokenMaintenance,
      assignmentsTotal: assignments.length,
      brokenAssignments,
      planningTotal: planning.length,
      brokenPlanning
    });

    const finalSummary = {
      machines: {
        master: finalMaster.filter(m => !m.is_deleted).length,
        legacy: finalLegacy.length,
        duplicatesCorrected: consolidationResult.data.summary.duplicates_fixed
      },
      processes: {
        total: consolidationResult.data.summary.processes_integrated
      },
      references: {
        maintenance: { total: maintenance.length, broken: brokenMaintenance, updated: referencesResult.data.results.maintenanceUpdated },
        assignments: { total: assignments.length, broken: brokenAssignments, updated: referencesResult.data.results.assignmentsUpdated },
        planning: { total: planning.length, broken: brokenPlanning, updated: referencesResult.data.results.planningUpdated },
        orphanedRemoved: referencesResult.data.results.orphanedRemoved
      },
      integrity: {
        status: (brokenMaintenance + brokenAssignments + brokenPlanning === 0) ? 'OK' : 'REQUIERE_ATENCIÓN'
      }
    };

    log('=== CONSOLIDACIÓN COMPLETADA EXITOSAMENTE ===', finalSummary);

    return Response.json({
      success: true,
      summary: finalSummary,
      executionLog,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log('ERROR CRÍTICO', { message: error.message, stack: error.stack });
    console.error('Error en consolidación:', error);
    
    return Response.json({ 
      success: false, 
      error: error.message,
      executionLog,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});