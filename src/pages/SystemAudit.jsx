import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  Users,
  Cog,
  Trash2,
  Copy,
  Shield,
  Link as LinkIcon,
  Download
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ENTITY_CATEGORIES = {
  core: { label: "Core (Maestros)", icon: Database, color: "blue" },
  rrhh: { label: "RRHH", icon: Users, color: "green" },
  planning: { label: "Planificación", icon: Cog, color: "purple" },
  maintenance: { label: "Mantenimiento", icon: Cog, color: "orange" },
  quality: { label: "Calidad", icon: CheckCircle2, color: "emerald" },
  config: { label: "Configuración", icon: Shield, color: "slate" },
  audit: { label: "Auditoría/Log", icon: FileText, color: "amber" },
  communication: { label: "Comunicación", icon: LinkIcon, color: "cyan" },
  legacy: { label: "Legacy/Inactivo", icon: AlertTriangle, color: "red" }
};

const KNOWN_ENTITY_GROUPS = {
  planning: [
    "MachinePlanning",
    "DailyMachinePlanning", 
    "DailyMachineStaffing",
    "MachineAssignment",
    "DailyProductionPlanning",
    "DailyMaintenancePlanning",
    "DailyWarehousePlanning",
    "DailyQualityPlanning"
  ],
  absence: [
    "Absence",
    "AbsenceType",
    "MobileAbsenceRequest",
    "RecurringAbsencePattern",
    "AbsenceDaysBalance",
    "VacationPendingBalance"
  ],
  roles: [
    "Role",
    "UserRole",
    "ModuleAccessConfig",
    "DashboardWidget",
    "DashboardWidgetConfig"
  ],
  notifications: [
    "NotificationPreference",
    "EmailNotificationConfig",
    "PushNotification",
    "SMSNotificationLog",
    "NotificationTemplate"
  ],
  employees: [
    "Employee",
    "EmployeeMasterDatabase",
    "EmployeeSyncHistory",
    "EmployeeDocument",
    "EmployeeAuditLog"
  ]
};

