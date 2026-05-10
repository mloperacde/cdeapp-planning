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

    // Helper para eliminar registros con lotes
    const deleteInBatches = async (entity, batchSize = 50) => {
      let totalDeleted = 0;
      
      for (let batch = 0; batch < 5; batch++) {
        try {
          const records = await base44.asServiceRole.entities[entity].list(undefined, batchSize);
          if (records.length === 0) break;
          
          const deletePromises = records.map(r => 
            base44.asServiceRole.entities[entity].delete(r.id)
              .catch(() => null) // Ignorar errores de eliminación
          );
          
          await Promise.allSettled(deletePromises);
          totalDeleted += records.length;
          
          // Espera antes de siguiente batch
          if (batch < 4) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          // Si es rate limit, esperar y continuar
          if (err.message?.includes('Rate limit')) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            batch--;
          }
          break;
        }
      }
      
      return totalDeleted;
    };

    // Eliminar datos históricos por lotes
    deletionStats.absences = await deleteInBatches('Absence');
    deletionStats.attendanceRecords = await deleteInBatches('AttendanceRecord');
    deletionStats.breakRecords = await deleteInBatches('BreakRecord');
    deletionStats.absenceAuditLogs = await deleteInBatches('AbsenceAuditLog');

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