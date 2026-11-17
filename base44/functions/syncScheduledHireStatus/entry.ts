import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const UPCOMING_STATUS = 'Alta Prevista';

const toDateOnly = (value) => {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
};

const todayInMadrid = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'Admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = todayInMadrid();

    // Carga paginada de toda la base maestra
    const employees = [];
    let cursor;
    for (let i = 0; i < 40; i++) {
      const page = await base44.asServiceRole.entities.EmployeeMasterDatabase.list({
        sort: 'nombre',
        limit: 200,
        ...(cursor ? { cursor } : {}),
      });
      const items = Array.isArray(page) ? page : page?.items || [];
      employees.push(...items);
      if (Array.isArray(page) || !page?.has_more || !page?.next_cursor) break;
      cursor = page.next_cursor;
    }

    const updates = [];
    const promoted = [];
    const scheduled = [];

    for (const emp of employees) {
      const current = emp.estado_empleado || 'Alta';
      if (current !== 'Alta' && current !== UPCOMING_STATUS) continue;

      const hireDate = toDateOnly(emp.fecha_alta);
      const desired = hireDate && hireDate > today ? UPCOMING_STATUS : 'Alta';
      if (desired === current) continue;

      updates.push({ id: emp.id, estado_empleado: desired });
      const label = `${emp.nombre || emp.codigo_empleado || emp.id} (${hireDate || 'sin fecha'})`;
      if (desired === UPCOMING_STATUS) scheduled.push(label);
      else promoted.push(label);
    }

    for (let i = 0; i < updates.length; i += 200) {
      await base44.asServiceRole.entities.EmployeeMasterDatabase.bulkUpdate(updates.slice(i, i + 200));
    }

    return Response.json({
      success: true,
      fecha_referencia: today,
      revisados: employees.length,
      actualizados: updates.length,
      pasan_a_alta: promoted,
      pasan_a_alta_prevista: scheduled,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}