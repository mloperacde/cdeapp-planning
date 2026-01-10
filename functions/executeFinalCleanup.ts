import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      phase: 'Limpieza Final',
      timestamp: new Date().toISOString(),
      analyzed: [],
      warnings: []
    };

    // Entidades marcadas para eliminación (_OLD_)
    const obsoleteEntities = [
      '_OLD_MachinePlanning',
      '_OLD_DailyMachineStaffing', 
      '_OLD_Role',
      '_OLD_UserRole',
      '_OLD_Employee'
    ];

    // Entidades sin uso (0 registros) candidatas a eliminar
    const emptyEntities = [
      "Holiday", "Vacation", "BreakShift", "ShiftAssignment",
      "TeamWeekSchedule", "PerformanceReview", "PerformanceImprovementPlan",
      "ShiftHandover", "MobileAbsenceRequest", "MaintenancePrediction",
      "ShiftSwapRequest", "RecurringPlanning", "MLPrediction",
      "DailyProductionPlanning", "DailyMaintenancePlanning",
      "DailyWarehousePlanning", "DailyQualityPlanning", "EmployeeDocument",
      "DashboardWidget", "TrainingModule", "EmployeeTraining",
      "TrainingNeed", "MachinePrediction", "CommitteeMember",
      "RiskAssessment", "WorkIncident", "UnionHoursRecord",
      "EmergencyTeamMember", "PRLDocument", "AbsenceDaysBalance",
      "ChatChannel", "ChatMessage", "RecurringAbsencePattern",
      "IncentivePlan", "DepartmentIncentiveConfig", "EmployeeIncentiveResult",
      "MachineStatus", "Article", "SMSNotificationLog",
      "ProfileChangeRequest", "UserFilterPreference", "EmployeeAuditLog",
      "AttendanceIncident", "WorkOrder", "MachineAssignmentAudit",
      "QualityInspection"
    ];

    // Analizar entidades obsoletas
    for (const entityName of obsoleteEntities) {
      results.analyzed.push({
        entity: entityName,
        type: 'obsolete',
        status: 'ready_for_deletion',
        action: 'Eliminar manualmente desde Dashboard',
        note: 'Periodo de prueba completado'
      });
    }

    // Analizar entidades vacías
    for (const entityName of emptyEntities) {
      try {
        const records = await base44.asServiceRole.entities[entityName].list();
        
        if (records.length === 0) {
          results.analyzed.push({
            entity: entityName,
            type: 'empty',
            recordCount: 0,
            status: 'safe_to_delete',
            action: 'Eliminar si no se usa en código',
            note: 'Sin datos, candidata a eliminación'
          });
        } else {
          results.warnings.push({
            entity: entityName,
            recordCount: records.length,
            warning: 'Tiene registros - NO ELIMINAR',
            note: 'Marcada como vacía pero contiene datos'
          });
        }
      } catch (error) {
        results.analyzed.push({
          entity: entityName,
          type: 'empty',
          status: 'cannot_verify',
          error: error.message,
          action: 'Verificar manualmente'
        });
      }
    }

    results.summary = {
      obsoleteEntities: obsoleteEntities.length,
      emptyEntities: results.analyzed.filter(a => a.type === 'empty' && a.status === 'safe_to_delete').length,
      warnings: results.warnings.length,
      totalCandidatesForDeletion: results.analyzed.filter(a => a.status === 'ready_for_deletion' || a.status === 'safe_to_delete').length,
      note: 'IMPORTANTE: Eliminar manualmente desde Base44 Dashboard después de verificación final'
    };

    results.deletionSteps = [
      '1. Verificar que el periodo de prueba (2 semanas) ha sido completado exitosamente',
      '2. Confirmar que todas las pruebas de sistema han pasado',
      '3. Hacer backup final antes de eliminar',
      '4. Eliminar entidades _OLD_* primero',
      '5. Eliminar entidades vacías verificadas',
      '6. Actualizar documentación del sistema',
      '7. Notificar a usuarios sobre cambios finalizados'
    ];

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});