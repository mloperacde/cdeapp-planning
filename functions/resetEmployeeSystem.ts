import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { confirm_delete } = await req.json();
    
    if (confirm_delete !== 'DELETE_ALL_EMPLOYEES') {
      return Response.json({
        error: 'Confirmación requerida. Envía confirm_delete: "DELETE_ALL_EMPLOYEES"'
      }, { status: 400 });
    }

    let deletedEmployees = 0;
    let deletedLockers = 0;
    let deletedOnboarding = 0;
    let deletedAbsences = 0;
    let deletedSkills = 0;
    let deletedVacationBalance = 0;
    let errors = [];

    try {
      // 1. ELIMINAR TODOS LOS EMPLEADOS
      const employees = await base44.asServiceRole.entities.Employee.list();
      for (const emp of employees) {
        try {
          await base44.asServiceRole.entities.Employee.delete(emp.id);
          deletedEmployees++;
        } catch (e) {
          errors.push({ entity: 'Employee', id: emp.id, error: e.message });
        }
      }

      // 2. ELIMINAR TODAS LAS ASIGNACIONES DE TAQUILLAS
      const lockerAssignments = await base44.asServiceRole.entities.LockerAssignment.list();
      for (const locker of lockerAssignments) {
        try {
          await base44.asServiceRole.entities.LockerAssignment.delete(locker.id);
          deletedLockers++;
        } catch (e) {
          errors.push({ entity: 'LockerAssignment', id: locker.id, error: e.message });
        }
      }

      // 3. ELIMINAR ONBOARDING ASOCIADOS
      const onboardings = await base44.asServiceRole.entities.EmployeeOnboarding.list();
      for (const onb of onboardings) {
        try {
          await base44.asServiceRole.entities.EmployeeOnboarding.delete(onb.id);
          deletedOnboarding++;
        } catch (e) {
          errors.push({ entity: 'EmployeeOnboarding', id: onb.id, error: e.message });
        }
      }

      // 4. ELIMINAR AUSENCIAS
      const absences = await base44.asServiceRole.entities.Absence.list();
      for (const abs of absences) {
        try {
          await base44.asServiceRole.entities.Absence.delete(abs.id);
          deletedAbsences++;
        } catch (e) {
          errors.push({ entity: 'Absence', id: abs.id, error: e.message });
        }
      }

      // 5. ELIMINAR HABILIDADES DE EMPLEADOS
      const skills = await base44.asServiceRole.entities.EmployeeSkill.list();
      for (const skill of skills) {
        try {
          await base44.asServiceRole.entities.EmployeeSkill.delete(skill.id);
          deletedSkills++;
        } catch (e) {
          errors.push({ entity: 'EmployeeSkill', id: skill.id, error: e.message });
        }
      }

      // 6. ELIMINAR BALANCES DE VACACIONES
      const vacationBalances = await base44.asServiceRole.entities.VacationPendingBalance.list();
      for (const vb of vacationBalances) {
        try {
          await base44.asServiceRole.entities.VacationPendingBalance.delete(vb.id);
          deletedVacationBalance++;
        } catch (e) {
          errors.push({ entity: 'VacationPendingBalance', id: vb.id, error: e.message });
        }
      }

      return Response.json({
        success: true,
        message: '✅ Sistema de empleados completamente limpiado',
        summary: {
          deleted_employees: deletedEmployees,
          deleted_locker_assignments: deletedLockers,
          deleted_onboarding: deletedOnboarding,
          deleted_absences: deletedAbsences,
          deleted_skills: deletedSkills,
          deleted_vacation_balances: deletedVacationBalance,
          total_deleted: deletedEmployees + deletedLockers + deletedOnboarding + deletedAbsences + deletedSkills + deletedVacationBalance,
          errors: errors.length
        },
        error_details: errors,
        next_steps: [
          '1. Sube el archivo CSV maestro a través de MasterEmployeeDatabase',
          '2. El sistema importará los datos al archivo maestro',
          '3. Sincroniza desde el maestro para crear las fichas operativas'
        ]
      });

    } catch (error) {
      return Response.json({
        success: false,
        error: error.message,
        partial_results: {
          deleted_employees: deletedEmployees,
          deleted_locker_assignments: deletedLockers,
          deleted_onboarding: deletedOnboarding,
          deleted_absences: deletedAbsences,
          deleted_skills: deletedSkills,
          deleted_vacation_balances: deletedVacationBalance
        }
      }, { status: 500 });
    }

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});