import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Se requieren permisos de administrador' }, { status: 403 });
    }

    // Obtener datos de prueba
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 10);
    const skills = await base44.asServiceRole.entities.EmployeeMachineSkill.list(undefined, 100);
    const absences = await base44.asServiceRole.entities.Absence.list('-fecha_inicio', 50);
    const machines = await base44.asServiceRole.entities.MachineMasterDatabase.list(undefined, 50);
    
    // Analizar primer empleado con datos
    const employeeWithSkills = employees.find(emp => 
      skills.some(s => s.employee_id === emp.id)
    );
    
    const employeeWithAbsences = employees.find(emp => 
      absences.some(a => a.employee_id === emp.id)
    );

    const resultado = {
      timestamp: new Date().toISOString(),
      resumen: {
        total_empleados: employees.length,
        total_skills: skills.length,
        total_ausencias: absences.length,
        total_maquinas: machines.length
      },
      empleado_con_skills: employeeWithSkills ? {
        id: employeeWithSkills.id,
        nombre: employeeWithSkills.nombre,
        skills_count: skills.filter(s => s.employee_id === employeeWithSkills.id).length,
        skills: skills.filter(s => s.employee_id === employeeWithSkills.id).map(s => ({
          machine_id: s.machine_id,
          machine_name: machines.find(m => m.id === s.machine_id)?.nombre || 'N/A',
          orden: s.orden_preferencia,
          nivel: s.nivel_competencia
        }))
      } : null,
      empleado_con_ausencias: employeeWithAbsences ? {
        id: employeeWithAbsences.id,
        nombre: employeeWithAbsences.nombre,
        ausencias_count: absences.filter(a => a.employee_id === employeeWithAbsences.id).length,
        ausencias: absences.filter(a => a.employee_id === employeeWithAbsences.id).slice(0, 5).map(a => ({
          tipo: a.tipo,
          inicio: a.fecha_inicio,
          fin: a.fecha_fin,
          motivo: a.motivo
        }))
      } : null,
      estado: 'ok'
    };

    return Response.json(resultado);

  } catch (error) {
    return Response.json({ 
      status: 'error', 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});