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

    // PASO 1: Obtener lista de empleados desde Cuco360
    // GET /employees/list/{customerId} → devuelve cod_int_empleado + pin
    console.log(`Obteniendo lista de empleados desde Cuco360 (cliente ${COD_CLIENTE})...`);
    const listResponse = await fetch(`${API_BASE}/employees/list/${COD_CLIENTE}`, { headers });

    if (!listResponse.ok) {
        const errText = await listResponse.text();
        return Response.json({ error: `Error HTTP ${listResponse.status} al obtener lista: ${errText}` }, { status: 500 });
    }

    const listData = await listResponse.json();
    const cucoEmployees = listData.data?.employees || listData.data || listData;

    if (!Array.isArray(cucoEmployees)) {
        return Response.json({ error: 'Formato inesperado de la lista de empleados', raw: JSON.stringify(listData).slice(0, 500) }, { status: 500 });
    }

    console.log(`Empleados obtenidos desde Cuco360: ${cucoEmployees.length}`);

    // PASO 2: Para cada empleado Cuco, obtener detalle con la tarjeta
    // GET /employees/{cod_empleado_cuco} → devuelve pin + tarjeta
    // Construimos mapa cod_int_empleado → { pin, tarjeta }
    const cucoMap = {};

    for (const cucoEmp of cucoEmployees) {
        const codInterno = String(cucoEmp.cod_int_empleado || '').trim();
        const codCuco = cucoEmp.cod_empleado;
        const pinFromList = cucoEmp.pin;

        if (!codInterno || !codCuco) continue;

        // Obtener detalle para conseguir la tarjeta
        let tarjeta = null;
        let pinFinal = pinFromList || null;

        try {
            const detailResponse = await fetch(`${API_BASE}/employees/${codCuco}`, { headers });
            if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                const detail = detailData.data || detailData;
                tarjeta = detail.tarjeta || null;
                pinFinal = detail.pin || pinFromList || null;
            }
        } catch (e) {
            console.error(`Error obteniendo detalle de empleado Cuco ${codCuco}: ${e.message}`);
        }

        cucoMap[codInterno] = { pin: pinFinal, tarjeta };

        // Pequeña pausa para no saturar la API
        await new Promise(r => setTimeout(r, 80));
    }

    console.log(`Mapa Cuco360 construido con ${Object.keys(cucoMap).length} entradas`);

    // PASO 3: Actualizar empleados locales con pin y tarjeta
    const localEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 2000);
    console.log(`Empleados locales: ${localEmployees.length}`);

    let actualizados = 0;
    let sinMatch = 0;
    let sinCodigo = 0;
    let sinDatos = 0;

    for (const emp of localEmployees) {
        if (!emp.codigo_empleado) { sinCodigo++; continue; }

        const cod = String(emp.codigo_empleado).trim();
        const cucoData = cucoMap[cod];

        if (!cucoData) { sinMatch++; continue; }

        const pinRaw = cucoData.pin;
        const tarjetaRaw = cucoData.tarjeta;

        const pin = (pinRaw !== undefined && pinRaw !== null && pinRaw !== '') ? parseInt(pinRaw, 10) : null;
        const numeroTarjeta = (tarjetaRaw !== undefined && tarjetaRaw !== null && tarjetaRaw !== '') ? String(tarjetaRaw) : null;

        if ((pin !== null && !isNaN(pin)) || numeroTarjeta !== null) {
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

    console.log(`Resumen final: actualizados=${actualizados}, sinMatch=${sinMatch}, sinCodigo=${sinCodigo}, sinDatos=${sinDatos}`);

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