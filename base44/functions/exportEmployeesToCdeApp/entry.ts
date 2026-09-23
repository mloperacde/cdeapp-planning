import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Endpoint GET que CDEApp consulta para sincronizar empleados.
 * Autenticación: cabecera X-API-Key con el secret "CdeApp" (la misma clave que usa nuestra app para llamar a CDEApp).
 * 
 * Campos devueltos (según especificación CDEApp):
 * Código Empleado, Nombre, Estado, Departamento, Puesto, Categoría, Fecha Alta, Fecha Baja,
 * DNI, Sexo, Nacionalidad, Dirección, Email, Teléfono Móvil,
 * Contacto Emergencia Nombre, Contacto Emergencia Teléfono, Contacto Emergencia Relación,
 * Tipo de jornada, Horas jornada, Tipo de turno, Turno/Equipo
 */
Deno.serve(async (req) => {
  // Solo GET
  if (req.method !== 'GET') {
    return Response.json({ error: 'Método no permitido. Use GET.' }, { status: 405 });
  }

  // Validar API Key (CDEApp usa la misma clave que nosotros usamos para llamarle)
  const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key');
  const validKey = Deno.env.get('CdeApp');

  if (!apiKey || !validKey || apiKey !== validKey) {
    return Response.json({ error: 'No autorizado. Incluye la cabecera X-API-Key válida.' }, { status: 401 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Parámetros opcionales de filtrado
    const url = new URL(req.url);
    const departamento = url.searchParams.get('departamento');
    const estado = url.searchParams.get('estado'); // Alta, Baja, Excedencia
    const updated_since = url.searchParams.get('updated_since'); // ISO date para sync incremental
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '5000'), 5000);

    // Construir filtro
    const query = {};
    if (departamento) query.departamento = departamento;
    if (estado) query.estado_empleado = estado;

    // Obtener empleados con service role (ignora RLS, acceso completo)
    let employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter(
      query,
      '-updated_date',
      limit
    );

    // Filtro incremental por fecha de actualización
    if (updated_since) {
      const sinceDate = new Date(updated_since);
      employees = employees.filter(emp => {
        const updatedAt = new Date(emp.updated_date || emp.created_date || 0);
        return updatedAt >= sinceDate;
      });
    }

    // Mapear solo los campos solicitados por CDEApp
    const data = employees.map(emp => ({
      codigo_empleado: emp.codigo_empleado || null,
      nombre: emp.nombre || null,
      estado: emp.estado_empleado || null,
      departamento: emp.departamento || null,
      puesto: emp.puesto || null,
      categoria: emp.categoria || null,
      fecha_alta: emp.fecha_alta || null,
      fecha_baja: emp.fecha_baja || null,
      dni: emp.dni || null,
      sexo: emp.sexo || null,
      nacionalidad: emp.nacionalidad || null,
      direccion: emp.direccion || null,
      email: emp.email || null,
      telefono_movil: emp.telefono_movil || null,
      contacto_emergencia_nombre: emp.contacto_emergencia_nombre || null,
      contacto_emergencia_telefono: emp.contacto_emergencia_telefono || null,
      contacto_emergencia_relacion: emp.contacto_emergencia_relacion || null,
      tipo_jornada: emp.tipo_jornada || null,
      horas_jornada: emp.num_horas_jornada ?? null,
      tipo_turno: emp.tipo_turno || null,
      turno_equipo: emp.equipo || null,
    }));

    return Response.json({
      success: true,
      total: data.length,
      limit,
      updated_since: updated_since || null,
      exported_at: new Date().toISOString(),
      data,
    });

  } catch (error) {
    console.error('exportEmployeesToCdeApp error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});