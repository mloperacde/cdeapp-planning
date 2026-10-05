import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Evaluador de reglas de notificación versátil.
 * Recorre las reglas activas de NotificationRule, evalúa la condición de cada
 * tipo_evento y, si se cumple, envía notificaciones (InApp y/o Email) a los
 * destinatarios configurados.
 *
 * Soporta ejecución manual (admin), bajo demanda (desde la UI) y programada (workflow).
 */

const SCHEDULER_SECRET = 'b44_cde_sched_7f3a9b2e8c1d4a6f5b7c9e1d3a2b4c6';

const isEmptyValue = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (typeof value === 'number' && isNaN(value)) return true;
  return false;
};

const formatDate = (d: Date): string =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

// ─── Handlers por tipo_evento ───
// Cada handler devuelve: { triggered: boolean, resumen: string, datos: object }

async function checkMissingEmployeeData(base44: any, condicion: any) {
  const configKey = 'required_employee_fields';
  const configs = await base44.asServiceRole.entities.AppConfig.filter({ config_key: configKey });
  const configRecord = configs[0];
  if (!configRecord?.value) {
    return { triggered: false, resumen: 'No hay campos obligatorios configurados', datos: {} };
  }
  let requiredFields: string[] = [];
  try {
    const parsed = JSON.parse(configRecord.value);
    requiredFields = Array.isArray(parsed.required_fields) ? parsed.required_fields : [];
  } catch {
    return { triggered: false, resumen: 'Error al leer configuración de campos obligatorios', datos: {} };
  }
  if (requiredFields.length === 0) {
    return { triggered: false, resumen: 'No hay campos obligatorios configurados', datos: {} };
  }

  const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 5000);
  const onlyActive = condicion?.only_active !== false;
  const targetEmployees = onlyActive ? employees.filter((e: any) => e.estado_empleado === 'Alta') : employees;

  const affected: any[] = [];
  for (const emp of targetEmployees) {
    const isFixedShift = emp.tipo_turno === 'Fijo Mañana' || emp.tipo_turno === 'Fijo Tarde';
    const deptLower = (emp.departamento || '').toLowerCase();
    const isTeamDepartment =
      deptLower.includes('producc') ||
      deptLower.includes('mantenim') ||
      deptLower.includes('almac') ||
      deptLower.includes('calidad');
    const missing = requiredFields.filter((fieldKey: string) => {
      if (fieldKey === 'equipo' && (isFixedShift || !isTeamDepartment)) return false;
      return isEmptyValue(emp[fieldKey]);
    });
    if (missing.length > 0) {
      affected.push({ nombre: emp.nombre, codigo: emp.codigo_empleado, missingFields: missing });
    }
  }

  if (affected.length === 0) {
    return { triggered: false, resumen: 'Todos los empleados tienen los datos completos', datos: {} };
  }

  const listaNombres = affected.slice(0, 10).map((a: any) => `${a.nombre} (${a.missingFields.length} campos)`).join(', ');
  const resumen = `${affected.length} empleado(s) con datos faltantes. Primeros: ${listaNombres}${affected.length > 10 ? '...' : ''}`;

  return {
    triggered: true,
    resumen,
    datos: {
      empleados_afectados: affected.length,
      total_revisados: targetEmployees.length,
      lista_empleados: listaNombres,
      detalle: affected,
    },
  };
}

async function checkChronologicalDateInconsistency(base44: any, _condicion: any) {
  const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 5000);
  const affected: any[] = [];

  for (const emp of employees) {
    const issues: string[] = [];
    if (emp.estado_empleado !== 'Baja' && emp.fecha_baja) {
      issues.push('fecha de baja residual');
    }
    if (emp.fecha_alta && emp.fecha_baja && new Date(emp.fecha_baja) < new Date(emp.fecha_alta)) {
      issues.push('baja anterior a alta');
    }
    if (emp.fecha_alta && emp.fecha_fin_contrato && new Date(emp.fecha_fin_contrato) < new Date(emp.fecha_alta)) {
      issues.push('fin de contrato anterior a alta');
    }
    if (emp.fecha_inicio_excedencia && emp.fecha_fin_excedencia &&
        new Date(emp.fecha_fin_excedencia) < new Date(emp.fecha_inicio_excedencia)) {
      issues.push('fin de excedencia anterior a inicio');
    }
    if (issues.length > 0) {
      affected.push({ nombre: emp.nombre, codigo: emp.codigo_empleado, issues });
    }
  }

  if (affected.length === 0) {
    return { triggered: false, resumen: 'No se detectaron inconsistencias cronológicas', datos: {} };
  }

  const listaNombres = affected.slice(0, 10).map((a: any) => `${a.nombre} (${a.issues.join(', ')})`).join(', ');
  const resumen = `${affected.length} empleado(s) con inconsistencias cronológicas. Primeros: ${listaNombres}${affected.length > 10 ? '...' : ''}`;

  return {
    triggered: true,
    resumen,
    datos: {
      empleados_afectados: affected.length,
      total_revisados: employees.length,
      lista_empleados: listaNombres,
      detalle: affected,
    },
  };
}

