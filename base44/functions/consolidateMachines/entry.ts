import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 });
    }

    const results = {
      processed: 0,
      migrated: 0,
      skipped: 0,
      duplicatesFixed: 0,
      processesIntegrated: 0,
      errors: [],
      migrations: []
    };

    // 1. Obtener datos de Machine y MachineMasterDatabase
    const machines = await base44.asServiceRole.entities.Machine.list('orden', 500);
    const masterMachines = await base44.asServiceRole.entities.MachineMasterDatabase.list('codigo_maquina', 500);
    const processes = await base44.asServiceRole.entities.Process.list('codigo', 200);
    const machineProcesses = await base44.asServiceRole.entities.MachineProcess.list('', 300);

    // 2. Crear índice de máquinas master por código
    const masterByCode = {};
    masterMachines.forEach(m => {
      if (m.codigo_maquina) {
        masterByCode[m.codigo_maquina.toLowerCase()] = m;
      }
    });

    // 3. Detectar y resolver códigos duplicados en Machine
    const machineCodes = {};
    machines.forEach(m => {
      const code = m.codigo?.toLowerCase();
      if (code) {
        if (!machineCodes[code]) machineCodes[code] = [];
        machineCodes[code].push(m);
      }
    });

    // Resolver duplicados asignando sufijos
    for (const [code, machineList] of Object.entries(machineCodes)) {
      if (machineList.length > 1) {
        for (let i = 1; i < machineList.length; i++) {
          const oldCode = machineList[i].codigo;
          const newCode = `${oldCode}_${i}`;
          await base44.asServiceRole.entities.Machine.update(machineList[i].id, {
            codigo: newCode
          });
          results.duplicatesFixed++;
          console.log(`Código duplicado resuelto: ${oldCode} -> ${newCode}`);
        }
      }
    }

    // 4. Re-obtener máquinas después de corregir duplicados
    const updatedMachines = await base44.asServiceRole.entities.Machine.list('orden', 500);

    // 5. Crear mapeo de process_id a datos del proceso
    const processMap = {};
    processes.forEach(p => {
      processMap[p.id] = {
        process_id: p.id,
        nombre_proceso: p.nombre,
        codigo_proceso: p.codigo,
        operadores_requeridos: p.operadores_requeridos || 1,
        activo: p.activo !== false
      };
    });

    // 6. Migrar cada máquina a MachineMasterDatabase
    for (const machine of updatedMachines) {
      results.processed++;

      try {
        const codigo = machine.codigo?.toLowerCase();
        
        // Verificar si ya existe en master
        if (codigo && masterByCode[codigo]) {
          results.skipped++;
          results.migrations.push({
            machine_id: machine.id,
            codigo: machine.codigo,
            nombre: machine.nombre,
            status: 'skipped',
            reason: 'Ya existe en MachineMasterDatabase'
          });
          continue;
        }

        // Construir procesos configurados desde MachineProcess
        const machineProcessRecords = machineProcesses.filter(mp => mp.machine_id === machine.id);
        const procesosConfigurados = [];
        
        for (const mp of machineProcessRecords) {
          if (processMap[mp.process_id]) {
            procesosConfigurados.push({
              ...processMap[mp.process_id],
              operadores_requeridos: mp.operadores_requeridos || processMap[mp.process_id].operadores_requeridos,
              orden: mp.orden || 0,
              activo: mp.activo !== false
            });
          }
        }

        // Agregar procesos de procesos_ids si existen
        if (machine.procesos_ids && Array.isArray(machine.procesos_ids)) {
          machine.procesos_ids.forEach((pid, idx) => {
            if (processMap[pid] && !procesosConfigurados.find(p => p.process_id === pid)) {
              procesosConfigurados.push({
                ...processMap[pid],
                orden: procesosConfigurados.length,
                activo: true
              });
            }
          });
        }

        results.processesIntegrated += procesosConfigurados.length;

        // Crear registro en MachineMasterDatabase
        const masterData = {
          codigo_maquina: machine.codigo || `M${machine.id}`,
          nombre: machine.nombre,
          marca: machine.marca,
          modelo: machine.modelo,
          numero_serie: machine.numero_serie,
          fecha_compra: machine.fecha_compra,
          tipo: machine.tipo,
          ubicacion: machine.ubicacion,
          descripcion: machine.descripcion,
          orden_visualizacion: machine.orden,
          estado_operativo: 'Operativa',
          parametros_sobres: machine.parametros_sobres,
          parametros_frascos: machine.parametros_frascos,
          procesos_configurados: procesosConfigurados,
          articulos_fabricables: machine.articulos_ids || [],
          programa_mantenimiento: machine.programa_mantenimiento,
          imagenes: machine.imagenes || [],
          archivos_adjuntos: machine.archivos_adjuntos || [],
          historico_produccion: machine.historico_articulos || [],
          notas: machine.descripcion || '',
          machine_id_legacy: machine.id,
          ultimo_sincronizado: new Date().toISOString(),
          estado_sincronizacion: 'Sincronizado'
        };

        const newMaster = await base44.asServiceRole.entities.MachineMasterDatabase.create(masterData);
        
        results.migrated++;
        results.migrations.push({
          machine_id: machine.id,
          master_id: newMaster.id,
          codigo: machine.codigo,
          nombre: machine.nombre,
          procesos_count: procesosConfigurados.length,
          status: 'success'
        });

        console.log(`Migrada: ${machine.nombre} -> MachineMasterDatabase ID: ${newMaster.id}`);

      } catch (error) {
        results.errors.push({
          machine_id: machine.id,
          nombre: machine.nombre,
          error: error.message
        });
        console.error(`Error migrando ${machine.nombre}:`, error);
      }
    }

    return Response.json({
      success: true,
      results,
      summary: {
        total_machines: machines.length,
        processed: results.processed,
        migrated: results.migrated,
        skipped: results.skipped,
        duplicates_fixed: results.duplicatesFixed,
        processes_integrated: results.processesIntegrated,
        errors: results.errors.length
      }
    });

  } catch (error) {
    console.error('Error en consolidación:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});