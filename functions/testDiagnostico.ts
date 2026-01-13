import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Se requieren permisos de administrador' }, { status: 403 });
    }

    const { employeeId } = await req.json();
    
    if (!employeeId) {
      return Response.json({ error: 'Se requiere employeeId' }, { status: 400 });
    }

    // 1. Obtener datos del empleado
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 1000);
    const employee = employees.find(e => e.id === employeeId);
    
    if (!employee) {
      return Response.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    // 2. Obtener skills del empleado
    const allSkills = await base44.asServiceRole.entities.EmployeeMachineSkill.list(undefined, 1000);
    const employeeSkills = allSkills.filter(s => s.employee_id === employeeId);

    // 3. Obtener ausencias del empleado
    const allAbsences = await base44.asServiceRole.entities.Absence.list(undefined, 1000);
    const employeeAbsences = allAbsences.filter(a => a.employee_id === employeeId);

    // 4. Verificar máquinas
    const machines = await base44.asServiceRole.entities.MachineMasterDatabase.list(undefined, 1000);
    const machineDetails = employeeSkills.map(skill => {
      const machine = machines.find(m => m.id === skill.machine_id);
      return {
        skill_id: skill.id,
        machine_id: skill.machine_id,
        machine_nombre: machine?.nombre || 'NO ENCONTRADA',
        orden_preferencia: skill.orden_preferencia,
        nivel_competencia: skill.nivel_competencia
      };
    });

    // 5. Verificar campos legacy
    const legacyMachines = [];
    for (let i = 1; i <= 10; i++) {
      if (employee[`maquina_${i}`]) {
        const machine = machines.find(m => m.id === employee[`maquina_${i}`]);
        legacyMachines.push({
          slot: i,
          machine_id: employee[`maquina_${i}`],
          machine_nombre: machine?.nombre || 'NO ENCONTRADA'
        });
      }
    }

    return Response.json({
      status: 'diagnóstico_completado',
      fecha: new Date().toISOString(),
      empleado: {
        id: employee.id,
        nombre: employee.nombre,
        departamento: employee.departamento,
        puesto: employee.puesto
      },
      máquinas: {
        total_skills: employeeSkills.length,
        detalles: machineDetails,
        legacy_fields: legacyMachines,
        coinciden: employeeSkills.length === legacyMachines.length
      },
      ausencias: {
        total: employeeAbsences.length,
        últimas_5: employeeAbsences
          .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio))
          .slice(0, 5)
          .map(a => ({
            id: a.id,
            tipo: a.tipo,
            motivo: a.motivo,
            fecha_inicio: a.fecha_inicio,
            fecha_fin: a.fecha_fin
          }))
      }
    });

  } catch (error) {
    return Response.json({ 
      status: 'error_diagnóstico', 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});