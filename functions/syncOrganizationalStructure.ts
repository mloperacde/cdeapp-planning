import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sincroniza cambios bidireccionales entre EmployeeMasterDatabase y la estructura organizativa
 * (Department y Position)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Solo administradores pueden ejecutar sincronización
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { source, changes } = payload; // source: 'structure' | 'master', changes: array

    const normalize = (str) => (str || "").trim().toUpperCase();

    // Obtener datos actuales
    const departments = await base44.asServiceRole.entities.Department.list();
    const positions = await base44.asServiceRole.entities.Position.list();
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list();

    let syncResults = {
      updated: [],
      created: [],
      errors: []
    };

    if (source === 'structure') {
      // Sincronizar cambios desde Structure → Master
      for (const change of changes) {
        try {
          if (change.type === 'department_name_change') {
            // Actualizar todos los empleados con el departamento antiguo
            const empToUpdate = employees.filter(e => 
              normalize(e.departamento) === normalize(change.oldName)
            );
            
            for (const emp of empToUpdate) {
              await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
                departamento: change.newName.toUpperCase()
              });
              syncResults.updated.push({ type: 'employee', id: emp.id, field: 'departamento' });
            }
          } else if (change.type === 'position_name_change') {
            // Actualizar todos los empleados con el puesto antiguo en ese departamento
            const deptName = change.departmentName;
            const empToUpdate = employees.filter(e => 
              normalize(e.departamento) === normalize(deptName) &&
              normalize(e.puesto) === normalize(change.oldName)
            );
            
            for (const emp of empToUpdate) {
              await base44.asServiceRole.entities.EmployeeMasterDatabase.update(emp.id, {
                puesto: change.newName.toUpperCase()
              });
              syncResults.updated.push({ type: 'employee', id: emp.id, field: 'puesto' });
            }
          } else if (change.type === 'department_deleted') {
            // Opcional: marcar empleados como "SIN DEPARTAMENTO" o mantenerlos
            // Por ahora no hacemos nada automático
          }
        } catch (error) {
          syncResults.errors.push({ change, error: error.message });
        }
      }
    } else if (source === 'master') {
      // Sincronizar cambios desde Master → Structure
      for (const change of changes) {
        try {
          if (change.type === 'employee_department_change') {
            // Verificar si el departamento existe
            const newDeptName = change.newDepartment;
            const existingDept = departments.find(d => 
              normalize(d.name) === normalize(newDeptName)
            );
            
            if (!existingDept && newDeptName) {
              // Crear departamento automáticamente
              const newDept = await base44.asServiceRole.entities.Department.create({
                name: newDeptName.toUpperCase(),
                code: newDeptName.substring(0, 3).toUpperCase(),
                color: "#64748b"
              });
              syncResults.created.push({ type: 'department', id: newDept.id, name: newDeptName });
            }
          } else if (change.type === 'employee_position_change') {
            // Verificar si el puesto existe en el departamento
            const deptName = change.departmentName;
            const posName = change.newPosition;
            
            const dept = departments.find(d => normalize(d.name) === normalize(deptName));
            if (dept) {
              const existingPos = positions.find(p => 
                p.department_id === dept.id && 
                normalize(p.name) === normalize(posName)
              );
              
              if (!existingPos && posName) {
                // Crear puesto automáticamente
                const newPos = await base44.asServiceRole.entities.Position.create({
                  name: posName.toUpperCase(),
                  department_id: dept.id,
                  department_name: dept.name,
                  max_headcount: 1,
                  level: "Mid"
                });
                syncResults.created.push({ type: 'position', id: newPos.id, name: posName });
              }
            }
          }
        } catch (error) {
          syncResults.errors.push({ change, error: error.message });
        }
      }
    }

    return Response.json({
      success: true,
      message: 'Sincronización completada',
      results: syncResults
    });

  } catch (error) {
    console.error('Error en sincronización:', error);
    return Response.json({ 
      error: 'Error durante la sincronización',
      details: error.message 
    }, { status: 500 });
  }
});