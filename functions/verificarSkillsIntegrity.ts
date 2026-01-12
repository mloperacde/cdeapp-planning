import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Se requieren permisos de administrador' }, { status: 403 });
    }
    
    // Verificar integridad de datos
    const allSkills = await base44.asServiceRole.entities.EmployeeMachineSkill.list(undefined, 1000);
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 100);
    
    // Verificar que cada empleado tenga datos consistentes
    const verificaciones = employees.map(emp => {
      const skills = allSkills.filter(s => s.employee_id === emp.id);
      const legacyMachines = [];
      
      for (let i = 1; i <= 10; i++) {
        if (emp[`maquina_${i}`]) legacyMachines.push(emp[`maquina_${i}`]);
      }
      
      const skillMachines = skills.map(s => s.machine_id);
      
      return {
        empleado: emp.nombre,
        id: emp.id,
        skills_count: skills.length,
        legacy_machines_count: legacyMachines.length,
        coinciden: JSON.stringify(skillMachines.sort()) === JSON.stringify(legacyMachines.sort()),
        issues: skills.filter(s => !s.nivel_competencia || !s.orden_preferencia).length
      };
    });
    
    const empleadosConProblemas = verificaciones.filter(v => !v.coinciden || v.issues > 0);
    
    return Response.json({
      status: 'verificación_completada',
      fecha: new Date().toISOString(),
      resumen: {
        total_empleados: employees.length,
        total_skills: allSkills.length,
        empleados_con_skills: verificaciones.filter(v => v.skills_count > 0).length,
        empleados_con_problemas: empleadosConProblemas.length,
        skills_sin_normalizar: allSkills.filter(s => !s.nivel_competencia || !s.orden_preferencia).length
      },
      problemas: empleadosConProblemas.slice(0, 10),
      recomendaciones: empleadosConProblemas.length > 0 
        ? 'Ejecutar script de normalización nuevamente'
        : 'Todos los datos están sincronizados correctamente'
    });
    
  } catch (error) {
    return Response.json({ 
      status: 'error_verificación', 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});