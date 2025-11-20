import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      employees: 0,
      lockerAssignments: 0,
      absences: 0,
      machineAssignments: 0,
      shiftAssignments: 0,
      employeeSkills: 0,
      syncHistory: 0,
      errors: []
    };

    // Eliminar todos los empleados del sistema operativo
    try {
      const employees = await base44.asServiceRole.entities.Employee.list();
      for (const emp of employees) {
        await base44.asServiceRole.entities.Employee.delete(emp.id);
        results.employees++;
      }
    } catch (error) {
      results.errors.push({ entity: 'Employee', error: error.message });
    }

    // Eliminar asignaciones de taquillas
    try {
      const lockers = await base44.asServiceRole.entities.LockerAssignment.list();
      for (const locker of lockers) {
        await base44.asServiceRole.entities.LockerAssignment.delete(locker.id);
        results.lockerAssignments++;
      }
    } catch (error) {
      results.errors.push({ entity: 'LockerAssignment', error: error.message });
    }

    // Eliminar ausencias
    try {
      const absences = await base44.asServiceRole.entities.Absence.list();
      for (const absence of absences) {
        await base44.asServiceRole.entities.Absence.delete(absence.id);
        results.absences++;
      }
    } catch (error) {
      results.errors.push({ entity: 'Absence', error: error.message });
    }

    // Eliminar asignaciones de máquinas
    try {
      const machineAssignments = await base44.asServiceRole.entities.MachineAssignment.list();
      for (const assignment of machineAssignments) {
        await base44.asServiceRole.entities.MachineAssignment.delete(assignment.id);
        results.machineAssignments++;
      }
    } catch (error) {
      results.errors.push({ entity: 'MachineAssignment', error: error.message });
    }

    // Eliminar asignaciones de turnos
    try {
      const shiftAssignments = await base44.asServiceRole.entities.ShiftAssignment.list();
      for (const assignment of shiftAssignments) {
        await base44.asServiceRole.entities.ShiftAssignment.delete(assignment.id);
        results.shiftAssignments++;
      }
    } catch (error) {
      results.errors.push({ entity: 'ShiftAssignment', error: error.message });
    }

    // Eliminar habilidades de empleados
    try {
      const skills = await base44.asServiceRole.entities.EmployeeSkill.list();
      for (const skill of skills) {
        await base44.asServiceRole.entities.EmployeeSkill.delete(skill.id);
        results.employeeSkills++;
      }
    } catch (error) {
      results.errors.push({ entity: 'EmployeeSkill', error: error.message });
    }

    // Limpiar historial de sincronización
    try {
      const history = await base44.asServiceRole.entities.EmployeeSyncHistory.list();
      for (const record of history) {
        await base44.asServiceRole.entities.EmployeeSyncHistory.delete(record.id);
        results.syncHistory++;
      }
    } catch (error) {
      results.errors.push({ entity: 'EmployeeSyncHistory', error: error.message });
    }

    // Resetear estado de sincronización en la base de datos maestra
    try {
      const masterEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();
      for (const emp of masterEmployees) {
        await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
          employee_id: null,
          estado_sincronizacion: 'Pendiente',
          ultimo_sincronizado: null
        });
      }
    } catch (error) {
      results.errors.push({ entity: 'EmployeeMasterDatabase', error: error.message });
    }

    return Response.json({
      success: true,
      message: 'Datos operativos de empleados eliminados correctamente',
      results
    });

  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});