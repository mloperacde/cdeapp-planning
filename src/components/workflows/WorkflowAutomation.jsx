import { base44 } from "@/api/base44Client";

export const checkAndExecuteWorkflows = async (tipo_flujo, data) => {
  try {
    const rules = await base44.entities.WorkflowRule.filter({ 
      tipo_flujo, 
      activo: true 
    });

    const sortedRules = rules.sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));

    for (const rule of sortedRules) {
      if (evaluateConditions(rule.condiciones, data)) {
        await executeActions(rule.acciones, data);
      }
    }
  } catch (error) {
    console.error("Error executing workflows:", error);
  }
};

const evaluateConditions = (condiciones, data) => {
  if (!condiciones) return false;

  // Evaluar condiciones de ausencias
  if (condiciones.dias_ausencia_mayor_que && data.diasAusencia) {
    if (data.diasAusencia <= condiciones.dias_ausencia_mayor_que) return false;
  }

  if (condiciones.tipo_ausencia && data.tipo_ausencia) {
    if (condiciones.tipo_ausencia !== data.tipo_ausencia) return false;
  }

  // Evaluar condiciones de contratos
  if (condiciones.dias_hasta_vencimiento && data.diasHastaVencimiento !== undefined) {
    if (data.diasHastaVencimiento > condiciones.dias_hasta_vencimiento) return false;
  }

  // Evaluar condiciones de máquinas
  if (condiciones.estado_maquina && data.estado_maquina) {
    if (condiciones.estado_maquina !== data.estado_maquina) return false;
  }

  if (condiciones.horas_uso_mayor_que && data.horas_uso) {
    if (data.horas_uso <= condiciones.horas_uso_mayor_que) return false;
  }

  return true;
};

const executeActions = async (acciones, data) => {
  for (const accion of acciones) {
    try {
      switch (accion.tipo) {
        case "crear_notificacion":
          await createNotification(accion.parametros, data);
          break;
        case "enviar_email":
          await sendEmail(accion.parametros, data);
          break;
        case "crear_tarea_mantenimiento":
          await createMaintenanceTask(accion.parametros, data);
          break;
        case "requerir_aprobacion":
          await requireApproval(accion.parametros, data);
          break;
        default:
          console.log("Acción desconocida:", accion.tipo);
      }
    } catch (error) {
      console.error(`Error ejecutando acción ${accion.tipo}:`, error);
    }
  }
};

const createNotification = async (params, data) => {
  const destinatarios = params.destinatarios || [];
  
  for (const destinatarioRole of destinatarios) {
    const assignments = await base44.entities.UserRoleAssignment.filter({ 
      role_id: destinatarioRole,
      activo: true 
    });

    for (const assignment of assignments) {
      await base44.entities.PushNotification.create({
        destinatario_id: assignment.user_id,
        tipo: params.tipo || "sistema",
        titulo: replaceVariables(params.titulo, data),
        mensaje: replaceVariables(params.mensaje, data),
        prioridad: params.prioridad || "media",
        referencia_tipo: data.referencia_tipo,
        referencia_id: data.referencia_id
      });
    }
  }
};

const sendEmail = async (params, data) => {
  try {
    await base44.integrations.Core.SendEmail({
      to: params.email || data.email,
      subject: replaceVariables(params.asunto, data),
      body: replaceVariables(params.cuerpo, data),
      from_name: params.remitente || "Sistema CdeApp"
    });
  } catch (error) {
    console.error("Error enviando email:", error);
  }
};

const createMaintenanceTask = async (params, data) => {
  const fechaProgramada = new Date();
  fechaProgramada.setDate(fechaProgramada.getDate() + (params.dias_adelante || 7));

  await base44.entities.MaintenanceSchedule.create({
    machine_id: data.machine_id,
    tipo: params.tipo_mantenimiento || "Preventivo",
    descripcion: replaceVariables(params.descripcion, data),
    fecha_programada: fechaProgramada.toISOString(),
    estado: "Pendiente",
    prioridad: params.prioridad || "Media"
  });
};

const requireApproval = async (params, data) => {
  if (data.absence_id) {
    await base44.entities.Absence.update(data.absence_id, {
      estado_aprobacion: "Pendiente",
      requiere_aprobacion_adicional: true,
      niveles_aprobacion_requeridos: params.niveles_aprobacion || ["supervisor", "rrhh"]
    });
  }
};

const replaceVariables = (template, data) => {
  if (!template) return "";
  let result = template;
  Object.keys(data).forEach(key => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), data[key] || "");
  });
  return result;
};

export const checkContractsExpiring = async () => {
  const employees = await base44.entities.Employee.list();
  const now = new Date();
  
  for (const emp of employees) {
    if (emp.fecha_fin_contrato) {
      const endDate = new Date(emp.fecha_fin_contrato);
      const diasHastaVencimiento = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));
      
      if (diasHastaVencimiento >= 0 && diasHastaVencimiento <= 90) {
        await checkAndExecuteWorkflows("contrato", {
          employee_id: emp.id,
          employee_name: emp.nombre,
          diasHastaVencimiento,
          fecha_vencimiento: emp.fecha_fin_contrato,
          referencia_tipo: "Employee",
          referencia_id: emp.id
        });
      }
    }
  }
};

export const checkMaintenanceDue = async () => {
  const machines = await base44.entities.Machine.list();
  
  for (const machine of machines) {
    if (machine.horas_uso && machine.intervalo_mantenimiento_horas) {
      const horasDesdeUltimoMantenimiento = machine.horas_uso - (machine.horas_ultimo_mantenimiento || 0);
      
      if (horasDesdeUltimoMantenimiento >= machine.intervalo_mantenimiento_horas * 0.9) {
        await checkAndExecuteWorkflows("mantenimiento", {
          machine_id: machine.id,
          machine_name: machine.nombre,
          horas_uso: machine.horas_uso,
          estado_maquina: machine.estado,
          referencia_tipo: "Machine",
          referencia_id: machine.id
        });
      }
    }
  }
};