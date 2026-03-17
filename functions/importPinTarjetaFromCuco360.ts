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

    // Debug: explorar endpoints de empleados
    if (body.explore) {
        const endpoints = [
            `/employees`,
            `/employees?cod_cliente=${COD_CLIENTE}`,
            `/employees/list`,
            `/employees/list/${COD_CLIENTE}`,
            `/employee/list/${COD_CLIENTE}`,
            `/employee/list`,
            `/empleados/${COD_CLIENTE}`,
            `/getemployees/${COD_CLIENTE}`,
        ];

        const results = [];
        for (const ep of endpoints) {
            const url = `${API_BASE}${ep}`;
            try {
                const response = await fetch(url, { headers });
                const text = await response.text();
                results.push({ endpoint: ep, status: response.status, body: text.slice(0, 300) });
                console.log(`${ep} -> ${response.status}: ${text.slice(0, 200)}`);
            } catch (e) {
                results.push({ endpoint: ep, error: e.message });
            }
        }
        return Response.json({ results });
    }

    // Debug: probar endpoint con ID de empleado Cuco (el que aparece en la captura como "660")
    if (body.debug_url) {
        const url = `${API_BASE}${body.debug_url}`;
        console.log(`DEBUG: GET ${url}`);
        const response = await fetch(url, { headers });
        const text = await response.text();
        console.log(`Response (${response.status}): ${text.slice(0, 500)}`);
        return Response.json({ status: response.status, url, body: text.slice(0, 2000) });
    }

    // PASO 1: Obtener lista completa de empleados desde Cuco360
    // Basado en la documentación: GET /employees/{customerId}
    // Pero el customerId puede ser el ID interno de Cuco, no el cod_cliente
    // Intentamos primero sin parámetro de cliente (autenticado por APIkey)
    console.log(`Obteniendo lista de empleados desde Cuco360...`);
    const listUrl = `${API_BASE}/employees`;
    let listResponse;
    try {
        listResponse = await fetch(listUrl, { headers });
    } catch (netErr) {
        return Response.json({ error: `Error de red: ${netErr.message}` }, { status: 500 });
    }

    if (!listResponse.ok) {
        const errText = await listResponse.text();
        console.error(`Error al obtener lista: HTTP ${listResponse.status} - ${errText}`);
        return Response.json({ 
            error: `Error HTTP ${listResponse.status}`,
            detail: errText,
            hint: 'Usa debug_url o explore para investigar el endpoint correcto'
        }, { status: 500 });
    }

    let listData;
    try {
        listData = await listResponse.json();
    } catch {
        return Response.json({ error: 'Respuesta inválida al obtener lista de empleados' }, { status: 500 });
    }

    const cucoEmployees = listData.data || listData;
    if (!Array.isArray(cucoEmployees)) {
        return Response.json({ error: 'Formato inesperado de la lista de empleados', raw: JSON.stringify(listData).slice(0, 500) }, { status: 500 });
    }

    console.log(`Empleados obtenidos desde Cuco360: ${cucoEmployees.length}`);
    if (cucoEmployees.length > 0) {
        console.log(`Estructura primer empleado: ${JSON.stringify(cucoEmployees[0])}`);
    }

    // PASO 2: Construir mapa por código
    const cucoMap = {};
    for (const cucoEmp of cucoEmployees) {
        const cod = String(
            cucoEmp.cod_empleado || cucoEmp.cod_interno || cucoEmp.codigo || cucoEmp.id || ''
        ).trim();
        if (cod) cucoMap[cod] = cucoEmp;
    }

    // PASO 3: Actualizar empleados locales
    const localEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 2000);
    console.log(`Empleados locales: ${localEmployees.length}`);

    let actualizados = 0;
    let sinMatch = 0;
    let sinCodigo = 0;
    let sinDatos = 0;

    for (const emp of localEmployees) {
        if (!emp.codigo_empleado) { sinCodigo++; continue; }

        const cod = String(emp.codigo_empleado).trim();
        const cucoEmp = cucoMap[cod];

        if (!cucoEmp) { sinMatch++; continue; }

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
        } else {
            sinDatos++;
        }
    }

    return Response.json({
        success: true,
        resumen: {
            empleados_en_cuco360: cucoEmployees.length,
            empleados_locales: localEmployees.length,
            actualizados,
            sin_match_en_cuco: sinMatch,
            sin_pin_ni_tarjeta: sinDatos,
            sin_codigo_local: sinCodigo,
        }
    });
});