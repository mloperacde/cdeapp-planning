import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;

    const [employees, departments, positions] = await Promise.all([
      base44.asServiceRole.entities.EmployeeMasterDatabase.list(),
      base44.asServiceRole.entities.Department.list(),
      base44.asServiceRole.entities.Position.list(),
    ]);

    const normalize = (s) => (s || '').toString().trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

    // Maps: normalized name -> canonical object
    const normToDept = {};
    departments.forEach(d => { normToDept[normalize(d.name)] = d; });

    const normToPos = {};
    positions.forEach(p => { normToPos[normalize(p.name)] = p; });

    // Also map by dept_id -> dept
    const deptById = {};
    departments.forEach(d => { deptById[d.id] = d; });

    const fixes = [];
    const issues = [];

    for (const emp of employees) {
      const update = {};
      const empIssues = [];

      // --- DEPARTMENT ---
      const currentDept = emp.departamento || '';
      const normDept = normalize(currentDept);

      // Detect duplicated string (e.g. "PRODUCCIÓNPRODUCCIÓN")
      let resolvedDept = null;
      const half = Math.floor(normDept.length / 2);
      if (half > 3 && normDept.slice(0, half) === normDept.slice(half)) {
        resolvedDept = normToDept[normDept.slice(0, half)];
        if (resolvedDept) empIssues.push('dept_duplicated');
      }

      // If not resolved by duplication, find by normalized name
      if (!resolvedDept) {
        resolvedDept = normToDept[normDept];
      }

      // If still not resolved, try via department_id
      if (!resolvedDept && emp.department_id) {
        resolvedDept = deptById[emp.department_id];
        if (resolvedDept) empIssues.push('dept_resolved_via_id');
      }

      if (resolvedDept) {
        // Fix department name if different
        if (emp.departamento !== resolvedDept.name) {
          update.departamento = resolvedDept.name;
          empIssues.push(`dept_name: "${emp.departamento}" → "${resolvedDept.name}"`);
        }
        // Fix department_id if missing or wrong
        if (emp.department_id !== resolvedDept.id) {
          update.department_id = resolvedDept.id;
          empIssues.push(`dept_id: "${emp.department_id}" → "${resolvedDept.id}"`);
        }
      }

      // --- POSITION ---
      const currentPuesto = emp.puesto || '';
      const normPuesto = normalize(currentPuesto);
      const resolvedPos = normToPos[normPuesto];

      if (resolvedPos) {
        // Fix position name if different (case/accent)
        if (emp.puesto !== resolvedPos.name) {
          update.puesto = resolvedPos.name;
          empIssues.push(`puesto: "${emp.puesto}" → "${resolvedPos.name}"`);
        }
        // If department resolved from position doesn't match, skip – let dept logic handle it
      } else if (currentPuesto) {
        // Position not found in catalog - just report it
        empIssues.push(`puesto_not_in_catalog: "${currentPuesto}"`);
      }

      if (Object.keys(update).length > 0) {
        issues.push({ id: emp.id, nombre: emp.nombre, changes: empIssues });
        if (!dryRun) {
          await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, update);
          fixes.push({ id: emp.id, nombre: emp.nombre, update });
        }
      }
    }

    // Summary: unique puesto values not in catalog
    const puestoNotInCatalog = {};
    const deptNotResolved = {};
    employees.forEach(e => {
      const np = normalize(e.puesto || '');
      if (e.puesto && !normToPos[np]) {
        puestoNotInCatalog[e.puesto] = (puestoNotInCatalog[e.puesto] || 0) + 1;
      }
      const nd = normalize(e.departamento || '');
      if (e.departamento && !normToDept[nd]) {
        deptNotResolved[e.departamento] = (deptNotResolved[e.departamento] || 0) + 1;
      }
    });

    return Response.json({
      dry_run: dryRun,
      total_employees: employees.length,
      issues_found: issues.length,
      fixes_applied: dryRun ? 0 : fixes.length,
      issues: dryRun ? issues : fixes,
      puestos_not_in_catalog: puestoNotInCatalog,
      depts_not_resolved: deptNotResolved,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});