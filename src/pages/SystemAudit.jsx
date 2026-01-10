import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Database,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileWarning,
  Download,
  ArrowLeft,
  Filter,
  Search,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import EntityAuditTab from "../components/audit/EntityAuditTab";
import SecurityAuditTab from "../components/audit/SecurityAuditTab";
import DuplicatesTab from "../components/audit/DuplicatesTab";
import ConsolidationPlan from "../components/audit/ConsolidationPlan";

export default function SystemAudit() {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [executing, setExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState(null);

  useEffect(() => {
    performAudit();
  }, []);

  const performAudit = async () => {
    setLoading(true);
    try {
      // Esta función recopila todos los datos para el análisis
      const entities = await getAllEntitiesMetadata();
      const securityAnalysis = await analyzeSecurityModel();
      const duplicates = await identifyDuplicates(entities);
      const usage = await analyzeEntityUsage(entities);

      setAuditData({
        entities,
        securityAnalysis,
        duplicates,
        usage,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error performing audit:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAllEntitiesMetadata = async () => {
    // Lista de todas las entidades conocidas del sistema
    const entityNames = [
      "Holiday",
      "Vacation",
      "Employee",
      "Machine",
      "BreakShift",
      "ShiftAssignment",
      "TeamConfig",
      "TeamWeekSchedule",
      "MachinePlanning",
      "Process",
      "MachineProcess",
      "Absence",
      "MachineAssignment",
      "MaintenanceSchedule",
      "PerformanceReview",
      "PerformanceImprovementPlan",
      "MaintenanceType",
      "ShiftHandover",
      "NotificationPreference",
      "EmailNotificationConfig",
      "MobileAbsenceRequest",
      "MaintenancePrediction",
      "ShiftSwapRequest",
      "RecurringPlanning",
      "MLPrediction",
      "AbsenceType",
      "DailyProductionPlanning",
      "DailyMaintenancePlanning",
      "DailyWarehousePlanning",
      "DailyQualityPlanning",
      "EmployeeDocument",
      "DashboardWidget",
      "LockerAssignment",
      "LockerRoomConfig",
      "EmployeeOnboarding",
      "TrainingModule",
      "EmployeeTraining",
      "AttendanceRecord",
      "AttendanceConfig",
      "Skill",
      "EmployeeSkill",
      "ProcessSkillRequirement",
      "TrainingNeed",
      "DepartmentPositionSkill",
      "MachinePrediction",
      "CommitteeMember",
      "RiskAssessment",
      "WorkIncident",
      "UnionHoursRecord",
      "EmergencyTeamMember",
      "PRLDocument",
      "AbsenceDaysBalance",
      "Document",
      "ChatChannel",
      "ChatMessage",
      "PushNotification",
      "VacationPendingBalance",
      "AbsenceApprovalFlow",
      "RecurringAbsencePattern",
      "IncentivePlan",
      "DepartmentIncentiveConfig",
      "EmployeeIncentiveResult",
      "MachineStatus",
      "Article",
      "CalendarStyleConfig",
      "EmployeeMasterDatabase",
      "EmployeeSyncHistory",
      "DashboardWidgetConfig",
      "NotificationTemplate",
      "SMSNotificationLog",
      "ProfileChangeRequest",
      "UserFilterPreference",
      "EmployeeAuditLog",
      "Department",
      "Position",
      "AttendanceIncident",
      "WorkOrder",
      "MachineAssignmentAudit",
      "DailyMachineStaffing",
      "Role",
      "UserRole",
      "QualityInspection",
    ];

    const entitiesData = [];

    for (const entityName of entityNames) {
      try {
        const records = await base44.entities[entityName].list();
        const schema = await base44.entities[entityName].schema();

        entitiesData.push({
          name: entityName,
          recordCount: records.length,
          schema: schema,
          category: categorizeEntity(entityName),
          hasRecords: records.length > 0,
          lastUpdate: records.length > 0 ? getLatestUpdate(records) : null,
        });
      } catch (error) {
        entitiesData.push({
          name: entityName,
          recordCount: 0,
          schema: null,
          category: "Unknown",
          hasRecords: false,
          error: error.message,
        });
      }
    }

    return entitiesData;
  };

  const categorizeEntity = (name) => {
    const categories = {
      Core: ["Employee", "Machine", "Department", "Position", "EmployeeMasterDatabase"],
      RRHH: [
        "Vacation",
        "Absence",
        "AbsenceType",
        "Holiday",
        "PerformanceReview",
        "PerformanceImprovementPlan",
        "Skill",
        "EmployeeSkill",
        "TrainingModule",
        "EmployeeTraining",
        "EmployeeOnboarding",
      ],
      Planning: [
        "MachinePlanning",
        "ShiftAssignment",
        "TeamWeekSchedule",
        "DailyMachineStaffing",
        "MachineAssignment",
        "RecurringPlanning",
        "DailyProductionPlanning",
        "DailyMaintenancePlanning",
        "DailyWarehousePlanning",
        "DailyQualityPlanning",
      ],
      Mantenimiento: [
        "MaintenanceSchedule",
        "MaintenanceType",
        "MachineStatus",
        "MaintenancePrediction",
      ],
      Calidad: ["QualityInspection", "WorkOrder"],
      Configuracion: [
        "TeamConfig",
        "BreakShift",
        "Process",
        "MachineProcess",
        "AttendanceConfig",
        "LockerRoomConfig",
        "CalendarStyleConfig",
        "DashboardWidgetConfig",
      ],
      Auditoria: [
        "EmployeeAuditLog",
        "MachineAssignmentAudit",
        "EmployeeSyncHistory",
        "ShiftHandover",
      ],
      Comunicacion: [
        "ChatChannel",
        "ChatMessage",
        "PushNotification",
        "NotificationPreference",
        "EmailNotificationConfig",
        "NotificationTemplate",
        "SMSNotificationLog",
      ],
      Seguridad: ["Role", "UserRole", "ProfileChangeRequest"],
      ML: ["MLPrediction", "MachinePrediction"],
    };

    for (const [category, entities] of Object.entries(categories)) {
      if (entities.includes(name)) return category;
    }
    return "Otros";
  };

  const getLatestUpdate = (records) => {
    if (!records || records.length === 0) return null;
    const dates = records
      .map((r) => r.updated_date || r.created_date)
      .filter(Boolean)
      .sort()
      .reverse();
    return dates[0] || null;
  };

  const identifyDuplicates = async (entities) => {
    // Grupos sospechosos de duplicidad
    return [
      {
        group: "Planificación de Máquinas",
        entities: [
          "MachinePlanning",
          "DailyMachinePlanning",
          "DailyMachineStaffing",
          "MachineAssignment",
        ],
        severity: "high",
        recommendation: "Consolidar en 1-2 entidades principales",
      },
      {
        group: "Ausencias",
        entities: [
          "Absence",
          "AbsenceType",
          "MobileAbsenceRequest",
          "RecurringAbsencePattern",
        ],
        severity: "medium",
        recommendation: "Verificar si MobileAbsenceRequest es necesario como entidad",
      },
      {
        group: "Roles y Usuarios",
        entities: ["Role", "UserRole"],
        severity: "high",
        recommendation: "Usar sistema nativo de Base44 exclusivamente",
      },
      {
        group: "Notificaciones",
        entities: [
          "NotificationPreference",
          "EmailNotificationConfig",
          "PushNotification",
          "SMSNotificationLog",
          "NotificationTemplate",
        ],
        severity: "medium",
        recommendation: "Consolidar configuración de notificaciones",
      },
      {
        group: "Planificación Diaria",
        entities: [
          "DailyProductionPlanning",
          "DailyMaintenancePlanning",
          "DailyWarehousePlanning",
          "DailyQualityPlanning",
        ],
        severity: "low",
        recommendation: "Evaluar si se necesitan entidades separadas por departamento",
      },
    ];
  };

  const analyzeEntityUsage = async (entities) => {
    const unused = entities.filter((e) => e.recordCount === 0);
    const active = entities.filter((e) => e.recordCount > 0);
    const critical = entities.filter(
      (e) => e.category === "Core" || e.recordCount > 100
    );

    return {
      total: entities.length,
      unused: unused.length,
      active: active.length,
      critical: critical.length,
      unusedEntities: unused.map((e) => e.name),
      activeEntities: active.map((e) => ({ name: e.name, count: e.recordCount })),
    };
  };

  const analyzeSecurityModel = async () => {
    // Análisis del modelo de seguridad
    return {
      nativeSystem: {
        status: "Configurado",
        description: "Sistema de permisos nativo de Base44",
        issues: [
          "Permisos demasiado abiertos en entidades críticas",
          "Falta configuración de acceso por rol",
        ],
      },
      customModules: [
        {
          name: "Gestión de Roles",
          entities: ["Role", "UserRole"],
          status: "Duplicado con sistema nativo",
          recommendation: "Migrar al sistema nativo",
        },
      ],
      conflicts: [
        {
          entity: "Employee",
          issue: "Acceso público sin restricciones",
          recommendation: "Configurar permisos basados en rol y departamento",
        },
        {
          entity: "Machine",
          issue: "Sin control de acceso",
          recommendation: "Restringir edición a mantenimiento y administración",
        },
      ],
    };
  };

  const executePhase = async (phaseId) => {
    setExecuting(true);
    try {
      let result;
      
      if (phaseId === "backup") {
        toast.info("Generando backup completo...");
        const response = await base44.functions.invoke("auditBackup", {});
        result = response.data;
        
        // Descargar backup automáticamente
        if (result.success) {
          const blob = new Blob([JSON.stringify(result.backup, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast.success(`Backup completado: ${result.summary.totalRecords} registros exportados`);
        }
      } else if (phaseId === "security") {
        toast.info("Consolidando seguridad...");
        const response = await base44.functions.invoke("consolidateSecurity", {});
        result = response.data;
        toast.success("Análisis de seguridad completado");
      } else if (phaseId === "obsolete") {
        toast.info("Identificando entidades obsoletas...");
        const response = await base44.functions.invoke("markObsoleteEntities", {});
        result = response.data;
        toast.success(`Identificadas ${result.results.obsoleteCount} entidades sin uso`);
      }
      
      setExecutionResults(prev => ({
        ...prev,
        [phaseId]: result
      }));
      
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const exportReport = () => {
    if (!auditData) return;

    const report = {
      timestamp: auditData.timestamp,
      summary: {
        totalEntities: auditData.entities.length,
        unusedEntities: auditData.usage.unused,
        duplicateGroups: auditData.duplicates.length,
        securityIssues: auditData.securityAnalysis.conflicts.length,
      },
      entities: auditData.entities,
      duplicates: auditData.duplicates,
      security: auditData.securityAnalysis,
      executionResults: executionResults || null,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Analizando sistema...</p>
              <p className="text-sm text-slate-500 mt-2">
                Esto puede tardar unos minutos
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!auditData) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Error al realizar la auditoría. Por favor, recarga la página.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Auditoría del Sistema
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Análisis completo de entidades, seguridad y optimización
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Última auditoría: {new Date(auditData.timestamp).toLocaleString("es-ES")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Reporte
            </Button>
            <Button onClick={performAudit}>
              Actualizar Auditoría
            </Button>
          </div>
        </div>

        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Entidades</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {auditData.entities.length}
                  </p>
                </div>
                <Database className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Sin Uso</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {auditData.usage.unused}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Duplicados</p>
                  <p className="text-2xl font-bold text-red-900">
                    {auditData.duplicates.length}
                  </p>
                </div>
                <FileWarning className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Problemas Seguridad</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {auditData.securityAnalysis.conflicts.length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Auditoría */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="entities">Entidades</TabsTrigger>
            <TabsTrigger value="duplicates">Duplicados</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="plan">Plan de Acción</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Resumen Ejecutivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <strong>Atención:</strong> Se han identificado {auditData.usage.unused}{" "}
                    entidades sin registros y {auditData.duplicates.length} grupos de posibles
                    duplicados que requieren revisión.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Entidades Críticas (Mantener)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {auditData.entities
                      .filter((e) => e.category === "Core")
                      .map((entity) => (
                        <div
                          key={entity.name}
                          className="flex items-center gap-2 p-2 bg-green-50 rounded-lg"
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium">{entity.name}</span>
                          <Badge variant="outline" className="ml-auto">
                            {entity.recordCount}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-orange-700">
                    Entidades Inactivas (Candidatas a Eliminar)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {auditData.usage.unusedEntities.slice(0, 9).map((name) => (
                      <div
                        key={name}
                        className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg"
                      >
                        <XCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm">{name}</span>
                      </div>
                    ))}
                  </div>
                  {auditData.usage.unusedEntities.length > 9 && (
                    <p className="text-sm text-slate-500">
                      +{auditData.usage.unusedEntities.length - 9} más...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entities">
            <EntityAuditTab entities={auditData.entities} />
          </TabsContent>

          <TabsContent value="duplicates">
            <DuplicatesTab
              duplicates={auditData.duplicates}
              entities={auditData.entities}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecurityAuditTab securityAnalysis={auditData.securityAnalysis} />
          </TabsContent>

          <TabsContent value="plan">
            <ConsolidationPlan
              auditData={auditData}
              onRefresh={performAudit}
              onExecutePhase={executePhase}
              executing={executing}
              executionResults={executionResults}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}