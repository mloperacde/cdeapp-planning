import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const offset = body.offset || 0;
  const batchSize = 50;

  // Fetch departments once
  const departments = await base44.asServiceRole.entities.Department.list(undefined, 200);
  const deptMap = {};
  for (const dept of departments) {
    const key = (dept.name || '').trim().toUpperCase();
    if (key) deptMap[key] = dept;
  }

  // Fetch a batch of employees without department_id
  const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, batchSize, offset);

  let updated = 0;
  let skipped = 0;
  const notFound = [];

  for (const emp of employees) {
    if (emp.department_id) { skipped++; continue; }

    const deptName = (emp.departamento || '').trim().toUpperCase();
    if (!deptName) { skipped++; continue; }

    const matchedDept = deptMap[deptName];
    if (!matchedDept) {
      notFound.push({ empleado: emp.nombre, departamento: deptName });
      continue;
    }

    await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
      department_id: matchedDept.id,
      departamento: matchedDept.name
    });
    updated++;
  }

  return Response.json({
    success: true,
    batch: { offset, size: employees.length },
    updated,
    skipped,
    not_found: notFound,
    has_more: employees.length === batchSize,
    message: `Lote procesado (offset ${offset}): ${updated} actualizados, ${skipped} sin cambios, ${notFound.length} sin coincidencia.`
  });
});