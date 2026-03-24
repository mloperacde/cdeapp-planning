import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONSOLIDACIÓN AUTOMÁTICA - Ejecuta proceso completo sin intervención
 * Puede ser llamado por scheduled task o manualmente
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log('🤖 CONSOLIDACIÓN AUTOMÁTICA INICIADA', new Date().toISOString());
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    // Verificar permisos (solo admin o servicio)
    if (user && user.role !== 'admin') {
      return Response.json({ 
        success: false, 
        error: 'Solo administradores pueden ejecutar consolidación' 
      }, { status: 403 });
    }

    const report = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: 0,
      consolidation: null,
      references: null,
      errors: []
    };

    // PASO 1: Consolidar Employee → EmployeeMasterDatabase
    console.log('📊 PASO 1: Consolidación de datos...');
    try {
      const masterEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list('nombre', 1000);
      const legacyEmployees = await base44.asServiceRole.entities.Employee.list('nombre', 1000);

      console.log(`Found: ${masterEmployees.length} master, ${legacyEmployees.length} legacy`);

      const masterByCode = new Map();
      masterEmployees.forEach(emp => {
        if (emp.codigo_empleado) masterByCode.set(emp.codigo_empleado, emp);
      });

      const consolidationResult = {
        employeesProcessed: 0,
        employeesMigrated: 0,
        employeesSkipped: 0,
        mappings: [],
        errors: []
      };

      for (const legacyEmp of legacyEmployees) {
        consolidationResult.employeesProcessed++;
        
        try {
          const masterRecord = legacyEmp.codigo_empleado ? 
            masterByCode.get(legacyEmp.codigo_empleado) : null;

          if (masterRecord) {
            consolidationResult.employeesSkipped++;
            consolidationResult.mappings.push({
              oldId: legacyEmp.id,
              newId: masterRecord.id,
              codigo_empleado: legacyEmp.codigo_empleado,
              action: 'skipped'
            });
          } else {
            const newRecord = await base44.asServiceRole.entities.EmployeeMasterDatabase.create({
              ...legacyEmp,
              id: undefined,
              created_date: undefined,
              updated_date: undefined,
              migrated_from_legacy: true,
              legacy_id: legacyEmp.id
            });

            consolidationResult.employeesMigrated++;
            consolidationResult.mappings.push({
              oldId: legacyEmp.id,
              newId: newRecord.id,
              codigo_empleado: legacyEmp.codigo_empleado,
              action: 'migrated'
            });

            if (newRecord.codigo_empleado) {
              masterByCode.set(newRecord.codigo_empleado, newRecord);
            }
          }
        } catch (error) {
          consolidationResult.errors.push({
            employee: legacyEmp.codigo_empleado || legacyEmp.nombre,
            error: error.message
          });
        }
      }

      report.consolidation = consolidationResult;
      console.log(`✅ PASO 1 COMPLETADO: ${consolidationResult.employeesMigrated} migrados, ${consolidationResult.employeesSkipped} saltados`);

      // PASO 2: Actualizar referencias solo si hay mappings
      if (consolidationResult.mappings.length > 0) {
        console.log('📊 PASO 2: Actualizando referencias...');
        
        const idMap = new Map();
        consolidationResult.mappings.forEach(m => {
          if (m.oldId && m.newId) idMap.set(m.oldId, m.newId);
        });

        const referencesResult = {
          entities: {},
          totalUpdated: 0,
          errors: []
        };

        const entitiesToUpdate = [
          { name: 'Absence', field: 'employee_id' },
          { name: 'ShiftAssignment', field: 'employee_id' },
          { name: 'LockerAssignment', field: 'employee_id' },
          { name: 'AttendanceRecord', field: 'employee_id' },
          { name: 'EmployeeSkill', field: 'employee_id' },
          { name: 'EmployeeTraining', field: 'employee_id' },
          { name: 'EmployeeDocument', field: 'employee_id' },
          { name: 'PerformanceReview', field: 'employee_id' },
          { name: 'EmployeeIncentiveResult', field: 'employee_id' }
        ];

        for (const entity of entitiesToUpdate) {
          try {
            const records = await base44.asServiceRole.entities[entity.name].list('-created_date', 1000);
            let updated = 0;

            for (const record of records) {
              const oldId = record[entity.field];
              
              if (oldId && idMap.has(oldId)) {
                try {
                  await base44.asServiceRole.entities[entity.name].update(record.id, {
                    [entity.field]: idMap.get(oldId)
                  });
                  updated++;
                } catch (err) {
                  referencesResult.errors.push({ 
                    entity: entity.name, 
                    recordId: record.id, 
                    error: err.message 
                  });
                }
              }
            }

            referencesResult.entities[entity.name] = {
              total: records.length,
              updated,
              errors: referencesResult.errors.filter(e => e.entity === entity.name).length
            };
            referencesResult.totalUpdated += updated;
          } catch (error) {
            referencesResult.entities[entity.name] = { error: error.message };
          }
        }

        report.references = referencesResult;
        console.log(`✅ PASO 2 COMPLETADO: ${referencesResult.totalUpdated} referencias actualizadas`);
      } else {
        console.log('⏭️  PASO 2 OMITIDO: No hay mappings que actualizar');
        report.references = { totalUpdated: 0, message: 'No mappings to update' };
      }

    } catch (error) {
      report.errors.push(error.message);
      report.success = false;
      console.error('❌ ERROR EN CONSOLIDACIÓN:', error);
    }

    report.duration = Date.now() - startTime;
    report.success = report.errors.length === 0;

    console.log(`🏁 CONSOLIDACIÓN FINALIZADA en ${report.duration}ms - Éxito: ${report.success}`);

    return Response.json(report);
  } catch (error) {
    console.error('💥 ERROR CRÍTICO:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
});