import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch machines from CDE API
        const apiUrl = 'https://cdeapp.es/api/maquinas';
        const apiKey = Deno.env.get('CdeApp');

        if (!apiKey) {
            return Response.json({ 
                error: 'API key not configured',
                message: 'La clave API de CdeApp no está configurada en los secretos'
            }, { status: 500 });
        }

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
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

        // Fetch existing machines
        const existingMachines = await base44.asServiceRole.entities.MachineMasterDatabase.list();
        const existingMap = new Map(existingMachines.map(m => [m.codigo_maquina, m]));

        const results = {
            created: [],
            updated: [],
            errors: []
        };

        for (const apiMachine of apiMachines) {
            try {
                const machineData = {
                    codigo_maquina: String(apiMachine.external_id),
                    nombre: apiMachine.nombre,
                    tipo: apiMachine.tipo || 'Otro',
                    descripcion: apiMachine.descripcion,
                    ubicacion: apiMachine.ubicacion,
                    estado_operativo: apiMachine.estado || 'Operativa'
                };

                const existing = existingMap.get(machineData.codigo_maquina);

                if (existing) {
                    // Update existing machine
                    await base44.asServiceRole.entities.MachineMasterDatabase.update(existing.id, {
                        ...machineData,
                        estado_sincronizacion: 'Sincronizado',
                        ultimo_sincronizado: new Date().toISOString()
                    });
                    results.updated.push(machineData.nombre);
                } else {
                    // Create new machine
                    await base44.asServiceRole.entities.MachineMasterDatabase.create({
                        ...machineData,
                        estado_sincronizacion: 'Sincronizado',
                        ultimo_sincronizado: new Date().toISOString()
                    });
                    results.created.push(machineData.nombre);
                }
            } catch (error) {
                results.errors.push({
                    machine: apiMachine.nombre,
                    error: error.message
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