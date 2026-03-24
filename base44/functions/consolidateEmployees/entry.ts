import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONSOLIDACIÓN DE EMPLOYEE → EMPLOYEEMASTERDATABASE
 * Migra todos los registros de Employee a EmployeeMasterDatabase sin duplicar
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Solo administradores pueden consolidar datos' }, { status: 403 });
    }

    const results = {
      success: true,
      employeesProcessed: 0,
      employeesMigrated: 0,
      employeesSkipped: 0,
      errors: [],
      mappings: [] // { oldId, newId, codigo_empleado }
    };

    // 1. Obtener todos los registros
    const masterEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list('nombre', 1000);
    const legacyEmployees = await base44.asServiceRole.entities.Employee.list('nombre', 1000);

    console.log(`Master: ${masterEmployees.length}, Legacy: ${legacyEmployees.length}`);

    // Crear índice por codigo_empleado en master
    const masterByCode = new Map();
    masterEmployees.forEach(emp => {
      if (emp.codigo_empleado) {
        masterByCode.set(emp.codigo_empleado, emp);
      }
    });

    // 2. Procesar cada empleado legacy
    for (const legacyEmp of legacyEmployees) {
      results.employeesProcessed++;
      
      try {
        // Buscar si ya existe en master por codigo_empleado
        let masterRecord = null;
        if (legacyEmp.codigo_empleado) {
          masterRecord = masterByCode.get(legacyEmp.codigo_empleado);
        }

        if (masterRecord) {
          // Ya existe - guardar mapeo para actualizar referencias
          results.employeesSkipped++;
          results.mappings.push({
            oldId: legacyEmp.id,
            newId: masterRecord.id,
            codigo_empleado: legacyEmp.codigo_empleado,
            action: 'skipped'
          });
        } else {
          // No existe - migrar a master
          const newRecord = await base44.asServiceRole.entities.EmployeeMasterDatabase.create({
            ...legacyEmp,
            nombre: legacyEmp.nombre?.toUpperCase(),
            departamento: legacyEmp.departamento?.toUpperCase(),
            puesto: legacyEmp.puesto?.toUpperCase(),
            id: undefined, // Generar nuevo ID
            created_date: undefined,
            updated_date: undefined,
            migrated_from_legacy: true,
            legacy_id: legacyEmp.id
          });

          results.employeesMigrated++;
          results.mappings.push({
            oldId: legacyEmp.id,
            newId: newRecord.id,
            codigo_empleado: legacyEmp.codigo_empleado,
            action: 'migrated'
          });
          
          // Actualizar índice
          if (newRecord.codigo_empleado) {
            masterByCode.set(newRecord.codigo_empleado, newRecord);
          }
        }
      } catch (error) {
        results.errors.push({
          employee: legacyEmp.codigo_empleado || legacyEmp.nombre,
          error: error.message
        });
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