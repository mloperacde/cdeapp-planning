import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
  const base44 = createClientFromRequest(req);
  
  try {
    const employees = await base44.entities.Employee.list();
    const masters = await base44.entities.EmployeeMasterDatabase.list();
    
    // Map existing masters for quick lookup
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

    // Consolidate Employee into Master
    for (const emp of employees) {
      let master = masterByOldId.get(emp.id) || 
                   (emp.codigo_empleado ? masterByCode.get(emp.codigo_empleado) : null) ||
                   (emp.email ? masterByEmail.get(emp.email.toLowerCase()) : null) ||
                   (emp.nombre ? masterByName.get(emp.nombre.toLowerCase().trim()) : null);

      if (master) {
        // Update missing fields
        const updates = {};
        let hasUpdates = false;
        
        // List of fields to copy if missing in master
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
        
        // Ensure required fields mapping if names differ, but they seem identical.
        // Add specific master fields
        newMasterData.employee_id = emp.id;
        newMasterData.estado_sincronizacion = "Sincronizado";
        newMasterData.ultimo_sincronizado = new Date().toISOString();

        const newMaster = await base44.entities.EmployeeMasterDatabase.create(newMasterData);
        createdMasters.push(newMaster.id);
        empToMasterMap[emp.id] = newMaster.id;
      }
    }

    // Now update references in other entities
    const entitiesToUpdate = [
      { name: 'Absence', field: 'employee_id' },
      { name: 'LockerAssignment', field: 'employee_id' },
      { name: 'ShiftAssignment', field: 'employee_id' },
      { name: 'PerformanceReview', field: 'employee_id' },
      { name: 'EmployeeIncentiveResult', field: 'employee_id' },
      { name: 'UserRoleAssignment', field: 'user_id' }, // Assuming user_id holds employee id in this context
      { name: 'MaintenanceSchedule', fields: ['tecnico_asignado', 'revisado_por', 'verificado_por', 'creado_por'] },
      { name: 'MachineAssignment', fields: ['operador_1', 'operador_2', 'operador_3', 'operador_4', 'operador_5', 'operador_6', 'operador_7', 'operador_8'], arrayFields: ['responsable_linea', 'segunda_linea'] }
    ];

    const stats = { created: createdMasters.length, updated: updatedMasters.length, referencesUpdated: {} };

    for (const entityConfig of entitiesToUpdate) {
      let updatedCount = 0;
      try {
        const records = await base44.entities[entityConfig.name].list();
        
        for (const record of records) {
          const updates = {};
          let needsUpdate = false;

          // Handle single fields
          if (entityConfig.field) {
            if (empToMasterMap[record[entityConfig.field]]) {
              updates[entityConfig.field] = empToMasterMap[record[entityConfig.field]];
              needsUpdate = true;
            }
          }

          // Handle multiple fields
          if (entityConfig.fields) {
            entityConfig.fields.forEach(field => {
              if (record[field] && empToMasterMap[record[field]]) {
                updates[field] = empToMasterMap[record[field]];
                needsUpdate = true;
              }
            });
          }

          // Handle array fields
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
        }
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
}