import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      phase: 'Consolidación de Datos',
      timestamp: new Date().toISOString(),
      consolidations: [],
      errors: []
    };

    // 1. Analizar MachinePlanning → DailyMachinePlanning
    try {
      const machinePlanningRecords = await base44.asServiceRole.entities.MachinePlanning.list();
      const dailyMachinePlanningRecords = await base44.asServiceRole.entities.DailyMachinePlanning.list();
      
      results.consolidations.push({
        consolidation: 'MachinePlanning → DailyMachinePlanning',
        sourceRecords: machinePlanningRecords.length,
        targetRecords: dailyMachinePlanningRecords.length,
        action: 'analyzed',
        recommendation: machinePlanningRecords.length > 0 
          ? 'Requiere migración manual de datos'
          : 'No requiere acción, entidad vacía',
        dataPreserved: true
      });
    } catch (error) {
      results.errors.push({
        consolidation: 'MachinePlanning',
        error: error.message
      });
    }

    // 2. Analizar DailyMachineStaffing → MachineAssignment
    try {
      const staffingRecords = await base44.asServiceRole.entities.DailyMachineStaffing.list();
      const assignmentRecords = await base44.asServiceRole.entities.MachineAssignment.list();
      
      results.consolidations.push({
        consolidation: 'DailyMachineStaffing → MachineAssignment',
        sourceRecords: staffingRecords.length,
        targetRecords: assignmentRecords.length,
        action: 'analyzed',
        recommendation: staffingRecords.length > 0
          ? 'Verificar estructura y migrar si es compatible'
          : 'No requiere acción, entidad vacía',
        dataPreserved: true
      });
    } catch (error) {
      results.errors.push({
        consolidation: 'DailyMachineStaffing',
        error: error.message
      });
    }

    // 3. Analizar notificaciones
    try {
      const notifPrefs = await base44.asServiceRole.entities.NotificationPreference.list();
      const emailConfigs = await base44.asServiceRole.entities.EmailNotificationConfig.list();
      
      results.consolidations.push({
        consolidation: 'Notificaciones (múltiples entidades)',
        entities: ['NotificationPreference', 'EmailNotificationConfig', 'PushNotification'],
        totalRecords: notifPrefs.length + emailConfigs.length,
        action: 'analyzed',
        recommendation: 'Mantener configuración actual, está funcional',
        dataPreserved: true
      });
    } catch (error) {
      results.errors.push({
        consolidation: 'Notificaciones',
        error: error.message
      });
    }

    results.summary = {
      totalConsolidations: results.consolidations.length,
      errors: results.errors.length,
      criticalActions: results.consolidations.filter(c => c.sourceRecords > 0).length,
      note: 'Fase de análisis completada. Consolidaciones reales requieren migración manual controlada.'
    };

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});