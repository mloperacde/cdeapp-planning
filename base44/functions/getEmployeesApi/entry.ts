import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  // Validar API Key
  const apiKey = req.headers.get('x-api-key');
  const validKey = Deno.env.get('EMPLOYEES_API_KEY');

  if (!apiKey || !validKey || apiKey !== validKey) {
    return Response.json({ error: 'No autorizado. Incluye la cabecera x-api-key válida.' }, { status: 401 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Parámetros opcionales de filtrado
    const url = new URL(req.url);
    const departamento = url.searchParams.get('departamento');
    const activo = url.searchParams.get('activo');
    const updated_since = url.searchParams.get('updated_since'); // ISO date para sync incremental
    const limit = parseInt(url.searchParams.get('limit') || '2000');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Construir filtro
    const query = {};
    if (departamento) query.departamento = departamento;
    if (activo !== null && activo !== undefined && activo !== '') {
      query.activo = activo === 'true' || activo === '1';
    }

    // Obtener empleados con service role (ignora RLS, acceso completo)
    let employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter(
      query,
      '-updated_date',
      limit + offset
    );

    // Filtro incremental por fecha de actualización
    if (updated_since) {
      const sinceDate = new Date(updated_since);
      employees = employees.filter(emp => {
        const updatedAt = new Date(emp.updated_date || emp.created_date || 0);
        return updatedAt >= sinceDate;
      });
    }

    // Paginación manual
    const paginated = employees.slice(offset, offset + limit);

    // Mapear solo los campos relevantes para cdeapp
    const data = paginated.map(emp => ({
      id: emp.id,
      codigo_empleado: emp.codigo_empleado || null,
      nombre: emp.nombre || null,
      apellidos: emp.apellidos || null,
      nombre_completo: [emp.nombre, emp.apellidos].filter(Boolean).join(' ') || null,
      dni: emp.dni || null,
      email: emp.email || null,
      telefono: emp.telefono || null,
      departamento: emp.departamento || null,
      departamento_id: emp.department_id || null,
      puesto: emp.puesto || null,
      categoria: emp.categoria || null,
      tipo_contrato: emp.tipo_contrato || null,
      turno: emp.turno || null,
      fecha_alta: emp.fecha_alta || null,
      fecha_baja: emp.fecha_baja || null,
      activo: emp.activo !== false,
      pin: emp.pin || null,
      centro_trabajo: emp.centro_trabajo || null,
      created_date: emp.created_date || null,
      updated_date: emp.updated_date || null,
    }));

    return Response.json({
      success: true,
      total: employees.length,
      count: data.length,
      offset,
      limit,
      updated_since: updated_since || null,
      data
    });

  } catch (error) {
    console.error('getEmployeesApi error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});