import { base44 } from "@/api/base44Client";

export const createTaskForAbsenceApproval = async (absence, employee) => {
  const supervisorAssignments = await base44.entities.UserRoleAssignment.filter({ activo: true });
  const roles = await base44.entities.UserRole.list();
  
  const supervisorRole = roles.find(r => r.role_name?.toLowerCase().includes('supervisor') || r.role_name?.toLowerCase().includes('jefe'));
  const supervisorAssignment = supervisorAssignments.find(a => a.role_id === supervisorRole?.id);

  if (supervisorAssignment) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 3);

    await base44.entities.Task.create({
      titulo: `Aprobar ausencia: ${employee.nombre}`,
      descripcion: `Revisar y aprobar solicitud de ausencia de ${employee.nombre}. Motivo: ${absence.motivo}`,
      tipo: "Aprobación Ausencia",
      prioridad: absence.tipo?.includes("médica") ? "Alta" : "Media",
      estado: "Pendiente",
      asignado_a: supervisorAssignment.user_id,
      fecha_limite: fechaLimite.toISOString().split('T')[0],
      referencia_tipo: "Absence",
      referencia_id: absence.id
    });
  }
};

export const createTaskForMaintenance = async (machine, maintenance) => {
  const maintenanceEmployees = await base44.entities.Employee.filter({ 
    departamento: "MANTENIMIENTO",
    disponibilidad: "Disponible"
  });

  if (maintenanceEmployees.length > 0) {
    await base44.entities.Task.create({
      titulo: `Mantenimiento: ${machine.nombre}`,
      descripcion: `Realizar mantenimiento ${maintenance.tipo} en ${machine.nombre}. ${maintenance.descripcion || ''}`,
      tipo: "Mantenimiento",
      prioridad: maintenance.prioridad === "Alta" ? "Urgente" : "Alta",
      estado: "Pendiente",
      asignado_a: maintenanceEmployees[0].id,
      fecha_limite: maintenance.fecha_programada?.split('T')[0],
      referencia_tipo: "MaintenanceSchedule",
      referencia_id: maintenance.id
    });
  }
};

export const createTaskForExpiringContract = async (employee) => {
  const rrhhAssignments = await base44.entities.UserRoleAssignment.filter({ activo: true });
  const roles = await base44.entities.UserRole.list();
  
  const rrhhRole = roles.find(r => r.role_name?.toLowerCase().includes('rrhh') || r.role_name?.toLowerCase().includes('recursos'));
  const rrhhAssignment = rrhhAssignments.find(a => a.role_id === rrhhRole?.id);

  if (rrhhAssignment) {
    const fechaLimite = new Date(employee.fecha_fin_contrato);
    fechaLimite.setDate(fechaLimite.getDate() - 30);

    await base44.entities.Task.create({
      titulo: `Renovar contrato: ${employee.nombre}`,
      descripcion: `El contrato de ${employee.nombre} vence el ${employee.fecha_fin_contrato}. Revisar y gestionar renovación.`,
      tipo: "Contrato",
      prioridad: "Alta",
      estado: "Pendiente",
      asignado_a: rrhhAssignment.user_id,
      fecha_limite: fechaLimite.toISOString().split('T')[0],
      referencia_tipo: "Employee",
      referencia_id: employee.id
    });
  }
};