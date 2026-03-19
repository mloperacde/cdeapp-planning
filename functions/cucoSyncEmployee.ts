import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const CUCO_BASE_URL = "https://cuco360.cucorent.com/api/ExtApi";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, employeeId } = await req.json();
  // action: "create" | "update" | "deactivate" | "delete"

  if (!action || !employeeId) {
    return Response.json({ error: 'Se requiere action y employeeId' }, { status: 400 });
  }

  const API_KEY = Deno.env.get("CUCO360_API_KEY");
  const CLIENT_CODE = Deno.env.get("CUCO_CLIENT_CODE") || "380";

  // Obtener el empleado de nuestra BD
  const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter({ id: employeeId });
  const emp = employees[0];

  if (!emp && action !== "delete") {
    return Response.json({ error: 'Empleado no encontrado en BD maestra' }, { status: 404 });
  }

  const codInterno = emp?.codigo_empleado;

  // Construir form data para Cuco360
  const buildFormData = (employee, situacion) => {
    const parts = (employee.nombre || "").split(" ");
    const nom = parts[0] || "";
    const ape = parts.slice(1).join(" ") || nom; // fallback

    const params = new URLSearchParams();
    params.append("nom_empleado", nom);
    params.append("ape_empleado", ape || nom);
    params.append("cod_cliente", CLIENT_CODE);
    params.append("cod_interno", employee.codigo_empleado || "");
    params.append("val_situacion", situacion || (employee.estado_empleado === "Alta" ? "A" : "B"));
    // Usar valores mínimos requeridos con defaults seguros
    params.append("cod_centro", "1"); // Centro por defecto
    params.append("cod_departamento", "1"); // Departamento por defecto
    params.append("cod_est_civil", "1");
    params.append("sexo", employee.sexo === "Femenino" ? "F" : "M");
    params.append("des_nacimiento", employee.fecha_nacimiento || "1990-01-01");
    params.append("cod_nivel_estudios", "1");

    if (employee.pin) params.append("pin", String(employee.pin));
    if (employee.numero_tarjeta) params.append("tarjeta", employee.numero_tarjeta);
    if (employee.email) params.append("dir_email", employee.email);
    if (employee.nuss) params.append("num_seg_social", employee.nuss);
    if (employee.dni) params.append("num_hijos", employee.dni); // campo mal nombrado en API: num_hijos = DNI
    if (employee.fecha_alta) params.append("fec_antiguedad", employee.fecha_alta);

    return params;
  };

  let result;

  if (action === "create") {
    const formData = buildFormData(emp, "A");
    const res = await fetch(`${CUCO_BASE_URL}/employees`, {
      method: "POST",
      headers: { "APIkey": API_KEY, "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    });
    const data = await res.json();
    result = { status: res.status, data };

    // Actualizar estado de sync en nuestra BD
    await base44.asServiceRole.entities.EmployeeMasterDatabase.update(employeeId, {
      estado_sincronizacion: res.ok ? "Sincronizado" : "Error",
      ultimo_sincronizado: new Date().toISOString()
    });

  } else if (action === "update") {
    const formData = buildFormData(emp);
    const res = await fetch(`${CUCO_BASE_URL}/employees/${codInterno}`, {
      method: "PUT",
      headers: { "APIkey": API_KEY, "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    });
    const data = await res.json();
    result = { status: res.status, data };

    await base44.asServiceRole.entities.EmployeeMasterDatabase.update(employeeId, {
      estado_sincronizacion: res.ok ? "Sincronizado" : "Error",
      ultimo_sincronizado: new Date().toISOString()
    });

  } else if (action === "deactivate") {
    // Cambiar situación a Baja en Cuco360
    const formData = buildFormData(emp, "B");
    const res = await fetch(`${CUCO_BASE_URL}/employees/${codInterno}`, {
      method: "PUT",
      headers: { "APIkey": API_KEY, "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    });
    const data = await res.json();
    result = { status: res.status, data };

    await base44.asServiceRole.entities.EmployeeMasterDatabase.update(employeeId, {
      estado_sincronizacion: res.ok ? "Sincronizado" : "Error",
      ultimo_sincronizado: new Date().toISOString()
    });

  } else if (action === "delete") {
    const params = new URLSearchParams();
    params.append("cod_cliente", CLIENT_CODE);
    const res = await fetch(`${CUCO_BASE_URL}/employees/${codInterno}`, {
      method: "DELETE",
      headers: { "APIkey": API_KEY, "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    const data = await res.json();
    result = { status: res.status, data };
  }

  return Response.json({ action, employeeId, codInterno, result });
});