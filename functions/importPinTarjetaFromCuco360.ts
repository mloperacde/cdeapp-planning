import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CUCO360_BASE_URL = 'https://app.cuco360.com/api/v1';
const COD_CLIENTE = 380;

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

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };

    // 1. Obtener todos los empleados de nuestra BD
    const localEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();
    console.log(`Empleados locales encontrados: ${localEmployees.length}`);

    let actualizados = 0;
    let errores = 0;
    let sinCodigo = 0;
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
        const url = `${CUCO360_BASE_URL}/employees/${codEmpleado}?cod_cliente=${COD_CLIENTE}`;
        const response = await fetch(url, { headers });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error al obtener empleado ${codEmpleado}: ${response.status} - ${errorText}`);
            errores++;
            detallesErrores.push({ codigo: emp.codigo_empleado, nombre: emp.nombre, error: `HTTP ${response.status}` });
            continue;
        }

        const data = await response.json();

        // Los datos pueden venir en data.data o directamente en data
        const cucoEmp = data.data || data;

        const pin = cucoEmp.pin !== undefined && cucoEmp.pin !== null ? parseInt(cucoEmp.pin, 10) : null;
        const numeroTarjeta = cucoEmp.numero_tarjeta || cucoEmp.num_tarjeta || null;

        // Solo actualizar si hay datos que guardar
        if (pin !== null || numeroTarjeta !== null) {
            const updateData = {};
            if (pin !== null && !isNaN(pin)) updateData.pin = pin;
            if (numeroTarjeta) updateData.numero_tarjeta = String(numeroTarjeta);

            await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, updateData);
            actualizados++;
            console.log(`Actualizado empleado ${emp.codigo_empleado} - ${emp.nombre}: pin=${pin}, tarjeta=${numeroTarjeta}`);
        } else {
            console.log(`Empleado ${emp.codigo_empleado} - ${emp.nombre}: sin pin ni tarjeta en Cuco360`);
        }
    }

    return Response.json({
        success: true,
        resumen: {
            total_empleados_locales: localEmployees.length,
            actualizados,
            errores,
            sin_codigo_empleado: sinCodigo,
        },
        errores_detalle: detallesErrores,
    });
});