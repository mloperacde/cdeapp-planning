import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Se requieren permisos de administrador' }, { status: 403 });
    }

    // 1. Contar registros en EmployeeMachineSkill
    const allSkills = await base44.asServiceRole.entities.EmployeeMachineSkill.list(undefined, 1000);
    
    // 2. Analizar estructura de campos
    const analysis = {
      totalSkills: allSkills.length,
      withNivel: allSkills.filter(s => s.nivel_competencia).length,
      withNivelHabilidad: allSkills.filter(s => s.nivel_habilidad).length,
      withOrdenPreferencia: allSkills.filter(s => s.orden_preferencia).length,
      sampleRecords: allSkills.slice(0, 3).map(s => ({
        id: s.id,
        employee_id: s.employee_id,
        machine_id: s.machine_id,
        orden_preferencia: s.orden_preferencia,
        nivel_competencia: s.nivel_competencia,
        nivel_habilidad: s.nivel_habilidad
      }))
    };
    
    // 3. Verificar empleados con asignaciones
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 100);
    const employeesWithSkills = employees.filter(emp => 
      allSkills.some(s => s.employee_id === emp.id)
    );
    
    // 4. Verificar si campos legacy tienen datos
    const employeesWithLegacyData = employees.filter(emp => {
      for (let i = 1; i <= 10; i++) {
        if (emp[`maquina_${i}`]) return true;
      }
      return false;
    });

    return Response.json({
      status: 'diagnóstico_completado',
      fecha: new Date().toISOString(),
      análisis_skills: analysis,
      empleados: {
        total: employees.length,
        con_skills_nuevos: employeesWithSkills.length,
        con_datos_legacy: employeesWithLegacyData.length
      },
      recomendación: employeesWithLegacyData.length > 0 
        ? 'Hay datos en campos legacy que deben migrarse a EmployeeMachineSkill'
        : 'Los datos ya están migrados a EmployeeMachineSkill'
    });

  } catch (error) {
    return Response.json({ 
      status: 'error_diagnóstico', 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});