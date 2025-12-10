import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper to process array in chunks to avoid timeouts and rate limits
async function processInChunks(items, chunkSize, processFn) {
  const results = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processFn));
    results.push(...chunkResults);
  }
  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Fetch data with pagination to handle large datasets
    let employees = [];
    let skip = 0;
    const limit = 500;
    while (true) {
      const chunk = await base44.entities.Employee.list(null, limit, skip);
      if (!chunk || chunk.length === 0) break;
      employees = employees.concat(chunk);
      skip += limit;
      if (chunk.length < limit) break;
    }

    let masters = [];
    skip = 0;
    while (true) {
      const chunk = await base44.entities.EmployeeMasterDatabase.list(null, limit, skip);
      if (!chunk || chunk.length === 0) break;
      masters = masters.concat(chunk);
      skip += limit;
      if (chunk.length < limit) break;
    }
    
    // 2. Map existing masters for quick lookup
    const masterByCode = new Map();
    const masterByEmail = new Map();
    const masterByName = new Map();
    const masterByOldId = new Map();

    masters.forEach(m => {
      if (m.codigo_empleado) masterByCode.set(m.codigo_empleado, m);
      if (m.email) masterByEmail.set(m.email.toLowerCase(), m);
      if (m.nombre) masterByName.set(m.nombre.toLowerCase().trim(), m);
      if (m.employee_id) masterByOldId.set(m.employee_id, m);
    });

    const empToMasterMap = {};
    const createdMasters = [];
    const updatedMasters = [];

    // 3. Consolidate Employee into Master (Processing in chunks)
    await processInChunks(employees, 20, async (emp) => {
      let master = masterByOldId.get(emp.id) || 
                   (emp.codigo_empleado ? masterByCode.get(emp.codigo_empleado) : null) ||
                   (emp.email ? masterByEmail.get(emp.email.toLowerCase()) : null) ||
                   (emp.nombre ? masterByName.get(emp.nombre.toLowerCase().trim()) : null);

      if (master) {
        // Update missing fields
        const updates = {};
        let hasUpdates = false;
        
        const fields = [
          'codigo_empleado', 'nombre', 'email', 'telefono_movil', 'departamento', 'puesto', 
          'categoria', 'fecha_alta', 'fecha_nacimiento', 'dni', 'nuss', 'sexo', 'nacionalidad',
          'direccion', 'formacion', 'tipo_jornada', 'num_horas_jornada', 'tipo_turno', 'equipo',
          'tipo_contrato', 'empresa_ett', 'estado_empleado', 'disponibilidad', 'taquilla_vestuario',
          'taquilla_numero', 'maquina_1', 'maquina_2', 'maquina_3'
        ];

        fields.forEach(field => {
          if ((!master[field] || master[field] === "") && emp[field]) {
            updates[field] = emp[field];
            hasUpdates = true;
          }
        });

        if (hasUpdates) {
          await base44.entities.EmployeeMasterDatabase.update(master.id, updates);
          updatedMasters.push(master.id);
        }
        
        empToMasterMap[emp.id] = master.id;
      } else {
        // Create new master
        const newMasterData = { ...emp };
        delete newMasterData.id;
        delete newMasterData.created_date;
        delete newMasterData.updated_date;
        delete newMasterData.created_by;
        
        newMasterData.employee_id = emp.id;
        newMasterData.estado_sincronizacion = "Sincronizado";
        newMasterData.ultimo_sincronizado = new Date().toISOString();

        const newMaster = await base44.entities.EmployeeMasterDatabase.create(newMasterData);
        createdMasters.push(newMaster.id);
        empToMasterMap[emp.id] = newMaster.id;
      }
    });

    // 4. Update references in other entities
    const entitiesToUpdate = [
      { name: 'Absence', field: 'employee_id' },
      { name: 'LockerAssignment', field: 'employee_id' },
      { name: 'ShiftAssignment', field: 'employee_id' },
      { name: 'PerformanceReview', field: 'employee_id' },
      { name: 'EmployeeIncentiveResult', field: 'employee_id' },
      { name: 'UserRoleAssignment', field: 'user_id' },
      { name: 'MaintenanceSchedule', fields: ['tecnico_asignado', 'revisado_por', 'verificado_por', 'creado_por'] },
      { name: 'MachineAssignment', fields: ['operador_1', 'operador_2', 'operador_3', 'operador_4', 'operador_5', 'operador_6', 'operador_7', 'operador_8'], arrayFields: ['responsable_linea', 'segunda_linea'] }
    ];

    const stats = { created: createdMasters.length, updated: updatedMasters.length, referencesUpdated: {} };

    // Process entities sequentially to avoid overwhelming DB, but records within entity in chunks
    for (const entityConfig of entitiesToUpdate) {
      let updatedCount = 0;
      try {
        const records = await base44.entities[entityConfig.name].list();
        
        await processInChunks(records, 20, async (record) => {
          const updates = {};
          let needsUpdate = false;

          // Single field
          if (entityConfig.field) {
            if (empToMasterMap[record[entityConfig.field]]) {
              updates[entityConfig.field] = empToMasterMap[record[entityConfig.field]];
              needsUpdate = true;
            }
          }

          // Multiple fields
          if (entityConfig.fields) {
            entityConfig.fields.forEach(field => {
              if (record[field] && empToMasterMap[record[field]]) {
                updates[field] = empToMasterMap[record[field]];
                needsUpdate = true;
              }
            });
          }

          // Array fields
          if (entityConfig.arrayFields) {
            entityConfig.arrayFields.forEach(field => {
              if (record[field] && Array.isArray(record[field])) {
                const newArray = record[field].map(id => empToMasterMap[id] || id);
                if (JSON.stringify(newArray) !== JSON.stringify(record[field])) {
                  updates[field] = newArray;
                  needsUpdate = true;
                }
              }
            });
          }

          if (needsUpdate) {
            await base44.entities[entityConfig.name].update(record.id, updates);
            updatedCount++;
          }
        });
        
        stats.referencesUpdated[entityConfig.name] = updatedCount;
      } catch (e) {
        console.log(`Skipping entity ${entityConfig.name}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});