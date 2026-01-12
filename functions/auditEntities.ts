import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AUDITORÍA COMPLETA DE ENTIDADES
 * Devuelve el conteo real de registros en cada entidad
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {};
    
    // Lista de entidades a auditar
    const entitiesToAudit = [
      // Empleados
      'Employee',
      'EmployeeMasterDatabase',
      
      // Máquinas
      'Machine',
      'MachineMasterDatabase',
      'MachineProcess',
      'MachineAssignment',
      
      // Comités y PRL
      'Committee',
      'CommitteeMember',
      'IncentivePlan',
      'DepartmentIncentiveConfig',
      'EmployeeIncentiveResult',
      
      // Relaciones y Skills
      'EmployeeSkill',
      'Skill',
      'EmployeeMachine',
      'Assignment',
      
      // Planning y turnos
      'DailyMachinePlanning',
      'MachinePlanning',
      'ShiftAssignment',
      
      // Ausencias
      'Absence',
      'AbsenceType',
      
      // Mantenimiento
      'MaintenanceSchedule',
      'MaintenanceType',
      
      // Procesos
      'Process',
      'WorkOrder'
    ];

    for (const entityName of entitiesToAudit) {
      try {
        const data = await base44.asServiceRole.entities[entityName].list(undefined, 10);
        results[entityName] = {
          exists: true,
          count: Array.isArray(data) ? data.length : 0,
          sample: Array.isArray(data) && data.length > 0 ? data[0] : null,
          hasData: Array.isArray(data) && data.length > 0
        };
      } catch (err) {
        results[entityName] = {
          exists: false,
          error: err.message,
          count: 0,
          hasData: false
        };
      }
    }

    // Análisis especial: buscar campos de relación en Employee y Machine legacy
    const legacyAnalysis = {
      employee_machine_relations: null,
      machine_assignments_found: false
    };

    try {
      const legacyEmployees = await base44.asServiceRole.entities.Employee.list(undefined, 5);
      if (legacyEmployees && legacyEmployees.length > 0) {
        const sampleEmployee = legacyEmployees[0];
        legacyAnalysis.employee_machine_relations = {
          fields: Object.keys(sampleEmployee),
          hasMachineIds: 'machine_ids' in sampleEmployee,
          hasAssignedMachines: 'assigned_machines' in sampleEmployee,
          hasMachines: 'machines' in sampleEmployee,
          sample: sampleEmployee
        };
      }
    } catch (err) {
      legacyAnalysis.employee_machine_relations = { error: err.message };
    }

    // Verificar si MachineAssignment tiene datos
    try {
      const assignments = await base44.asServiceRole.entities.MachineAssignment.list(undefined, 100);
      legacyAnalysis.machine_assignments_found = Array.isArray(assignments) && assignments.length > 0;
      legacyAnalysis.machine_assignments_count = Array.isArray(assignments) ? assignments.length : 0;
      legacyAnalysis.machine_assignments_sample = assignments && assignments.length > 0 ? assignments[0] : null;
    } catch (err) {
      legacyAnalysis.machine_assignments_error = err.message;
    }

    return Response.json({
      status: 'success',
      audit: results,
      legacyAnalysis,
      recommendations: generateRecommendations(results, legacyAnalysis)
    });

  } catch (error) {
    console.error('Audit error:', error);
    return Response.json({ 
      status: 'error', 
      error: error.message 
    }, { status: 500 });
  }
});

function generateRecommendations(results, legacyAnalysis) {
  const recs = [];
  
  // Fuente de verdad para empleados
  if (results.EmployeeMasterDatabase?.hasData && !results.Employee?.hasData) {
    recs.push({
      priority: 'HIGH',
      message: 'EmployeeMasterDatabase es la fuente de verdad (tiene datos). Employee legacy está vacío.',
      action: 'Actualizar todas las páginas a usar EmployeeMasterDatabase'
    });
  } else if (results.Employee?.hasData && results.EmployeeMasterDatabase?.hasData) {
    recs.push({
      priority: 'CRITICAL',
      message: 'Ambas entidades Employee y EmployeeMasterDatabase tienen datos.',
      action: 'URGENTE: Decidir cuál es la fuente de verdad y migrar/consolidar'
    });
  }
  
  // Fuente de verdad para máquinas
  if (results.MachineMasterDatabase?.hasData && !results.Machine?.hasData) {
    recs.push({
      priority: 'HIGH',
      message: 'MachineMasterDatabase es la fuente de verdad (tiene datos). Machine legacy está vacío.',
      action: 'Actualizar todas las páginas a usar MachineMasterDatabase'
    });
  }
  
  // Comités
  if (!results.Committee?.hasData && results.CommitteeMember?.hasData) {
    recs.push({
      priority: 'MEDIUM',
      message: 'CommitteeMember tiene datos pero Committee está vacío.',
      action: 'CommitteeManagement debe consultar CommitteeMember directamente'
    });
  } else if (!results.CommitteeMember?.hasData) {
    recs.push({
      priority: 'LOW',
      message: 'No hay datos de comités configurados.',
      action: 'Mostrar mensaje de "no configurado" en CommitteeManagement'
    });
  }
  
  // Incentivos
  if (!results.IncentivePlan?.hasData) {
    recs.push({
      priority: 'LOW',
      message: 'No hay planes de incentivos configurados.',
      action: 'Mostrar mensaje de "no configurado" en IncentiveManagement'
    });
  }
  
  // Relación empleado-máquina CRÍTICA
  if (legacyAnalysis.machine_assignments_found) {
    recs.push({
      priority: 'HIGH',
      message: `MachineAssignment tiene ${legacyAnalysis.machine_assignments_count} asignaciones.`,
      action: 'Verificar que apuntan a las entidades maestras correctas'
    });
  } else if (legacyAnalysis.employee_machine_relations?.hasMachineIds) {
    recs.push({
      priority: 'CRITICAL',
      message: 'Relación empleado-máquina encontrada en Employee legacy (campo machine_ids).',
      action: 'MIGRAR URGENTE a entidad de relación con maestras'
    });
  } else {
    recs.push({
      priority: 'CRITICAL',
      message: 'No se encontró la relación empleado-máquina en ninguna entidad.',
      action: 'Verificar manualmente dónde están las asignaciones históricas'
    });
  }
  
  return recs;
}