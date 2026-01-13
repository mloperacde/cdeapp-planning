import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Se requieren permisos de administrador' }, { status: 403 });
    }

    const { employee_id } = await req.json();
    
    if (!employee_id) {
      return Response.json({ error: 'employee_id requerido' }, { status: 400 });
    }

    // 1. Cargar empleado
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.filter({ id: employee_id });
    const employee = employees[0];
    
    if (!employee) {
      return Response.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    // 2. Cargar máquinas desde EmployeeMachineSkill
    const machineSkills = await base44.asServiceRole.entities.EmployeeMachineSkill.filter({ employee_id });
    
    // 3. Cargar máquinas desde campos legacy
    const legacyMachines = [];
    for (let i = 1; i <= 10; i++) {
      if (employee[`maquina_${i}`]) {
        legacyMachines.push({
          slot: i,
          machine_id: employee[`maquina_${i}`]
        });
      }
    }
    
    // 4. Cargar ausencias
    const ausencias = await base44.asServiceRole.entities.Absence.filter({ employee_id });
    
    // 5. Cargar info de máquinas
    const allMachines = await base44.asServiceRole.entities.MachineMasterDatabase.list(undefined, 100);
    const machineMap = {};
    allMachines.forEach(m => {
      machineMap[m.id] = m.nombre;
    });

    return Response.json({
      status: 'diagnostico_empleado_completado',
      fecha: new Date().toISOString(),
      empleado: {
        id: employee.id,
        nombre: employee.nombre,
        departamento: employee.departamento,
        puesto: employee.puesto,
        equipo: employee.equipo
      },
      maquinas_employeeMachineSkill: {
        total: machineSkills.length,
        detalle: machineSkills.map(s => ({
          machine_id: s.machine_id,
          machine_name: machineMap[s.machine_id] || 'Desconocida',
          orden_preferencia: s.orden_preferencia,
          nivel_competencia: s.nivel_competencia
        }))
      },
      maquinas_legacy: {
        total: legacyMachines.length,
        detalle: legacyMachines.map(lm => ({
          slot: lm.slot,
          machine_id: lm.machine_id,
          machine_name: machineMap[lm.machine_id] || 'Desconocida'
        }))
      },
      ausencias: {
        total: ausencias.length,
        detalle: ausencias.slice(0, 5).map(a => ({
          id: a.id,
          tipo: a.tipo,
          motivo: a.motivo,
          fecha_inicio: a.fecha_inicio,
          fecha_fin: a.fecha_fin,
          estado: a.estado_aprobacion
        }))
      },
      sincronizacion: {
        maquinas_coinciden: machineSkills.length === legacyMachines.length,
        problemas: machineSkills.length !== legacyMachines.length 
          ? 'Hay discrepancia entre EmployeeMachineSkill y campos legacy'
          : null
      }
    });

  } catch (error) {
    return Response.json({ 
      status: 'error_diagnostico', 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});