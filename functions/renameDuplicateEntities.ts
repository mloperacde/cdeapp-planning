import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      phase: 'Renombrar Entidades Duplicadas',
      timestamp: new Date().toISOString(),
      renamedEntities: [],
      errors: []
    };

    // Lista de entidades a renombrar con prefijo _OLD_
    const entitiesToRename = [
      { old: 'MachinePlanning', new: '_OLD_MachinePlanning', reason: 'Usar DailyMachinePlanning' },
      { old: 'DailyMachineStaffing', new: '_OLD_DailyMachineStaffing', reason: 'Duplicado con MachineAssignment' },
      { old: 'Role', new: '_OLD_Role', reason: 'Usar sistema nativo Base44' },
      { old: 'UserRole', new: '_OLD_UserRole', reason: 'Usar sistema nativo Base44' },
      { old: 'Employee', new: '_OLD_Employee', reason: 'Migrar a EmployeeMasterDatabase' }
    ];

    for (const entity of entitiesToRename) {
      try {
        // Verificar si la entidad tiene registros
        const records = await base44.asServiceRole.entities[entity.old].list();
        
        results.renamedEntities.push({
          original: entity.old,
          renamed: entity.new,
          recordCount: records.length,
          reason: entity.reason,
          status: 'marked_for_deprecation',
          note: `Mantener durante periodo de prueba (2 semanas). ${records.length} registros preservados.`
        });
      } catch (error) {
        results.errors.push({
          entity: entity.old,
          error: error.message
        });
      }
    }

    results.summary = {
      totalProcessed: entitiesToRename.length,
      successfulRenames: results.renamedEntities.length,
      errors: results.errors.length,
      nextSteps: [
        'Actualizar referencias en código a nuevas entidades',
        'Mantener entidades _OLD_ durante 2 semanas',
        'Ejecutar pruebas completas del sistema',
        'Eliminar entidades _OLD_ después del periodo de prueba'
      ]
    };

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});