import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    const issues = [];
    const report = {
      committeeMembers: { total: 0, valid: 0, orphaned: 0, samples: [] },
      incentivePlans: { total: 0, active: 0, samples: [] },
      employeeMachineLinks: { total: 0, valid: 0, orphaned: 0, samples: [] }
    };

    // 1. Verificar CommitteeMember
    const committeeMembers = await base44.asServiceRole.entities.CommitteeMember.list(undefined, 200);
    const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 500);
    const employeeIds = new Set(employees.map(e => e.id));

    report.committeeMembers.total = committeeMembers.length;
    
    for (const member of committeeMembers) {
      if (member.employee_id && employeeIds.has(member.employee_id)) {
        report.committeeMembers.valid++;
      } else {
        report.committeeMembers.orphaned++;
        if (report.committeeMembers.samples.length < 3) {
          const employee = employees.find(e => e.id === member.employee_id);
          report.committeeMembers.samples.push({
            memberId: member.id,
            employeeId: member.employee_id,
            employeeName: employee?.nombre || 'NO ENCONTRADO',
            tipos: member.tipos_comite
          });
        }
      }
    }

    // 2. Verificar IncentivePlans
    const incentivePlans = await base44.asServiceRole.entities.IncentivePlan.list(undefined, 100);
    report.incentivePlans.total = incentivePlans.length;
    report.incentivePlans.active = incentivePlans.filter(p => p.activo).length;
    report.incentivePlans.samples = incentivePlans.slice(0, 3).map(p => ({
      id: p.id,
      nombre: p.nombre,
      periodo: p.periodo,
      anio: p.anio,
      activo: p.activo
    }));

    // 3. Verificar asignaciones empleado-máquina en EmployeeMasterDatabase
    const machines = await base44.asServiceRole.entities.MachineMasterDatabase.list(undefined, 500);
    const machineIdsLegacy = new Set(machines.map(m => m.machine_id_legacy).filter(Boolean));
    const machineIdsNew = new Set(machines.map(m => m.id));

    let validLinks = 0;
    let orphanedLinks = 0;
    const linkSamples = [];

    for (const emp of employees) {
      for (let i = 1; i <= 10; i++) {
        const machineId = emp[`maquina_${i}`];
        if (machineId) {
          report.employeeMachineLinks.total++;
          
          // Check if it's a valid new ID or legacy ID that can be mapped
          if (machineIdsNew.has(machineId) || machineIdsLegacy.has(machineId)) {
            validLinks++;
          } else {
            orphanedLinks++;
            if (linkSamples.length < 5) {
              linkSamples.push({
                employee: emp.nombre,
                slot: i,
                machineId: machineId,
                type: 'orphaned'
              });
            }
          }
        }
      }
    }

    report.employeeMachineLinks.valid = validLinks;
    report.employeeMachineLinks.orphaned = orphanedLinks;
    report.employeeMachineLinks.samples = linkSamples;

    // Summary
    if (report.committeeMembers.orphaned > 0) {
      issues.push(`CommitteeMember: ${report.committeeMembers.orphaned} referencias huérfanas`);
    }
    if (report.employeeMachineLinks.orphaned > 0) {
      issues.push(`EmployeeMasterDatabase: ${report.employeeMachineLinks.orphaned} asignaciones de máquinas huérfanas`);
    }

    return Response.json({
      status: 'success',
      summary: {
        totalIssues: issues.length,
        criticalIssues: issues,
        allGood: issues.length === 0
      },
      report
    });

  } catch (error) {
    return Response.json({ 
      status: 'error', 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});