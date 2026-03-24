import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 });
    }

    // FASE 1: Consolidar máquinas
    console.log('=== FASE 1: Consolidación de Máquinas ===');
    const consolidationResult = await base44.asServiceRole.functions.invoke('consolidateMachines', {});
    
    if (!consolidationResult.data.success) {
      return Response.json({ 
        success: false, 
        phase: 'consolidation',
        error: consolidationResult.data.error 
      }, { status: 500 });
    }

    console.log('Consolidación completada:', JSON.stringify(consolidationResult.data.summary, null, 2));

    // FASE 2: Actualizar referencias
    console.log('=== FASE 2: Actualización de Referencias ===');
    const referencesResult = await base44.asServiceRole.functions.invoke('updateMachineReferences', {});
    
    if (!referencesResult.data.success) {
      return Response.json({ 
        success: false, 
        phase: 'references',
        error: referencesResult.data.error,
        consolidationResult: consolidationResult.data 
      }, { status: 500 });
    }

    console.log('Referencias actualizadas:', JSON.stringify(referencesResult.data.summary, null, 2));

    // FASE 3: Verificación final
    console.log('=== FASE 3: Verificación Final ===');
    const verification = {
      machinesMigrated: consolidationResult.data.summary.migrated,
      duplicatesFixed: consolidationResult.data.summary.duplicates_fixed,
      processesIntegrated: consolidationResult.data.summary.processes_integrated,
      referencesUpdated: referencesResult.data.summary.total_updated,
      orphanedRemoved: referencesResult.data.summary.orphaned_removed,
      errors: [
        ...consolidationResult.data.results.errors,
        ...referencesResult.data.results.errors
      ]
    };

    return Response.json({
      success: true,
      consolidation: consolidationResult.data,
      references: referencesResult.data,
      verification,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en test de consolidación:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});