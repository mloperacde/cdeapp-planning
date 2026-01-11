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

    // PASO 1: Verificar estado inicial
    log('PASO 1: Verificando estado inicial...');
    const initialMachines = await base44.asServiceRole.entities.Machine.list('', 500);
    const initialMaster = await base44.asServiceRole.entities.MachineMasterDatabase.list('', 100);
    const initialMachineProcesses = await base44.asServiceRole.entities.MachineProcess.list('', 500);
    
    log('Estado inicial', {
      machines: initialMachines.length,
      masterDatabase: initialMaster.filter(m => !m.is_deleted).length,
      machineProcesses: initialMachineProcesses.length
    });

    // PASO 2: Ejecutar consolidación de máquinas
    log('PASO 2: Ejecutando consolidación de máquinas...');
    const consolidationResult = await base44.asServiceRole.functions.invoke('consolidateMachines', {});
    
    if (!consolidationResult?.data?.success) {
      throw new Error(`Consolidación falló: ${consolidationResult?.data?.error || 'Error desconocido'}`);
    }

    log('Consolidación completada', consolidationResult.data.summary);

    // PASO 3: Verificar datos migrados
    log('PASO 3: Verificando datos migrados...');
    const afterConsolidation = await base44.asServiceRole.entities.MachineMasterDatabase.list('', 500);
    const activeMaster = afterConsolidation.filter(m => !m.is_deleted);
    
    log('Verificación post-consolidación', {
      totalRecords: afterConsolidation.length,
      activeRecords: activeMaster.length,
      withProcesses: activeMaster.filter(m => m.procesos_configurados?.length > 0).length
    });

    // PASO 4: Actualizar referencias
    log('PASO 4: Actualizando referencias en entidades relacionadas...');
    const referencesResult = await base44.asServiceRole.functions.invoke('updateMachineReferences', {});
    
    if (!referencesResult?.data?.success) {
      throw new Error(`Actualización de referencias falló: ${referencesResult?.data?.error || 'Error desconocido'}`);
    }

    log('Referencias actualizadas', referencesResult.data.summary);

    // PASO 5: Verificación final
    log('PASO 5: Verificación final de integridad...');
    
    // Verificar que todas las referencias están correctas
    const finalMaster = await base44.asServiceRole.entities.MachineMasterDatabase.list('', 500);
    const masterIds = new Set(finalMaster.filter(m => !m.is_deleted).map(m => m.id));
    
    const maintenance = await base44.asServiceRole.entities.MaintenanceSchedule.list('', 100);
    const assignments = await base44.asServiceRole.entities.MachineAssignment.list('', 100);
    
    const brokenMaintenanceRefs = maintenance.filter(m => m.machine_id && !masterIds.has(m.machine_id)).length;
    const brokenAssignmentRefs = assignments.filter(a => a.machine_id && !masterIds.has(a.machine_id)).length;
    
    log('Verificación de integridad', {
      totalMasterMachines: masterIds.size,
      maintenanceRecords: maintenance.length,
      assignmentRecords: assignments.length,
      brokenMaintenanceRefs,
      brokenAssignmentRefs
    });

    // Resumen final
    const finalSummary = {
      consolidation: {
        machinesMigrated: consolidationResult.data.summary.migrated,
        duplicatesFixed: consolidationResult.data.summary.duplicates_fixed,
        processesIntegrated: consolidationResult.data.summary.processes_integrated,
        errors: consolidationResult.data.summary.errors
      },
      references: {
        maintenanceUpdated: referencesResult.data.results.maintenanceUpdated,
        assignmentsUpdated: referencesResult.data.results.assignmentsUpdated,
        planningUpdated: referencesResult.data.results.planningUpdated,
        statusUpdated: referencesResult.data.results.statusUpdated,
        orphanedRemoved: referencesResult.data.results.orphanedRemoved
      },
      integrity: {
        totalMasterMachines: masterIds.size,
        brokenReferences: brokenMaintenanceRefs + brokenAssignmentRefs,
        status: (brokenMaintenanceRefs + brokenAssignmentRefs === 0) ? 'LIMPIO' : 'REQUIERE ATENCIÓN'
      }
    };

    log('=== CONSOLIDACIÓN COMPLETADA CON ÉXITO ===', finalSummary);

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