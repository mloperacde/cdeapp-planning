import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Recalcula y aplica beneficios de antigüedad - versión optimizada con bulk loading.
 * Carga todos los salarios y logs de auditoría en memoria para evitar rate limiting.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cargar todo en paralelo (bulk loading para evitar rate limiting)
    const [employees, seniorityBands, allSalaries] = await Promise.all([
      base44.asServiceRole.entities.EmployeeMasterDatabase.filter({ estado_empleado: 'Alta' }, '-created_date', 500),
      base44.asServiceRole.entities.SeniorityBand.filter({ is_active: true }, 'min_years', 100),
      base44.asServiceRole.entities.EmployeeSalary.filter({ is_current: true }, '-created_date', 2000)
    ]);

    // Ordenar bandas por años mínimos
    seniorityBands.sort((a, b) => a.min_years - b.min_years);

    // Indexar salarios por employee_id para O(1) lookup
    const salariesByEmployee = new Map();
    for (const salary of allSalaries) {
      if (!salariesByEmployee.has(salary.employee_id)) {
        salariesByEmployee.set(salary.employee_id, []);
      }
      salariesByEmployee.get(salary.employee_id).push(salary);
    }

    const results = {
      processed: 0,
      updated: 0,
      errors: [],
      details: []
    };

    const today = new Date();
    const toCreate = [];
    const toAudit = [];

    for (const employee of employees) {
      try {
        if (!employee.fecha_alta) {
          results.errors.push({ employee: employee.nombre, error: 'No tiene fecha de alta' });
          continue;
        }

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

        const existingSalaries = salariesByEmployee.get(employee.id) || [];
        let needsUpdate = false;

        for (const benefit of (applicableBand.benefits || [])) {
          if (benefit.benefit_type === 'Plus Antigüedad' && applicableBand.salary_component_id) {
            const hasComponent = existingSalaries.some(
              s => s.component_id === applicableBand.salary_component_id
            );

            if (!hasComponent) {
              toCreate.push({
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

              toAudit.push({
                entity_type: 'EmployeeSalary',
                entity_id: employee.id,
                action: 'create',
                employee_id: employee.id,
                employee_name: employee.nombre,
                new_value: `Plus Antigüedad: ${benefit.value}€`,
                change_amount: benefit.value,
                change_reason: `Aplicación automática de beneficio por antigüedad: ${applicableBand.name}`,
                changed_by: 'sistema',
                changed_by_name: 'Sistema Automático',
                change_date: new Date().toISOString()
              });

              needsUpdate = true;
            }
          }
        }

        results.details.push({
          employee: employee.nombre,
          years: yearsOfService.toFixed(2),
          band: applicableBand.name,
          action: needsUpdate ? 'Beneficios aplicados' : 'Ya tiene los beneficios'
        });

        if (needsUpdate) results.updated++;
        results.processed++;

      } catch (error) {
        results.errors.push({ employee: employee.nombre, error: error.message });
      }
    }

    // Bulk create en lotes de 50 para evitar rate limiting
    const BATCH_SIZE = 50;
    if (toCreate.length > 0) {
      for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
        const batch = toCreate.slice(i, i + BATCH_SIZE);
        await base44.asServiceRole.entities.EmployeeSalary.bulkCreate(batch);
        if (i + BATCH_SIZE < toCreate.length) {
          await new Promise(r => setTimeout(r, 500)); // pequeña pausa entre lotes
        }
      }
    }

    if (toAudit.length > 0) {
      for (let i = 0; i < toAudit.length; i += BATCH_SIZE) {
        const batch = toAudit.slice(i, i + BATCH_SIZE);
        await base44.asServiceRole.entities.SalaryAuditLog.bulkCreate(batch);
        if (i + BATCH_SIZE < toAudit.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    console.log(`[calculateSeniorityBenefits] Procesados: ${results.processed}, Actualizados: ${results.updated}, Errores: ${results.errors.length}`);

    return Response.json({
      success: true,
      results,
      message: `Procesados ${results.processed} empleados, ${results.updated} actualizados`
    });

  } catch (error) {
    console.error('[calculateSeniorityBenefits] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});