import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Entidades candidatas a marcar como obsoletas (sin registros)
    const entitiesToCheck = [
      "Holiday", "Vacation", "Employee", "Machine", "BreakShift", "ShiftAssignment",
      "TeamConfig", "TeamWeekSchedule", "MachinePlanning", "Process", "MachineProcess",
      "Absence", "MachineAssignment", "MaintenanceSchedule", "PerformanceReview",
      "PerformanceImprovementPlan", "MaintenanceType", "ShiftHandover",
      "NotificationPreference", "EmailNotificationConfig", "MobileAbsenceRequest",
      "MaintenancePrediction", "ShiftSwapRequest", "RecurringPlanning", "MLPrediction",
      "AbsenceType", "DailyProductionPlanning", "DailyMaintenancePlanning",
      "DailyWarehousePlanning", "DailyQualityPlanning", "EmployeeDocument",
      "DashboardWidget", "LockerAssignment", "LockerRoomConfig", "EmployeeOnboarding",
      "TrainingModule", "EmployeeTraining", "AttendanceRecord", "AttendanceConfig",
      "Skill", "EmployeeSkill", "ProcessSkillRequirement", "TrainingNeed",
      "DepartmentPositionSkill", "MachinePrediction", "CommitteeMember",
      "RiskAssessment", "WorkIncident", "UnionHoursRecord", "EmergencyTeamMember",
      "PRLDocument", "AbsenceDaysBalance", "Document", "ChatChannel", "ChatMessage",
      "PushNotification", "VacationPendingBalance", "AbsenceApprovalFlow",
      "RecurringAbsencePattern", "IncentivePlan", "DepartmentIncentiveConfig",
      "EmployeeIncentiveResult", "MachineStatus", "Article", "CalendarStyleConfig",
      "EmployeeMasterDatabase", "EmployeeSyncHistory", "DashboardWidgetConfig",
      "NotificationTemplate", "SMSNotificationLog", "ProfileChangeRequest",
      "UserFilterPreference", "EmployeeAuditLog", "Department", "Position",
      "AttendanceIncident", "WorkOrder", "MachineAssignmentAudit",
      "DailyMachineStaffing", "Role", "UserRole", "QualityInspection"
    ];

    const results = {
      timestamp: new Date().toISOString(),
      checkedEntities: entitiesToCheck.length,
      obsolete: [],
      active: [],
      errors: []
    };

    for (const entityName of entitiesToCheck) {
      try {
        const records = await base44.asServiceRole.entities[entityName].list();
        
        if (records.length === 0) {
          results.obsolete.push({
            name: entityName,
            recordCount: 0,
            status: 'candidate_for_removal',
            recommendation: 'Marcar como obsoleta con prefijo _OLD_ o eliminar'
          });
        } else {
          results.active.push({
            name: entityName,
            recordCount: records.length,
            status: 'active'
          });
        }
      } catch (error) {
        results.errors.push({
          name: entityName,
          error: error.message
        });
      }
    }

    results.summary = {
      totalChecked: entitiesToCheck.length,
      obsoleteCount: results.obsolete.length,
      activeCount: results.active.length,
      errorCount: results.errors.length
    };

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});