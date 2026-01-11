import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const execution = {
    started: new Date().toISOString(),
    steps: [],
    errors: [],
    success: false
  };

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Solo administradores pueden ejecutar consolidación',
        success: false 
      }, { status: 403 });
    }

    execution.steps.push({ step: 'Auth', status: 'success', msg: `Usuario: ${user.email}` });

    // ============ PASO 1: CONSOLIDAR MÁQUINAS ============
    execution.steps.push({ step: 'Consolidate', status: 'processing', msg: 'Iniciando consolidación de máquinas...' });

    const [machines, masterMachines, processes, machineProcesses] = await Promise.all([
      base44.asServiceRole.entities.Machine.list('orden', 500),
      base44.asServiceRole.entities.MachineMasterDatabase.list('codigo_maquina', 500),
      base44.asServiceRole.entities.Process.list('codigo', 200),
      base44.asServiceRole.entities.MachineProcess.list('', 300)
    ]);

    // Detectar y corregir duplicados de código
    const machineCodes = {};
    machines.forEach(m => {
      const code = m.codigo?.toLowerCase();
      if (code) {
        if (!machineCodes[code]) machineCodes[code] = [];
        machineCodes[code].push(m);
      }
    });

    let duplicatesFixed = 0;
    for (const [code, list] of Object.entries(machineCodes)) {
      if (list.length > 1) {
        for (let i = 1; i < list.length; i++) {
          await base44.asServiceRole.entities.Machine.update(list[i].id, {
            codigo: `${code}_${i}`
          });
          duplicatesFixed++;
        }
      }
    }

    // Re-obtener máquinas actualizadas
    const updatedMachines = await base44.asServiceRole.entities.Machine.list('orden', 500);

    // Mapeo de máquinas master
    const masterByCode = {};
    masterMachines.forEach(m => {
      if (m.codigo_maquina) {
        masterByCode[m.codigo_maquina.toLowerCase()] = m;
      }
    });

    // Mapeo de procesos
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

    // Migrar máquinas
    let migrated = 0;
    let skipped = 0;
    let processesIntegrated = 0;

    for (const machine of updatedMachines) {
      const codigo = machine.codigo?.toLowerCase();
      
      // Si ya existe en master, saltar
      if (codigo && masterByCode[codigo]) {
        skipped++;
        continue;
      }

      // Construir procesos configurados
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

      // Agregar desde procesos_ids si existen
      if (machine.procesos_ids && Array.isArray(machine.procesos_ids)) {
        machine.procesos_ids.forEach((pid) => {
          if (processMap[pid] && !procesosConfigurados.find(p => p.process_id === pid)) {
            procesosConfigurados.push({
              ...processMap[pid],
              orden: procesosConfigurados.length,
              activo: true
            });
          }
        });
      }

      processesIntegrated += procesosConfigurados.length;

      // Crear en MachineMasterDatabase
      try {
        await base44.asServiceRole.entities.MachineMasterDatabase.create({
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
        });
        migrated++;
      } catch (err) {
        execution.errors.push({ machine: machine.nombre, error: err.message });
      }
    }

    execution.steps.push({ 
      step: 'Consolidate', 
      status: 'success', 
      msg: `${migrated} migradas, ${skipped} saltadas, ${duplicatesFixed} duplicados corregidos, ${processesIntegrated} procesos integrados`
    });

    // ============ PASO 2: ACTUALIZAR REFERENCIAS ============
    execution.steps.push({ step: 'UpdateReferences', status: 'processing', msg: 'Actualizando referencias...' });

    const newMasterMachines = await base44.asServiceRole.entities.MachineMasterDatabase.list('', 500);
    
    const legacyToMasterMap = {};
    newMasterMachines.forEach(m => {
      if (m.machine_id_legacy) {
        legacyToMasterMap[m.machine_id_legacy] = m.id;
      }
    });

    const validMasterIds = new Set(newMasterMachines.map(m => m.id));
    const codeToMasterMap = {};
    newMasterMachines.forEach(m => {
      if (m.codigo_maquina) {
        codeToMasterMap[m.codigo_maquina.toLowerCase()] = m.id;
      }
    });

    let totalUpdated = 0;
    let orphanedRemoved = 0;

    // Actualizar MaintenanceSchedule
    const maintenances = await base44.asServiceRole.entities.MaintenanceSchedule.list('', 500);
    for (const m of maintenances) {
      if (m.machine_id && legacyToMasterMap[m.machine_id]) {
        await base44.asServiceRole.entities.MaintenanceSchedule.update(m.id, {
          machine_id: legacyToMasterMap[m.machine_id]
        });
        totalUpdated++;
      } else if (m.machine_id && !validMasterIds.has(m.machine_id)) {
        const oldMachine = machines.find(x => x.id === m.machine_id);
        if (oldMachine && oldMachine.codigo && codeToMasterMap[oldMachine.codigo.toLowerCase()]) {
          await base44.asServiceRole.entities.MaintenanceSchedule.update(m.id, {
            machine_id: codeToMasterMap[oldMachine.codigo.toLowerCase()]
          });
          totalUpdated++;
        }
      }
    }

    // Actualizar MachineAssignment
    const assignments = await base44.asServiceRole.entities.MachineAssignment.list('', 500);
    for (const a of assignments) {
      if (a.machine_id && legacyToMasterMap[a.machine_id]) {
        await base44.asServiceRole.entities.MachineAssignment.update(a.id, {
          machine_id: legacyToMasterMap[a.machine_id]
        });
        totalUpdated++;
      } else if (a.machine_id && !validMasterIds.has(a.machine_id)) {
        const oldMachine = machines.find(x => x.id === a.machine_id);
        if (oldMachine && oldMachine.codigo && codeToMasterMap[oldMachine.codigo.toLowerCase()]) {
          await base44.asServiceRole.entities.MachineAssignment.update(a.id, {
            machine_id: codeToMasterMap[oldMachine.codigo.toLowerCase()]
          });
          totalUpdated++;
        } else {
          await base44.asServiceRole.entities.MachineAssignment.delete(a.id);
          orphanedRemoved++;
        }
      }
    }

    // Actualizar MachinePlanning
    const plannings = await base44.asServiceRole.entities.MachinePlanning.list('', 500);
    for (const p of plannings) {
      if (p.machine_id && legacyToMasterMap[p.machine_id]) {
        await base44.asServiceRole.entities.MachinePlanning.update(p.id, {
          machine_id: legacyToMasterMap[p.machine_id]
        });
        totalUpdated++;
      } else if (p.machine_id && !validMasterIds.has(p.machine_id)) {
        const oldMachine = machines.find(x => x.id === p.machine_id);
        if (oldMachine && oldMachine.codigo && codeToMasterMap[oldMachine.codigo.toLowerCase()]) {
          await base44.asServiceRole.entities.MachinePlanning.update(p.id, {
            machine_id: codeToMasterMap[oldMachine.codigo.toLowerCase()]
          });
          totalUpdated++;
        }
      }
    }

    execution.steps.push({ 
      step: 'UpdateReferences', 
      status: 'success', 
      msg: `${totalUpdated} referencias actualizadas, ${orphanedRemoved} huérfanas eliminadas`
    });

    // ============ PASO 3: VERIFICAR ============
    execution.steps.push({ step: 'Verify', status: 'processing', msg: 'Verificando integridad...' });

    const finalMachines = await base44.asServiceRole.entities.Machine.list('', 500);
    const finalMaster = await base44.asServiceRole.entities.MachineMasterDatabase.list('', 500);
    const finalAssignments = await base44.asServiceRole.entities.MachineAssignment.list('', 500);
    const finalPlannings = await base44.asServiceRole.entities.MachinePlanning.list('', 500);
    const finalMaint = await base44.asServiceRole.entities.MaintenanceSchedule.list('', 500);

    const finalValidMasterIds = new Set(finalMaster.map(m => m.id));
    const brokenAssignments = finalAssignments.filter(a => a.machine_id && !finalValidMasterIds.has(a.machine_id)).length;
    const brokenPlannings = finalPlannings.filter(p => p.machine_id && !finalValidMasterIds.has(p.machine_id)).length;
    const brokenMaint = finalMaint.filter(m => m.machine_id && !finalValidMasterIds.has(m.machine_id)).length;

    execution.steps.push({ 
      step: 'Verify', 
      status: 'success', 
      msg: `Legacy: ${finalMachines.length}, Master: ${finalMaster.length}, Broken: ${brokenAssignments + brokenPlannings + brokenMaint}`
    });

    execution.success = true;
    execution.completed = new Date().toISOString();
    
    return Response.json({
      success: true,
      execution,
      summary: {
        machines_migrated: migrated,
        machines_skipped: skipped,
        duplicates_fixed: duplicatesFixed,
        processes_integrated: processesIntegrated,
        references_updated: totalUpdated,
        orphaned_removed: orphanedRemoved,
        broken_remaining: brokenAssignments + brokenPlannings + brokenMaint
      }
    });

  } catch (error) {
    execution.errors.push({ error: error.message, stack: error.stack });
    return Response.json({ 
      success: false, 
      execution,
      error: error.message 
    }, { status: 500 });
  }
});