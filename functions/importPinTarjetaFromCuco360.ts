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
        'X-CSRF-TOKEN': ''
    };

    // 1. Obtener todos los empleados de nuestra BD
    const localEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 2000);
    console.log(`Empleados locales encontrados: ${localEmployees.length}`);

    let actualizados = 0;
    let errores = 0;
    let sinCodigo = 0;
    let sinDatos = 0;
    const detallesErrores = [];

    for (const emp of localEmployees) {
        if (!emp.codigo_empleado) {
            sinCodigo++;
            continue;
        }

        const codEmpleado = parseInt(emp.codigo_empleado, 10);
        if (isNaN(codEmpleado)) {
            sinCodigo++;
            continue;
        }

        // 2. Obtener datos del empleado desde Cuco360
        const url = `${API_BASE}/employees/${codEmpleado}?cod_cliente=${COD_CLIENTE}`;
        
        let response;
        try {
            response = await fetch(url, { headers });
        } catch (netErr) {
            console.error(`Error de red para empleado ${codEmpleado}:`, netErr.message);
            errores++;
            detallesErrores.push({ codigo: emp.codigo_empleado, nombre: emp.nombre, error: `Red: ${netErr.message}` });
            continue;
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error HTTP ${response.status} para empleado ${codEmpleado}: ${errorText}`);
            errores++;
            detallesErrores.push({ codigo: emp.codigo_empleado, nombre: emp.nombre, error: `HTTP ${response.status}` });
            continue;
        }

        let data;
        try {
            data = await response.json();
        } catch {
            errores++;
            detallesErrores.push({ codigo: emp.codigo_empleado, nombre: emp.nombre, error: 'JSON inválido' });
            continue;
        }

        // Los datos pueden venir en data.data o directamente
        const cucoEmp = data.data || data;

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
            console.log(`✓ Empleado ${emp.codigo_empleado} - ${emp.nombre}: pin=${pin}, tarjeta=${numeroTarjeta}`);
        } else {
            sinDatos++;
            console.log(`- Empleado ${emp.codigo_empleado} - ${emp.nombre}: sin pin ni tarjeta en Cuco360`);
        }

        // Pequeña pausa para no saturar la API
        await new Promise(r => setTimeout(r, 100));
    }

    console.log(`Resumen: actualizados=${actualizados}, errores=${errores}, sinCodigo=${sinCodigo}, sinDatos=${sinDatos}`);

    return Response.json({
        success: true,
        resumen: {
            total_empleados_locales: localEmployees.length,
            actualizados,
            sin_pin_ni_tarjeta_en_cuco: sinDatos,
            errores,
            sin_codigo_empleado: sinCodigo,
        },
        errores_detalle: detallesErrores,
    });
});