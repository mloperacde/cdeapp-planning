import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

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
    const today = todayInMadrid();

    // Base maestra (carga paginada)
    const employees = [];
    let cursor: string | undefined;
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

    const assignments = await base44.asServiceRole.entities.LockerAssignment.list();
    const byEmployee = new Map<string, any>(
      (assignments || []).map((a: any) => [String(a.employee_id), a])
    );

    const assignmentUpdates: any[] = [];
    const employeeUpdates: any[] = [];
    const liberadas: any[] = [];

    for (const emp of employees) {
      if (emp.estado_empleado !== 'Baja') continue;

      const bajaDate = toDateOnly(emp.fecha_baja);
      // Baja programada: la taquilla se libera el día de la baja
      if (bajaDate && bajaDate > today) continue;

      const assignment = byEmployee.get(String(emp.id));
      const moduloOcupada =
        assignment && assignment.requiere_taquilla !== false && Boolean(assignment.numero_taquilla_actual);
      const fichaOcupada = Boolean(emp.taquilla_numero || emp.taquilla_vestuario);
      if (!moduloOcupada && !fichaOcupada) continue;

      if (moduloOcupada) {
        assignmentUpdates.push({
          id: assignment.id,
          requiere_taquilla: false,
          vestuario: '',
          numero_taquilla_actual: '',
          numero_taquilla_nuevo: '',
          historial_cambios: [
            ...(assignment.historial_cambios || []),
            {
              fecha: new Date().toISOString(),
              vestuario_anterior: assignment.vestuario || '',
              taquilla_anterior: assignment.numero_taquilla_actual || '',
              vestuario_nuevo: '',
              taquilla_nueva: '',
              motivo: `Baja del empleado${bajaDate ? ` (${bajaDate})` : ''} - liberación automática`,
            },
          ],
        });
      }

      if (fichaOcupada) {
        employeeUpdates.push({ id: emp.id, taquilla_vestuario: '', taquilla_numero: '' });
      }

      liberadas.push({
        nombre: emp.nombre || '',
        codigo: emp.codigo_empleado || '',
        vestuario: (moduloOcupada ? assignment.vestuario : emp.taquilla_vestuario) || '',
        numero: (moduloOcupada ? assignment.numero_taquilla_actual : emp.taquilla_numero) || '',
        fecha_baja: bajaDate || null,
      });
    }

    for (let i = 0; i < assignmentUpdates.length; i += 200) {
      await base44.asServiceRole.entities.LockerAssignment.bulkUpdate(assignmentUpdates.slice(i, i + 200));
    }
    for (let i = 0; i < employeeUpdates.length; i += 200) {
      await base44.asServiceRole.entities.EmployeeMasterDatabase.bulkUpdate(employeeUpdates.slice(i, i + 200));
    }

    return Response.json({
      success: true,
      fecha_referencia: today,
      liberadas: liberadas.length,
      detalle: liberadas,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}