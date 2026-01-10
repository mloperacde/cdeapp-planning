import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  ClipboardCheck,
} from "lucide-react";

export default function ConsolidationPlan({ auditData, onRefresh }) {
  const [selectedActions, setSelectedActions] = useState([]);

  const planSteps = [
    {
      id: "audit",
      phase: "FASE 1",
      title: "Auditoría y Planificación",
      status: "completed",
      description: "Análisis completo del sistema realizado",
      actions: [
        "✅ Inventario de entidades completado",
        "✅ Identificación de duplicados",
        "✅ Análisis de seguridad",
        "✅ Plan de consolidación generado",
      ],
    },
    {
      id: "backup",
      phase: "FASE 2",
      title: "Respaldo y Preparación",
      status: "pending",
      description: "Asegurar integridad de datos antes de cambios",
      actions: [
        "Exportar todos los datos a CSV/JSON",
        "Documentar relaciones entre entidades",
        "Crear copia de seguridad completa",
        "Notificar a usuarios sobre mantenimiento planificado",
      ],
    },
    {
      id: "rename",
      phase: "FASE 3",
      title: "Renombrar Entidades Duplicadas",
      status: "pending",
      description: "Marcar entidades para eliminación sin perder datos",
      actions: [
        "Renombrar MachinePlanning → _OLD_MachinePlanning",
        "Renombrar DailyMachineStaffing → _OLD_DailyMachineStaffing",
        "Renombrar Role → _OLD_Role",
        "Renombrar UserRole → _OLD_UserRole",
      ],
    },
    {
      id: "consolidate",
      phase: "FASE 4",
      title: "Consolidación de Datos",
      status: "pending",
      description: "Unificar datos en entidades principales",
      actions: [
        "Migrar datos de MachinePlanning a DailyMachinePlanning",
        "Consolidar notificaciones en configuración única",
        "Migrar roles personalizados al sistema nativo de Base44",
        "Actualizar referencias en código",
      ],
    },
    {
      id: "security",
      phase: "FASE 5",
      title: "Configuración de Seguridad",
      status: "pending",
      description: "Establecer permisos en sistema nativo",
      actions: [
        "Configurar roles en Base44 (Admin, Manager, User, ReadOnly)",
        "Establecer permisos por entidad y operación",
        "Migrar usuarios al sistema de seguridad nativo",
        "Probar accesos por rol",
      ],
    },
    {
      id: "testing",
      phase: "FASE 6",
      title: "Periodo de Prueba",
      status: "pending",
      description: "Validar funcionamiento durante 2 semanas",
      actions: [
        "Ejecutar casos de prueba en todos los módulos",
        "Monitorear logs de errores",
        "Recopilar feedback de usuarios",
        "Ajustar configuraciones según sea necesario",
      ],
    },
    {
      id: "cleanup",
      phase: "FASE 7",
      title: "Limpieza Final",
      status: "pending",
      description: "Eliminar entidades obsoletas",
      actions: [
        "Eliminar entidades _OLD_* si pruebas son exitosas",
        "Remover módulos de permisos personalizados",
        "Limpiar entidades sin uso (0 registros)",
        "Actualizar documentación",
      ],
    },
  ];

  const priorityActions = [
    {
      id: "security-critical",
      title: "CRÍTICO: Configurar Seguridad en Entidades Core",
      description:
        "Inmediatamente restringir acceso a Employee, Machine, Absence según rol",
      priority: "critical",
      entities: ["Employee", "Machine", "Absence", "MaintenanceSchedule"],
    },
    {
      id: "duplicate-planning",
      title: "Alta: Consolidar Planificación de Máquinas",
      description: "Unificar 4 entidades en 1-2 principales para evitar confusión",
      priority: "high",
      entities: [
        "MachinePlanning",
        "DailyMachinePlanning",
        "DailyMachineStaffing",
        "MachineAssignment",
      ],
    },
    {
      id: "duplicate-roles",
      title: "Alta: Migrar a Sistema de Roles Nativo",
      description: "Eliminar duplicidad con sistema de seguridad de Base44",
      priority: "high",
      entities: ["Role", "UserRole"],
    },
    {
      id: "unused-entities",
      title: "Media: Eliminar Entidades Sin Uso",
      description: `Remover ${auditData.usage.unused} entidades sin registros`,
      priority: "medium",
      entities: auditData.usage.unusedEntities.slice(0, 5),
    },
  ];

  const getStatusColor = (status) => {
    return {
      completed: "bg-green-100 text-green-800",
      pending: "bg-slate-100 text-slate-800",
      "in-progress": "bg-blue-100 text-blue-800",
    }[status];
  };

  const getPriorityColor = (priority) => {
    return {
      critical: "border-red-500 bg-red-50",
      high: "border-orange-500 bg-orange-50",
      medium: "border-yellow-500 bg-yellow-50",
      low: "border-blue-500 bg-blue-50",
    }[priority];
  };

  const downloadPlan = () => {
    const planText = `
PLAN DE CONSOLIDACIÓN Y OPTIMIZACIÓN
Generado: ${new Date().toLocaleString("es-ES")}

═══════════════════════════════════════════════════════════════
RESUMEN EJECUTIVO
═══════════════════════════════════════════════════════════════
Total de Entidades: ${auditData.entities.length}
Entidades Sin Uso: ${auditData.usage.unused}
Grupos de Duplicados: ${auditData.duplicates.length}
Problemas de Seguridad: ${auditData.securityAnalysis.conflicts.length}

═══════════════════════════════════════════════════════════════
PLAN DE ACCIÓN
═══════════════════════════════════════════════════════════════

${planSteps
  .map(
    (step) => `
${step.phase}: ${step.title}
Estado: ${step.status.toUpperCase()}
${step.description}

Acciones:
${step.actions.map((action) => `  • ${action}`).join("\n")}
`
  )
  .join("\n")}

═══════════════════════════════════════════════════════════════
ACCIONES PRIORITARIAS
═══════════════════════════════════════════════════════════════

${priorityActions
  .map(
    (action) => `
[${action.priority.toUpperCase()}] ${action.title}
${action.description}
Entidades afectadas: ${action.entities.join(", ")}
`
  )
  .join("\n")}

═══════════════════════════════════════════════════════════════
ENTIDADES A MANTENER (CORE)
═══════════════════════════════════════════════════════════════
${auditData.entities
  .filter((e) => e.category === "Core")
  .map((e) => `✅ ${e.name} (${e.recordCount} registros)`)
  .join("\n")}

═══════════════════════════════════════════════════════════════
ENTIDADES A ELIMINAR (SIN USO)
═══════════════════════════════════════════════════════════════
${auditData.usage.unusedEntities.map((name) => `❌ ${name}`).join("\n")}

═══════════════════════════════════════════════════════════════
DUPLICADOS IDENTIFICADOS
═══════════════════════════════════════════════════════════════
${auditData.duplicates
  .map(
    (dup) => `
Grupo: ${dup.group} [${dup.severity.toUpperCase()}]
Entidades: ${dup.entities.join(", ")}
Recomendación: ${dup.recommendation}
`
  )
  .join("\n")}

IMPORTANTE: Este documento es un plan de acción. No ejecutar cambios
sin aprobación previa y respaldo completo de datos.
    `.trim();

    const blob = new Blob([planText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consolidation-plan-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Importante:</strong> Este es un plan de acción sin ejecución. Todos
          los cambios deben ser aprobados y ejecutados manualmente con respaldo previo
          de datos.
        </AlertDescription>
      </Alert>

      {/* Acciones Prioritarias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Acciones Prioritarias (Ejecutar Primero)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {priorityActions.map((action) => (
            <div
              key={action.id}
              className={`p-4 border-2 rounded-lg ${getPriorityColor(
                action.priority
              )}`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{action.title}</h3>
                <Badge
                  className={
                    action.priority === "critical"
                      ? "bg-red-600"
                      : action.priority === "high"
                      ? "bg-orange-600"
                      : "bg-yellow-600"
                  }
                >
                  {action.priority === "critical"
                    ? "CRÍTICO"
                    : action.priority === "high"
                    ? "ALTO"
                    : "MEDIO"}
                </Badge>
              </div>
              <p className="text-sm mb-3">{action.description}</p>
              <div className="flex flex-wrap gap-2">
                {action.entities.map((entity) => (
                  <Badge key={entity} variant="outline">
                    {entity}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Plan por Fases */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              Plan de Ejecución por Fases
            </CardTitle>
            <Button onClick={downloadPlan} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Descargar Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {planSteps.map((step, idx) => (
            <div key={step.id} className="relative">
              {idx < planSteps.length - 1 && (
                <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-slate-200"></div>
              )}
              <div className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    step.status === "completed"
                      ? "bg-green-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {step.status === "completed" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="font-bold text-sm">{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-600">{step.phase}</Badge>
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <Badge className={getStatusColor(step.status)}>
                      {step.status === "completed"
                        ? "Completado"
                        : step.status === "in-progress"
                        ? "En Progreso"
                        : "Pendiente"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{step.description}</p>
                  <ul className="space-y-2">
                    {step.actions.map((action, actionIdx) => (
                      <li key={actionIdx} className="flex items-start gap-2 text-sm">
                        {action.startsWith("✅") ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded border-2 border-slate-300 mt-0.5 flex-shrink-0"></div>
                        )}
                        <span>{action.replace("✅ ", "")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notas Importantes */}
      <Card className="border-2 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <FileText className="w-5 h-5" />
            Notas Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-amber-900">
          <p>
            • <strong>Nunca eliminar directamente:</strong> Siempre renombrar primero
            con prefijo _OLD_ o _TO_DELETE_
          </p>
          <p>
            • <strong>Periodo de prueba:</strong> Mantener datos duplicados durante 2
            semanas antes de eliminar
          </p>
          <p>
            • <strong>Respaldo obligatorio:</strong> Exportar todos los datos antes de
            cualquier cambio
          </p>
          <p>
            • <strong>Documentación:</strong> Actualizar documentación técnica después de
            cada fase
          </p>
          <p>
            • <strong>Rollback plan:</strong> Tener un plan de reversión para cada fase
          </p>
        </CardContent>
      </Card>
    </div>
  );
}