async function checkContractExpiring(base44: any, condicion: any) {
  const diasUmbral = condicion?.dias_umbral || 30;
  const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 5000);
  const now = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + diasUmbral);

  const affected: any[] = [];
  for (const emp of employees) {
    if (emp.estado_empleado !== 'Alta') continue;
    if (!emp.fecha_fin_contrato) continue;
    const fin = new Date(emp.fecha_fin_contrato);
    if (fin >= now && fin <= limite) {
      const diasRestantes = Math.ceil((fin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      affected.push({ nombre: emp.nombre, codigo: emp.codigo_empleado, fecha_fin: emp.fecha_fin_contrato, dias_restantes: diasRestantes });
    }
  }

  if (affected.length === 0) {
    return { triggered: false, resumen: `No hay contratos que venzan en los próximos ${diasUmbral} días`, datos: {} };
  }

  const listaNombres = affected.slice(0, 10).map((a: any) => `${a.nombre} (en ${a.dias_restantes} días)`).join(', ');
  const resumen = `${affected.length} contrato(s) vencen en los próximos ${diasUmbral} días. Primeros: ${listaNombres}${affected.length > 10 ? '...' : ''}`;

  return {
    triggered: true,
    resumen,
    datos: {
      empleados_afectados: affected.length,
      dias_umbral: diasUmbral,
      lista_empleados: listaNombres,
      detalle: affected,
    },
  };
}

async function checkStaleBajaData(base44: any, _condicion: any) {
  const employees = await base44.asServiceRole.entities.EmployeeMasterDatabase.list(undefined, 5000);
  const affected = employees.filter((e: any) => e.estado_empleado !== 'Baja' && e.fecha_baja);

  if (affected.length === 0) {
    return { triggered: false, resumen: 'No hay fechas de baja obsoletas', datos: {} };
  }

  const listaNombres = affected.slice(0, 10).map((a: any) => a.nombre).join(', ');
  const resumen = `${affected.length} empleado(s) con fecha de baja residual de contratos anteriores. Primeros: ${listaNombres}${affected.length > 10 ? '...' : ''}`;

  return {
    triggered: true,
    resumen,
    datos: {
      empleados_afectados: affected.length,
      lista_empleados: listaNombres,
      detalle: affected.map((a: any) => ({ nombre: a.nombre, codigo: a.codigo_empleado })),
    },
  };
}

const EVENT_HANDLERS: Record<string, (base44: any, condicion: any) => Promise<any>> = {
  missing_employee_data: checkMissingEmployeeData,
  chronological_date_inconsistency: checkChronologicalDateInconsistency,
  contract_expiring: checkContractExpiring,
  stale_baja_data: checkStaleBajaData,
};

// ─── Resolución de destinatarios ───

async function resolveRecipients(base44: any, destinatarios: any[]): Promise<{ emails: string[]; user_emails_inapp: string[] }> {
  const emails = new Set<string>();
  const inAppEmails = new Set<string>();

  for (const dest of destinatarios) {
    if (dest.tipo === 'Email') {
      if (dest.valor) emails.add(dest.valor);
      continue;
    }
    if (dest.tipo === 'Usuario') {
      if (dest.valor) {
        emails.add(dest.valor);
        inAppEmails.add(dest.valor);
      }
      continue;
    }
    if (dest.tipo === 'Rol') {
      const roleValue = (dest.valor || '').toLowerCase();
      const users = await base44.asServiceRole.entities.User.list(undefined, 500);
      for (const u of users) {
        const userRole = (u.role || '').toLowerCase();
        if (userRole === roleValue ||
            (roleValue === 'rrhh' && (userRole === 'rrhh' || userRole === 'hr_manager')) ||
            (roleValue === 'admin' && (userRole === 'admin'))) {
          if (u.email) {
            emails.add(u.email);
            inAppEmails.add(u.email);
          }
        }
      }
    }
  }

  return { emails: [...emails], user_emails_inapp: [...inAppEmails] };
}

// ─── Reemplazo de variables en plantillas ───

function replaceTemplate(template: string, datos: any): string {
  if (!template) return '';
  let result = template;
  for (const [key, value] of Object.entries(datos)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  result = result.replace(/\{\{fecha\}\}/g, formatDate(new Date()));
  return result;
}

// ─── Envío de notificaciones ───

async function sendNotifications(base44: any, rule: any, evalResult: any) {
  const { emails, user_emails_inapp } = await resolveRecipients(base44, rule.destinatarios || []);
  const asunto = replaceTemplate(rule.asunto || 'Notificación del sistema', evalResult.datos);
  const mensaje = replaceTemplate(rule.plantilla_mensaje || rule.descripcion || evalResult.resumen, evalResult.datos);
  const enviados: { inapp: number; email: number } = { inapp: 0, email: 0 };

  // InApp (PushNotification)
  if ((rule.canales || []).includes('InApp')) {
    for (const userEmail of user_emails_inapp) {
      try {
        await base44.asServiceRole.entities.PushNotification.create({
          user_email: userEmail,
          tipo: 'Alerta Sistema',
          prioridad: 'Media',
          titulo: asunto,
          mensaje,
          leida: false,
          enlace: rule.enlace || null,
          icono: 'Bell',
          datos_relacionados: { rule_id: rule.id, ...evalResult.datos },
        });
        enviados.inapp++;
      } catch (e) {
        console.warn('Error creating PushNotification:', e);
      }
    }
  }

  // Email
  if ((rule.canales || []).includes('Email') && emails.length > 0) {
    for (const email of emails) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: asunto,
          body: mensaje,
        });
        enviados.email++;
      } catch (e) {
        console.warn('Error sending email:', e);
      }
    }
  }

  return enviados;
}

