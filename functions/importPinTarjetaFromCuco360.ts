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
    
    // Solo actualizar empleados que aún no tienen pin (para continuar donde se quedó)
    const onlyMissing = body.only_missing !== false; // por defecto true

    // PASO 1: Obtener lista de empleados desde Cuco360
    console.log(`Obteniendo lista de empleados desde Cuco360...`);
    const listResponse = await fetch(`${API_BASE}/employees/list/${COD_CLIENTE}`, { headers });

    if (!listResponse.ok) {
        const errText = await listResponse.text();
        return Response.json({ error: `Error HTTP ${listResponse.status}: ${errText}` }, { status: 500 });
    }

    const listData = await listResponse.json();
    const cucoEmployees = listData.data?.employees || listData.data || listData;

    if (!Array.isArray(cucoEmployees)) {
        return Response.json({ error: 'Formato inesperado', raw: JSON.stringify(listData).slice(0, 500) }, { status: 500 });
    }

    console.log(`Empleados en Cuco360: ${cucoEmployees.length}`);

    // PASO 2: Obtener empleados locales
    const localEmployees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 2000);
    
    // Filtrar solo los que no tienen pin si only_missing=true
    const toProcess = onlyMissing 
        ? localEmployees.filter(e => !e.pin && e.codigo_empleado)
        : localEmployees.filter(e => e.codigo_empleado);

    console.log(`Empleados locales a procesar: ${toProcess.length} (onlyMissing=${onlyMissing})`);

    // Mapa cod_int → cod_empleado_cuco (para llamar al detalle)
    const cucoMapByCodInt = {};
    const cucoMapPin = {}; // pin ya viene en el listado
    for (const cucoEmp of cucoEmployees) {
        const codInt = String(cucoEmp.cod_int_empleado || '').trim();
        if (codInt) {
            cucoMapByCodInt[codInt] = cucoEmp.cod_empleado;
            cucoMapPin[codInt] = cucoEmp.pin || null;
        }
    }

    let actualizados = 0;
    let sinMatch = 0;
    let errores = 0;

    // Procesar en lotes de 3 con pausa para respetar rate limit de Base44
    const BATCH_SIZE = 3;
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
        const batch = toProcess.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (emp) => {
            const cod = String(emp.codigo_empleado).trim();
            const codCuco = cucoMapByCodInt[cod];

            if (!codCuco) {
                sinMatch++;
                return;
            }

            try {
                // Obtener detalle para conseguir tarjeta
                const detailResponse = await fetch(`${API_BASE}/employees/${codCuco}`, { headers });
                if (!detailResponse.ok) {
                    errores++;
                    return;
                }

                const detailData = await detailResponse.json();
                const detail = detailData.data || detailData;

                const pinRaw = detail.pin || cucoMapPin[cod];
                const tarjetaRaw = detail.tarjeta;

                const pin = (pinRaw !== undefined && pinRaw !== null && pinRaw !== '') ? parseInt(pinRaw, 10) : null;
                const numeroTarjeta = (tarjetaRaw !== undefined && tarjetaRaw !== null && tarjetaRaw !== '') ? String(tarjetaRaw) : null;

                if ((pin !== null && !isNaN(pin)) || numeroTarjeta !== null) {
                    const updateData = {};
                    if (pin !== null && !isNaN(pin)) updateData.pin = pin;
                    if (numeroTarjeta) updateData.numero_tarjeta = numeroTarjeta;
                    await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, updateData);
                    actualizados++;
                    console.log(`✓ ${emp.codigo_empleado} - ${emp.nombre}: pin=${pin}, tarjeta=${numeroTarjeta}`);
                }
            } catch (e) {
                errores++;
                console.error(`Error procesando empleado ${cod}: ${e.message}`);
            }
        }));

        // Pausa entre lotes para respetar rate limit de Base44 (~300ms/op)
        await new Promise(r => setTimeout(r, 350));
    }

    console.log(`Completado: actualizados=${actualizados}, sinMatch=${sinMatch}, errores=${errores}`);

    return Response.json({
        success: true,
        resumen: {
            empleados_cuco360: cucoEmployees.length,
            empleados_locales: localEmployees.length,
            procesados: toProcess.length,
            actualizados,
            sin_match_en_cuco: sinMatch,
            errores,
        }
    });
});