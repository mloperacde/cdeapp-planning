import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Fetch all departments and employees
  const [departments, employees] = await Promise.all([
    base44.asServiceRole.entities.Department.list(undefined, 200),
    base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 2000),
  ]);

  // Build lookup map: normalized department name → department record
  const deptMap = {};
  for (const dept of departments) {
    const key = (dept.name || '').trim().toUpperCase();
    if (key) deptMap[key] = dept;
  }

  let updated = 0;
  let skipped = 0;
  let notFound = [];

  for (const emp of employees) {
    const deptName = (emp.departamento || '').trim().toUpperCase();

    // Skip if already has correct department_id
    if (emp.department_id) {
      const dept = departments.find(d => d.id === emp.department_id);
      if (dept) {
        skipped++;
        continue;
      }
    }

    if (!deptName) {
      skipped++;
      continue;
    }

    const matchedDept = deptMap[deptName];
    if (!matchedDept) {
      notFound.push({ empleado: emp.nombre, departamento: deptName });
      continue;
    }

    await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
      department_id: matchedDept.id,
      departamento: matchedDept.name // normalize to official name
    });
    updated++;
  }

  return Response.json({
    success: true,
    total: employees.length,
    updated,
    skipped,
    not_found: notFound,
    message: `Migración completada: ${updated} empleados actualizados, ${skipped} sin cambios, ${notFound.length} sin departamento coincidente.`
  });
});