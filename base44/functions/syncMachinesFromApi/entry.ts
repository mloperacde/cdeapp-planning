import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch machines from CDE API (usar mismo endpoint que cdeApi.getMachines)
        const apiUrl = 'https://cdeapp.es/api/v1/sync-machines';
        const apiKey = Deno.env.get('CdeApp') || Deno.env.get('CDEAPP_API_KEY');

        if (!apiKey) {
            return Response.json({ 
                error: 'API key not configured',
                message: 'La clave API de CdeApp no está configurada en los secretos'
            }, { status: 500 });
        }

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const apiData = await response.json();
        
        if (!apiData.success || !Array.isArray(apiData.data)) {
            throw new Error('Invalid API response format');
        }

        const apiMachines = apiData.data;

        const existingMachines = await base44.asServiceRole.entities.MachineMasterDatabase.list();
        const existingByExternalId = new Map(existingMachines.map(m => [String(m.id_base44 || "").trim(), m]));
        const existingByCodigo = new Map(existingMachines.map(m => [String(m.codigo_maquina || "").trim(), m]));

        const results = {
            created: [],
            updated: [],
            errors: []
        };

        for (const apiMachine of apiMachines) {
            try {
                const externalId = String(apiMachine.external_id || "").trim();
                const codigo = String(apiMachine.codigo || "").trim();
                const nombreCorto = (apiMachine.nombre || "").trim();
                const sala = (apiMachine.sala || apiMachine.ubicacion || "").trim();

                const prefixParts = [sala, codigo].filter(Boolean);
                const prefix = prefixParts.join(" ");
                const alias = prefix ? `(${prefix} - ${nombreCorto})` : nombreCorto;

                const machineData = {
                    id_base44: externalId || undefined,
                    codigo_maquina: codigo,
                    nombre_maquina: nombreCorto,
                    nombre: alias,
                    descripcion: alias,
                    ubicacion: sala,
                    tipo: apiMachine.tipo || "General",
                    ultimo_sincronizado: new Date().toISOString(),
                    estado_sincronizacion: "Sincronizado"
                };

                let existing = externalId ? existingByExternalId.get(externalId) : undefined;
                if (!existing && codigo) {
                    existing = existingByCodigo.get(codigo);
                }

                if (existing) {
                    await base44.asServiceRole.entities.MachineMasterDatabase.update(existing.id, machineData);
                    results.updated.push(machineData.nombre);
                } else {
                    await base44.asServiceRole.entities.MachineMasterDatabase.create({
                        ...machineData,
                        orden_visualizacion: 999,
                        estado_produccion: "Sin Producción",
                        estado_disponibilidad: "Disponible",
                        imagenes: [],
                        archivos_adjuntos: [],
                        programa_mantenimiento: ""
                    });
                    results.created.push(machineData.nombre);
                }
            } catch (error) {
                results.errors.push({
                    machine: apiMachine.nombre,
                    error: (error as Error).message
                });
            }
        }

        return Response.json({
            success: true,
            message: `Sincronización completada: ${results.created.length} creadas, ${results.updated.length} actualizadas`,
            summary: {
                total_api_machines: apiMachines.length,
                created: results.created.length,
                updated: results.updated.length,
                errors: results.errors.length
            },
            details: results
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ 
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});
