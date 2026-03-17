import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const API_BASE = 'https://cuco360.cucorent.com/api/apiv2';
const COD_CLIENTE = '380';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
    }

    const apiKey = Deno.env.get('CUCO360_API_KEY');
    if (!apiKey) {
        return Response.json({ error: 'CUCO360_API_KEY no configurada' }, { status: 500 });
    }

    const authKey = apiKey.replace('Bearer ', '').trim();

    const headers = {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'APIkey': authKey,
        'X-CSRF-TOKEN': '',
        'cod_cliente': COD_CLIENTE
    };

    const body = await req.json().catch(() => ({}));

    // Modo debug: ver qué devuelve la lista de empleados de Cuco360
    if (body.debug_list) {
        const url = `${API_BASE}/employees/${COD_CLIENTE}`;
        console.log(`DEBUG LIST: GET ${url}`);
        const response = await fetch(url, { headers });
        const text = await response.text();
        console.log(`DEBUG LIST response (${response.status}): ${text.slice(0, 1000)}`);
        return Response.json({ status: response.status, body: text.slice(0, 3000) });
    }

    // Modo debug: ver detalle de un empleado específico
    if (body.debug_employee_id) {
        const url = `${API_BASE}/employee/${body.debug_employee_id}`;
        console.log(`DEBUG EMPLOYEE: GET ${url}`);
        const response = await fetch(url, { headers });
        const text = await response.text();
        console.log(`DEBUG EMPLOYEE response (${response.status}): ${text}`);
        return Response.json({ status: response.status, body: text });
    }

    // PASO 1: Obtener lista completa de empleados desde Cuco360
    console.log(`Obteniendo lista de empleados desde Cuco360 (cliente ${COD_CLIENTE})...`);
    const listUrl = `${API_BASE}/employees/${COD_CLIENTE}`;
    let listResponse;
    try {
        listResponse = await fetch(listUrl, { headers });
    } catch (netErr) {
        return Response.json({ error: `Error de red: ${netErr.message}` }, { status: 500 });
    }

    if (!listResponse.ok) {
        const errText = await listResponse.text();
        return Response.json({ error: `Error HTTP ${listResponse.status} al obtener lista: ${errText}` }, { status: 500 });
    }

    let listData;
    try {
        listData = await listResponse.json();
    } catch {
        return Response.json({ error: 'Respuesta inválida al obtener lista de empleados' }, { status: 500 });
    }

    const cucoEmployees = listData.data || listData;
    if (!Array.isArray(cucoEmployees)) {
        return Response.json({ error: 'Formato inesperado de la lista de empleados', raw: listData }, { status: 500 });
    }

    console.log(`Empleados obtenidos desde Cuco360: ${cucoEmployees.length}`);

    // PASO 2: Construir mapa de empleados de Cuco360 por cod_empleado
    // Examinar estructura del primer empleado
    if (cucoEmployees.length > 0) {
        console.log(`Estructura primer empleado Cuco360: ${JSON.stringify(cucoEmployees[0])}`);
    }

    // El campo de código interno puede llamarse cod_empleado, id, cod_interno, etc.
    const cucoMap = {};
    for (const cucoEmp of cucoEmployees) {
        const cod = String(
            cucoEmp.cod_empleado || cucoEmp.cod_interno || cucoEmp.id || ''
        ).trim();
        if (cod) cucoMap[cod] = cucoEmp;
    }

    console.log(`Mapa Cuco360 construido con ${Object.keys(cucoMap).length} entradas`);

    // PASO 3: Obtener empleados locales
    const localEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 2000);
    console.log(`Empleados locales: ${localEmployees.length}`);

    let actualizados = 0;
    let sinMatch = 0;
    let sinCodigo = 0;
    let sinDatos = 0;

    for (const emp of localEmployees) {
        if (!emp.codigo_empleado) {
            sinCodigo++;
            continue;
        }

        const cod = String(emp.codigo_empleado).trim();
        const cucoEmp = cucoMap[cod];

        if (!cucoEmp) {
            sinMatch++;
            continue;
        }

        const pinRaw = cucoEmp.pin;
        const tarjetaRaw = cucoEmp.numero_tarjeta || cucoEmp.num_tarjeta;

        const pin = (pinRaw !== undefined && pinRaw !== null && pinRaw !== '') ? parseInt(pinRaw, 10) : null;
        const numeroTarjeta = (tarjetaRaw !== undefined && tarjetaRaw !== null && tarjetaRaw !== '') ? String(tarjetaRaw) : null;

        if (pin !== null || numeroTarjeta !== null) {
            const updateData = {};
            if (pin !== null && !isNaN(pin)) updateData.pin = pin;
            if (numeroTarjeta) updateData.numero_tarjeta = numeroTarjeta;

            await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, updateData);
            actualizados++;
            console.log(`✓ ${emp.codigo_empleado} - ${emp.nombre}: pin=${pin}, tarjeta=${numeroTarjeta}`);
        } else {
            sinDatos++;
        }
    }

    console.log(`Resumen: actualizados=${actualizados}, sinMatch=${sinMatch}, sinCodigo=${sinCodigo}, sinDatos=${sinDatos}`);

    return Response.json({
        success: true,
        resumen: {
            empleados_en_cuco360: cucoEmployees.length,
            empleados_locales: localEmployees.length,
            actualizados,
            sin_match_en_cuco: sinMatch,
            sin_pin_ni_tarjeta: sinDatos,
            sin_codigo_empleado_local: sinCodigo,
        }
    });
});