// ─── Handler principal ───

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Autenticación: admin manual, o scheduler
    const isSchedulerCall = body._scheduler_secret === SCHEDULER_SECRET;
    let triggeredBy = 'scheduled';

    try {
      const user = await base44.auth.me();
      if (user) {
        const userRole = (user.role || '').toLowerCase();
        if (userRole !== 'admin') {
          return Response.json({ error: 'Solo administradores pueden ejecutar esta tarea' }, { status: 403 });
        }
        triggeredBy = 'manual';
      } else if (!isSchedulerCall) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } catch (_) {
      if (!isSchedulerCall) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Cargar reglas
    let rules: any[];
    if (body.rule_id) {
      const rule = await base44.asServiceRole.entities.NotificationRule.get(body.rule_id);
      rules = rule ? [rule] : [];
    } else {
      rules = await base44.asServiceRole.entities.NotificationRule.list(undefined, 500);
      // Filtrar solo activas si no se especifica force_all
      if (!body.force_all) {
        rules = rules.filter((r: any) => r.activo !== false);
      }
    }

    const results: any[] = [];

    for (const rule of rules) {
      const handler = EVENT_HANDLERS[rule.tipo_evento];
      if (!handler) {
        results.push({
          rule_id: rule.id,
          nombre: rule.nombre,
          error: `Tipo de evento no soportado: ${rule.tipo_evento}`,
        });
        continue;
      }

      try {
        const evalResult = await handler(base44, rule.condicion || {});

        let enviados = { inapp: 0, email: 0 };
        if (evalResult.triggered) {
          enviados = await sendNotifications(base44, rule, evalResult);
        }

        const resultado = {
          triggered: evalResult.triggered,
          resumen: evalResult.resumen,
          datos: evalResult.datos,
          enviados,
          evaluado_en: new Date().toISOString(),
        };

        // Actualizar la regla con el resultado
        await base44.asServiceRole.entities.NotificationRule.update(rule.id, {
          ultima_ejecucion: new Date().toISOString(),
          resultado_ultima_ejecucion: resultado,
        });

        results.push({
          rule_id: rule.id,
          nombre: rule.nombre,
          tipo_evento: rule.tipo_evento,
          triggered: evalResult.triggered,
          resumen: evalResult.resumen,
          enviados,
        });
      } catch (error) {
        results.push({
          rule_id: rule.id,
          nombre: rule.nombre,
          error: error.message,
        });
      }
    }

    return Response.json({
      triggered_by: triggeredBy,
      rules_evaluated: results.length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}