import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ACTUALIZA REFERENCIAS employee_id EN TODAS LAS ENTIDADES RELACIONADAS
 * Mapea de Employee.id → EmployeeMasterDatabase.id
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const { mappings } = await req.json();
    
    if (!mappings || !Array.isArray(mappings)) {
      return Response.json({ error: 'Se requiere array de mappings: [{ oldId, newId }]' }, { status: 400 });
    }

    // Crear mapa de oldId → newId
    const idMap = new Map();
    mappings.forEach(m => {
      if (m.oldId && m.newId) {
        idMap.set(m.oldId, m.newId);
      }
    });

    console.log(`Mapeando ${idMap.size} IDs`);

    const results = {
      success: true,
      entities: {},
      totalUpdated: 0,
      errors: []
    };

    // Entidades a actualizar
    const entitiesToUpdate = [
      { name: 'Absence', field: 'employee_id' },
      { name: 'ShiftAssignment', field: 'employee_id' },
      { name: 'LockerAssignment', field: 'employee_id' },
      { name: 'AttendanceRecord', field: 'employee_id' },
      { name: 'EmployeeSkill', field: 'employee_id' },
      { name: 'EmployeeTraining', field: 'employee_id' },
      { name: 'EmployeeOnboarding', field: 'employee_id' },
      { name: 'EmployeeDocument', field: 'employee_id' },
      { name: 'PerformanceReview', field: 'employee_id' },
      { name: 'PerformanceImprovementPlan', field: 'employee_id' },
      { name: 'EmployeeIncentiveResult', field: 'employee_id' },
      { name: 'EmployeeAuditLog', field: 'target_employee_id' },
      { name: 'EmployeeSyncHistory', field: 'employee_id' }
    ];

    for (const entity of entitiesToUpdate) {
      try {
        const records = await base44.asServiceRole.entities[entity.name].list('-created_date', 1000);
        let updated = 0;
        const errors = [];

        for (const record of records) {
          const oldId = record[entity.field];
          
          if (oldId && idMap.has(oldId)) {
            const newId = idMap.get(oldId);
            
            try {
              await base44.asServiceRole.entities[entity.name].update(record.id, {
                [entity.field]: newId
              });
              updated++;
            } catch (err) {
              errors.push({ recordId: record.id, error: err.message });
            }
          }
        }

        results.entities[entity.name] = {
          total: records.length,
          updated,
          errors: errors.length
        };
        
        results.totalUpdated += updated;
        
        if (errors.length > 0) {
          results.errors.push(...errors.map(e => ({ entity: entity.name, ...e })));
        }
        
        console.log(`${entity.name}: ${updated}/${records.length} actualizados`);
      } catch (error) {
        results.entities[entity.name] = {
          error: error.message
        };
        results.errors.push({ entity: entity.name, error: error.message });
      }
    }

    results.success = results.errors.length === 0;

    return Response.json(results);
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});