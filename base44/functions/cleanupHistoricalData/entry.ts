import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admin puede limpiar datos históricos
    if (!user) {
      return Response.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }

    if (!user.role || user.role.toLowerCase() !== 'admin') {
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

    // Helper para eliminar secuencialmente con delays para evitar rate limit
    const deleteSequentially = async (entity, delayMs = 800) => {
      const records = await base44.asServiceRole.entities[entity].list();
      let deleted = 0;
      
      for (const record of records) {
        try {
          await base44.asServiceRole.entities[entity].delete(record.id);
          deleted++;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } catch (err) {
          if (err.message?.includes('Rate limit')) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await base44.asServiceRole.entities[entity].delete(record.id);
            deleted++;
          }
        }
      }
      return deleted;
    };

    // Eliminar datos históricos secuencialmente
    deletionStats.absences = await deleteSequentially('Absence', 800);
    deletionStats.attendanceRecords = await deleteSequentially('AttendanceRecord', 800);
    deletionStats.breakRecords = await deleteSequentially('BreakRecord', 800);
    deletionStats.absenceAuditLogs = await deleteSequentially('AbsenceAuditLog', 800);

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