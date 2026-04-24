import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dryRun = new URL(req.url).searchParams.get('dry_run') !== 'false';

    // Load all data
    const [employees, departments] = await Promise.all([
      base44.asServiceRole.entities.EmployeeMasterDatabase.list(),
      base44.asServiceRole.entities.Department.list(),
    ]);

    // Build normalized department name → canonical name map
    const normalize = (s) => (s || '').toString().trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

    // Canonical dept names from Department entity
    const deptNames = departments.map(d => d.name);
    const normToDeptName = {};
    deptNames.forEach(name => {
      normToDeptName[normalize(name)] = name;
    });

    // Also map dept id → canonical name
    const deptIdToName = {};
    departments.forEach(d => { deptIdToName[d.id] = d.name; });

    // Find issues
    const issues = [];
    const fixes = [];

    for (const emp of employees) {
      const currentDept = emp.departamento || '';
      const normCurrent = normalize(currentDept);

      // Check for duplicated names like "PRODUCCIONPRODUCCION"
      // Pattern: string repeated (e.g. "XYZXYZ")
      let isDuplicated = false;
      let fixedName = null;

      // Check if the normalized string is a repeated substring
      const half = Math.floor(normCurrent.length / 2);
      if (half > 3 && normCurrent.slice(0, half) === normCurrent.slice(half)) {
        isDuplicated = true;
        const halfWithAccent = normToDeptName[normCurrent.slice(0, half)];
        fixedName = halfWithAccent || currentDept.slice(0, Math.floor(currentDept.length / 2));
      }

      // Also check: does the raw value contain the normalized value twice?
      // e.g. "PRODUCCIÓNPRODUCCIÓN"
      if (!isDuplicated) {
        for (const name of deptNames) {
          const normName = normalize(name);
          // If currentDept is name+name or normCurrent is normName+normName
          if (currentDept === name + name || normCurrent === normName + normName) {
            isDuplicated = true;
            fixedName = name;
            break;
          }
          // Substring doubled without space
          if (normCurrent.length > 4 && normCurrent === normName + normName) {
            isDuplicated = true;
            fixedName = name;
            break;
          }
        }
      }

      // Also fix: departamento doesn't match any known dept (case/accent issue)
      const canonicalMatch = normToDeptName[normCurrent];
      const hasWrongCase = !isDuplicated && canonicalMatch && canonicalMatch !== currentDept;

      // Fix via department_id if available and departamento is wrong
      const deptFromId = emp.department_id ? deptIdToName[emp.department_id] : null;
      const hasMismatch = deptFromId && deptFromId !== currentDept && !isDuplicated;

      if (isDuplicated || hasWrongCase || hasMismatch) {
        const targetDept = isDuplicated ? fixedName : (hasWrongCase ? canonicalMatch : deptFromId);
        issues.push({
          id: emp.id,
          nombre: emp.nombre,
          current: currentDept,
          target: targetDept,
          reason: isDuplicated ? 'duplicated_name' : hasWrongCase ? 'wrong_case_accents' : 'mismatch_with_dept_id'
        });

        if (!dryRun) {
          await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
            departamento: targetDept
          });
          fixes.push({ id: emp.id, nombre: emp.nombre, from: currentDept, to: targetDept });
        }
      }
    }

    // Also check Department names for duplicates or inconsistencies in parent_name
    const deptIssues = [];
    for (const dept of departments) {
      if (dept.parent_id && dept.parent_name) {
        const parent = departments.find(d => d.id === dept.parent_id);
        if (parent && parent.name !== dept.parent_name) {
          deptIssues.push({
            id: dept.id,
            name: dept.name,
            parent_name_stored: dept.parent_name,
            parent_name_actual: parent.name
          });
          if (!dryRun) {
            await base44.asServiceRole.entities.Department.update(dept.id, {
              parent_name: parent.name
            });
          }
        }
      }
    }

    // Summary of all unique departamento values in employees
    const deptValueCounts = {};
    employees.forEach(e => {
      const d = e.departamento || '(vacío)';
      deptValueCounts[d] = (deptValueCounts[d] || 0) + 1;
    });

    return Response.json({
      dry_run: dryRun,
      employee_issues_found: issues.length,
      employee_fixes_applied: dryRun ? 0 : fixes.length,
      issues,
      dept_parent_name_issues: deptIssues.length,
      dept_parent_name_issues_detail: deptIssues,
      all_dept_values_in_employees: deptValueCounts,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});