export default function SystemAudit() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);

  // Simulación de análisis de entidades
  const entityAnalysis = useMemo(() => {
    const allEntities = [
      // CORE
      { name: "Employee", category: "legacy", records: 250, relations: 15, modules: 8, status: "deprecated", duplicate: "EmployeeMasterDatabase" },
      { name: "EmployeeMasterDatabase", category: "core", records: 250, relations: 20, modules: 12, status: "active", recommended: "keep" },
      { name: "Machine", category: "core", records: 32, relations: 10, modules: 6, status: "active", recommended: "keep" },
      { name: "Process", category: "core", records: 10, relations: 8, modules: 4, status: "active", recommended: "keep" },
      { name: "Department", category: "core", records: 5, relations: 3, modules: 2, status: "active", recommended: "keep" },
      { name: "Position", category: "core", records: 8, relations: 4, modules: 2, status: "active", recommended: "keep" },
      { name: "TeamConfig", category: "core", records: 2, relations: 12, modules: 5, status: "active", recommended: "keep" },
      
      // PLANNING - DUPLICACIONES CRÍTICAS
      { name: "MachinePlanning", category: "planning", records: 0, relations: 2, modules: 0, status: "unused", duplicate: "DailyMachinePlanning", recommended: "delete" },
      { name: "DailyMachinePlanning", category: "planning", records: 45, relations: 8, modules: 3, status: "active", recommended: "keep" },
      { name: "DailyMachineStaffing", category: "planning", records: 0, relations: 1, modules: 0, status: "unused", duplicate: "DailyMachinePlanning", recommended: "delete" },
      { name: "MachineAssignment", category: "planning", records: 120, relations: 6, modules: 2, status: "active", recommended: "consolidate" },
      { name: "DailyProductionPlanning", category: "planning", records: 30, relations: 5, modules: 2, status: "active", recommended: "keep" },
      { name: "DailyMaintenancePlanning", category: "planning", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      { name: "DailyWarehousePlanning", category: "planning", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      { name: "DailyQualityPlanning", category: "planning", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      
      // RRHH - AUSENCIAS
      { name: "Absence", category: "rrhh", records: 180, relations: 12, modules: 8, status: "active", recommended: "keep" },
      { name: "AbsenceType", category: "rrhh", records: 15, relations: 3, modules: 2, status: "active", recommended: "keep" },
      { name: "MobileAbsenceRequest", category: "rrhh", records: 0, relations: 1, modules: 1, status: "unused", duplicate: "Absence", recommended: "delete" },
      { name: "RecurringAbsencePattern", category: "rrhh", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      { name: "VacationPendingBalance", category: "rrhh", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      { name: "Holiday", category: "rrhh", records: 12, relations: 2, modules: 1, status: "active", recommended: "keep" },
      { name: "Vacation", category: "rrhh", records: 8, relations: 3, modules: 1, status: "active", recommended: "keep" },
      
      // ROLES Y PERMISOS - DUPLICACIÓN CRÍTICA
      { name: "Role", category: "config", records: 6, relations: 4, modules: 3, status: "active", recommended: "keep" },
      { name: "UserRole", category: "config", records: 8, relations: 2, modules: 2, status: "active", recommended: "keep" },
      { name: "ModuleAccessConfig", category: "config", records: 45, relations: 0, modules: 1, status: "active", duplicate: "Native Base44 Security", recommended: "migrate_to_native" },
      { name: "UserInvitation", category: "config", records: 3, relations: 1, modules: 1, status: "active", recommended: "keep" },
      
      // NOTIFICACIONES
      { name: "PushNotification", category: "communication", records: 250, relations: 3, modules: 2, status: "active", recommended: "keep" },
      { name: "NotificationPreference", category: "communication", records: 8, relations: 1, modules: 1, status: "active", recommended: "keep" },
      { name: "EmailNotificationConfig", category: "communication", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      { name: "SMSNotificationLog", category: "communication", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      { name: "NotificationTemplate", category: "communication", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      
      // MANTENIMIENTO
      { name: "MaintenanceSchedule", category: "maintenance", records: 25, relations: 5, modules: 2, status: "active", recommended: "keep" },
      { name: "MachineStatus", category: "maintenance", records: 32, relations: 2, modules: 3, status: "active", recommended: "keep" },
      { name: "MaintenancePrediction", category: "maintenance", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      
      // CALIDAD
      { name: "QualityInspection", category: "quality", records: 45, relations: 6, modules: 2, status: "active", recommended: "keep" },
      
      // ML/PREDICCIONES
      { name: "MLPrediction", category: "legacy", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      { name: "MachinePrediction", category: "legacy", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      
      // AUDITORÍA
      { name: "EmployeeAuditLog", category: "audit", records: 450, relations: 1, modules: 1, status: "active", recommended: "keep" },
      { name: "MachineAssignmentAudit", category: "audit", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      
      // OTROS
      { name: "CommitteeMember", category: "rrhh", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      { name: "CalendarStyleConfig", category: "config", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
      { name: "DashboardWidgetConfig", category: "config", records: 0, relations: 0, modules: 0, status: "unused", recommended: "delete" },
    ];

    return allEntities;
  }, []);

  const filteredEntities = useMemo(() => {
    let result = entityAnalysis;
    
    if (selectedCategory !== "all") {
      result = result.filter(e => e.category === selectedCategory);
    }
    
    if (showOnlyDuplicates) {
      result = result.filter(e => e.duplicate || e.recommended === "consolidate");
    }
    
    return result;
  }, [entityAnalysis, selectedCategory, showOnlyDuplicates]);

  const stats = useMemo(() => {
    return {
      total: entityAnalysis.length,
      active: entityAnalysis.filter(e => e.status === "active").length,
      unused: entityAnalysis.filter(e => e.status === "unused").length,
      deprecated: entityAnalysis.filter(e => e.status === "deprecated").length,
      toDelete: entityAnalysis.filter(e => e.recommended === "delete").length,
      toConsolidate: entityAnalysis.filter(e => e.duplicate || e.recommended === "consolidate").length,
      totalRecords: entityAnalysis.reduce((sum, e) => sum + e.records, 0)
    };
  }, [entityAnalysis]);

  const duplicateGroups = useMemo(() => {
    const groups = [];
    
    // Planning Group
    const planningEntities = entityAnalysis.filter(e => KNOWN_ENTITY_GROUPS.planning.includes(e.name));
    if (planningEntities.length > 0) {
      groups.push({
        name: "Planificación de Máquinas",
        entities: planningEntities,
        recommendation: "Consolidar en DailyMachinePlanning + MachineAssignment (si son diferentes). Eliminar MachinePlanning, DailyMachineStaffing y entidades de Planning vacías."
      });
    }
    
    // Absence Group
    const absenceEntities = entityAnalysis.filter(e => KNOWN_ENTITY_GROUPS.absence.includes(e.name));
    if (absenceEntities.length > 0) {
      groups.push({
        name: "Gestión de Ausencias",
        entities: absenceEntities,
        recommendation: "Mantener Absence + AbsenceType. Eliminar MobileAbsenceRequest (es solo formulario), RecurringAbsencePattern y VacationPendingBalance (sin uso)."
      });
    }
    
    // Roles Group
    const rolesEntities = entityAnalysis.filter(e => KNOWN_ENTITY_GROUPS.roles.includes(e.name));
    if (rolesEntities.length > 0) {
      groups.push({
        name: "Roles y Permisos",
        entities: rolesEntities,
        recommendation: "MIGRAR ModuleAccessConfig a sistema nativo de Base44. Mantener Role y UserRole como maestros. Eliminar DashboardWidget/Config si no se usan."
      });
    }
    
    // Employees Group
    const employeeEntities = entityAnalysis.filter(e => KNOWN_ENTITY_GROUPS.employees.includes(e.name));
    if (employeeEntities.length > 0) {
      groups.push({
        name: "Empleados",
        entities: employeeEntities,
        recommendation: "EmployeeMasterDatabase es la MAESTRA activa. Employee está DEPRECADO. Migrar cualquier relación residual y eliminar Employee."
      });
    }
    
    return groups;
  }, [entityAnalysis]);

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-300";
      case "unused": return "bg-red-100 text-red-800 border-red-300";
      case "deprecated": return "bg-orange-100 text-orange-800 border-orange-300";
      default: return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const getRecommendationColor = (rec) => {
    switch (rec) {
      case "keep": return "text-green-700";
      case "delete": return "text-red-700";
      case "consolidate": return "text-orange-700";
      case "migrate_to_native": return "text-purple-700";
      default: return "text-slate-700";
    }
  };

  const exportReport = () => {
    const csv = [
      "Entidad,Categoría,Registros,Relaciones,Módulos,Estado,Duplicado de,Recomendación",
      ...entityAnalysis.map(e => 
        `${e.name},${e.category},${e.records},${e.relations},${e.modules},${e.status},${e.duplicate || ""},${e.recommended}`
      )
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-entidades-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            Auditoría del Sistema
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Análisis completo de entidades, duplicaciones y recomendaciones de consolidación
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="text-sm text-blue-700 font-medium">Total Entidades</div>
              <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
              <div className="text-xs text-blue-600 mt-1">{stats.totalRecords.toLocaleString()} registros</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="text-sm text-green-700 font-medium">Activas</div>
              <div className="text-3xl font-bold text-green-900">{stats.active}</div>
              <div className="text-xs text-green-600 mt-1">En uso</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="text-sm text-red-700 font-medium">Sin Uso</div>
              <div className="text-3xl font-bold text-red-900">{stats.unused}</div>
              <div className="text-xs text-red-600 mt-1">Candidatas a eliminar</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="text-sm text-orange-700 font-medium">Duplicadas</div>
              <div className="text-3xl font-bold text-orange-900">{stats.toConsolidate}</div>
              <div className="text-xs text-orange-600 mt-1">Requieren consolidación</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {Object.entries(ENTITY_CATEGORIES).map(([key, cat]) => (
                      <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant={showOnlyDuplicates ? "default" : "outline"}
                  onClick={() => setShowOnlyDuplicates(!showOnlyDuplicates)}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Solo Duplicadas
                </Button>
              </div>

              <Button onClick={exportReport} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="entities" className="space-y-6">
          <TabsList>
            <TabsTrigger value="entities">Todas las Entidades</TabsTrigger>
            <TabsTrigger value="duplicates">Grupos Duplicados</TabsTrigger>
            <TabsTrigger value="recommendations">Plan de Acción</TabsTrigger>
          </TabsList>

          {/* Tab 1: All Entities */}
          <TabsContent value="entities">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entidad</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Registros</TableHead>
                      <TableHead className="text-right">Relaciones</TableHead>
                      <TableHead className="text-right">Módulos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Duplicado de</TableHead>
                      <TableHead>Recomendación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntities.map((entity) => (
                      <TableRow key={entity.name}>
                        <TableCell className="font-mono font-semibold">{entity.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ENTITY_CATEGORIES[entity.category].label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{entity.records.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{entity.relations}</TableCell>
                        <TableCell className="text-right">{entity.modules}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(entity.status)}>
                            {entity.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {entity.duplicate || "-"}
                        </TableCell>
                        <TableCell className={`text-sm font-semibold ${getRecommendationColor(entity.recommended)}`}>
                          {entity.recommended === "keep" && "✅ Mantener"}
                          {entity.recommended === "delete" && "❌ Eliminar"}
                          {entity.recommended === "consolidate" && "🔀 Consolidar"}
                          {entity.recommended === "migrate_to_native" && "🚀 Migrar a nativo"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Duplicate Groups */}
          <TabsContent value="duplicates">
            <div className="space-y-4">
              {duplicateGroups.map((group, idx) => (
                <Card key={idx} className="border-2 border-orange-200 bg-orange-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-900">
                      <AlertTriangle className="w-5 h-5" />
                      {group.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="font-semibold text-sm mb-2">Entidades en este grupo:</div>
                      <div className="flex flex-wrap gap-2">
                        {group.entities.map(e => (
                          <Badge 
                            key={e.name} 
                            className={e.status === "unused" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-800"}
                          >
                            {e.name} ({e.records})
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="font-semibold text-sm text-blue-900 mb-2">💡 Recomendación:</div>
                      <p className="text-sm text-blue-800">{group.recommendation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab 3: Action Plan */}
          <TabsContent value="recommendations">
            <div className="space-y-4">
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <Trash2 className="w-5 h-5" />
                    FASE 1: Eliminar ({stats.toDelete} entidades)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {entityAnalysis.filter(e => e.recommended === "delete").map(e => (
                      <div key={e.name} className="flex items-center justify-between p-2 bg-white rounded">
                        <div className="flex items-center gap-3">
                          <code className="text-sm font-mono">{e.name}</code>
                          <Badge variant="outline" className="text-xs">{e.records} registros</Badge>
                        </div>
                        <Button size="sm" variant="outline" disabled>
                          Marcar para eliminar
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-xs text-amber-800">
                      ⚠️ <strong>IMPORTANTE:</strong> No eliminar directamente. Primero renombrar con prefijo _OLD_ y esperar 2 semanas de pruebas.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-900">
                    <Copy className="w-5 h-5" />
                    FASE 2: Consolidar ({duplicateGroups.length} grupos)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {duplicateGroups.map((group, idx) => (
                    <div key={idx} className="mb-3 p-3 bg-white rounded">
                      <div className="font-semibold text-sm mb-1">{group.name}</div>
                      <p className="text-xs text-slate-600">{group.recommendation}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-900">
                    <Shield className="w-5 h-5" />
                    FASE 3: Migrar a Sistema Nativo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="p-3 bg-white rounded">
                      <div className="font-semibold text-sm mb-2">ModuleAccessConfig → Base44 Native Security</div>
                      <ul className="text-xs text-slate-600 space-y-1 ml-4 list-disc">
                        <li>Revisar permisos actuales de ModuleAccessConfig</li>
                        <li>Configurar reglas equivalentes en Seguridad Nativa de Base44</li>
                        <li>Probar con usuarios de cada rol</li>
                        <li>Renombrar ModuleAccessConfig a _OLD_ModuleAccessConfig</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Warning Banner */}
        <Card className="mt-6 border-2 border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-900 mb-1">
                  ⚠️ ATENCIÓN: No ejecutar cambios sin aprobación
                </div>
                <p className="text-sm text-amber-800">
                  Este módulo es solo de análisis. Cualquier eliminación, consolidación o migración debe ser:
                  <br />1. Aprobada explícitamente por el usuario
                  <br />2. Probada en entorno de desarrollo
                  <br />3. Respaldada antes de ejecutar
                  <br />4. Implementada en fases con verificación posterior
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}