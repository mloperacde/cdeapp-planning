import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener empleados activos
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter({
      estado_empleado: 'Alta'
    });

    // Obtener bandas de antigüedad
    const seniorityBands = await base44.asServiceRole.entities.SeniorityBand.filter({
      is_active: true
    });

    // Ordenar bandas por años mínimos
    seniorityBands.sort((a, b) => a.min_years - b.min_years);

    const results = {
      processed: 0,
      updated: 0,
      errors: [],
      details: []
    };

    const today = new Date();

    for (const employee of employees) {
      try {
        if (!employee.fecha_alta) {
          results.errors.push({
            employee: employee.nombre,
            error: 'No tiene fecha de alta'
          });
          continue;
        }

        // Calcular años de antigüedad
        const hireDate = new Date(employee.fecha_alta);
        const yearsOfService = (today - hireDate) / (1000 * 60 * 60 * 24 * 365.25);

        // Encontrar la banda de antigüedad correspondiente
        let applicableBand = null;
        for (const band of seniorityBands) {
          if (yearsOfService >= band.min_years) {
            if (!band.max_years || yearsOfService <= band.max_years) {
              applicableBand = band;
              break;
            }
          }
        }

        if (!applicableBand) {
          results.details.push({
            employee: employee.nombre,
            years: yearsOfService.toFixed(2),
            band: 'Ninguna banda aplicable',
            action: 'Sin cambios'
          });
          results.processed++;
          continue;
        }

        // Verificar si ya tiene los beneficios de esta banda
        const existingSalaries = await base44.asServiceRole.entities.EmployeeSalary.filter({
          employee_id: employee.id,
          is_current: true
        });

        let needsUpdate = false;

        // Aplicar beneficios de la banda
        for (const benefit of (applicableBand.benefits || [])) {
          if (benefit.benefit_type === 'Plus Antigüedad' && applicableBand.salary_component_id) {
            // Verificar si ya tiene el componente
            const hasComponent = existingSalaries.some(
              s => s.component_id === applicableBand.salary_component_id
            );

            if (!hasComponent) {
              // Crear el nuevo componente salarial
              await base44.asServiceRole.entities.EmployeeSalary.create({
                employee_id: employee.id,
                employee_name: employee.nombre,
                employee_code: employee.codigo_empleado,
                component_id: applicableBand.salary_component_id,
                component_name: `Plus Antigüedad - ${applicableBand.name}`,
                component_code: `ANTIG-${applicableBand.code}`,
                amount: benefit.value || 0,
                start_date: today.toISOString().split('T')[0],
                is_current: true,
                notes: `Aplicado automáticamente por banda de antigüedad: ${applicableBand.name} (${yearsOfService.toFixed(1)} años)`
              });

              // Registrar en auditoría
              await base44.asServiceRole.entities.SalaryAuditLog.create({
                entity_type: 'EmployeeSalary',
                entity_id: employee.id,
                action: 'create',
                employee_id: employee.id,
                employee_name: employee.nombre,
                new_value: `Plus Antigüedad: ${benefit.value}€`,
                change_amount: benefit.value,
                change_reason: `Aplicación automática de beneficio por antigüedad: ${applicableBand.name}`,
                changed_by: user.id,
                changed_by_name: user.full_name || 'Sistema Automático',
                change_date: new Date().toISOString()
              });

              needsUpdate = true;
            }
          }

          // Días de vacaciones extra (se podría implementar en VacationPendingBalance)
          if (benefit.benefit_type === 'Días Vacaciones Extra') {
            // Implementación pendiente según configuración de vacaciones
          }
        }

        results.details.push({
          employee: employee.nombre,
          years: yearsOfService.toFixed(2),
          band: applicableBand.name,
          action: needsUpdate ? 'Beneficios aplicados' : 'Ya tiene los beneficios'
        });

        if (needsUpdate) {
          results.updated++;
        }
        results.processed++;

      } catch (error) {
        results.errors.push({
          employee: employee.nombre,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      results,
      message: `Procesados ${results.processed} empleados, ${results.updated} actualizados`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});