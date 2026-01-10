import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const entityNames = [
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

    const backup = {
      timestamp: new Date().toISOString(),
      generatedBy: user.email,
      entities: {}
    };

    for (const entityName of entityNames) {
      try {
        const records = await base44.asServiceRole.entities[entityName].list();
        backup.entities[entityName] = {
          count: records.length,
          data: records
        };
      } catch (error) {
        backup.entities[entityName] = {
          count: 0,
          error: error.message
        };
      }
    }

    return Response.json({
      success: true,
      backup,
      summary: {
        totalEntities: entityNames.length,
        entitiesWithData: Object.values(backup.entities).filter(e => e.count > 0).length,
        totalRecords: Object.values(backup.entities).reduce((sum, e) => sum + (e.count || 0), 0)
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});