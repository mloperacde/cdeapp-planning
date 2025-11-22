import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener todos los empleados del maestro con datos de taquilla
    const masterEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();
    
    // Aceptar todos los nombres de vestuario, incluso con variaciones
    const employeesWithLockers = masterEmployees.filter(emp => {
      const hasVestuario = emp.taquilla_vestuario && emp.taquilla_vestuario.trim() !== '';
      const hasNumero = emp.taquilla_numero && emp.taquilla_numero.toString().trim() !== '';
      const hasEmployeeId = emp.employee_id && emp.employee_id.trim() !== '';
      return hasVestuario && hasNumero && hasEmployeeId;
    });

    // Obtener asignaciones existentes
    const existingAssignments = await base44.asServiceRole.entities.LockerAssignment.list();
    const existingMap = new Map(existingAssignments.map(a => [a.employee_id, a]));

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const emp of employeesWithLockers) {
      const existing = existingMap.get(emp.employee_id);
      
      // Limpiar el número de taquilla de comillas y espacios
      const cleanTaquillaNumero = emp.taquilla_numero.toString().replace(/['"]/g, '').trim();
      
      const assignmentData = {
        employee_id: emp.employee_id,
        requiere_taquilla: true,
        vestuario: emp.taquilla_vestuario.trim(),
        numero_taquilla_actual: cleanTaquillaNumero,
        fecha_asignacion: emp.fecha_alta || new Date().toISOString(),
        notas: 'Sincronizado desde Base de Datos Maestra'
      };

      try {
        if (existing) {
          // Actualizar solo si hay cambios
          const existingClean = (existing.numero_taquilla_actual || '').replace(/['"]/g, '').trim();
          if (existing.vestuario !== emp.taquilla_vestuario.trim() || existingClean !== cleanTaquillaNumero) {
            await base44.asServiceRole.entities.LockerAssignment.update(existing.id, assignmentData);
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Crear nueva asignación
          await base44.asServiceRole.entities.LockerAssignment.create(assignmentData);
          created++;
        }
      } catch (error) {
        console.error(`Error syncing locker for employee ${emp.employee_id}:`, error);
        // Continue with next employee
        continue;
      }

      // Delay para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return Response.json({
      success: true,
      created,
      updated,
      skipped,
      total: employeesWithLockers.length
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});