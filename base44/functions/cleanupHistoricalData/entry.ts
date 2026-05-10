import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admin puede limpiar datos históricos
    if (user?.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const deletionStats = {
      absences: 0,
      attendanceRecords: 0,
      breakRecords: 0,
      absenceAuditLogs: 0,
      timestamp: new Date().toISOString(),
    };

    // Eliminar registros de ausencias
    const absences = await base44.asServiceRole.entities.Absence.list();
    if (absences.length > 0) {
      const absenceIds = absences.map(a => a.id);
      for (const id of absenceIds) {
        await base44.asServiceRole.entities.Absence.delete(id);
      }
      deletionStats.absences = absenceIds.length;
    }

    // Eliminar registros de asistencia
    const attendanceRecords = await base44.asServiceRole.entities.AttendanceRecord.list();
    if (attendanceRecords.length > 0) {
      const recordIds = attendanceRecords.map(r => r.id);
      for (const id of recordIds) {
        await base44.asServiceRole.entities.AttendanceRecord.delete(id);
      }
      deletionStats.attendanceRecords = recordIds.length;
    }

    // Eliminar registros de descansos
    const breakRecords = await base44.asServiceRole.entities.BreakRecord.list();
    if (breakRecords.length > 0) {
      const breakIds = breakRecords.map(b => b.id);
      for (const id of breakIds) {
        await base44.asServiceRole.entities.BreakRecord.delete(id);
      }
      deletionStats.breakRecords = breakIds.length;
    }

    // Eliminar logs de auditoría de ausencias
    const auditLogs = await base44.asServiceRole.entities.AbsenceAuditLog.list();
    if (auditLogs.length > 0) {
      const logIds = auditLogs.map(l => l.id);
      for (const id of logIds) {
        await base44.asServiceRole.entities.AbsenceAuditLog.delete(id);
      }
      deletionStats.absenceAuditLogs = logIds.length;
    }

    return Response.json({
      success: true,
      message: 'Histórico limpiado correctamente',
      deletionStats,
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});