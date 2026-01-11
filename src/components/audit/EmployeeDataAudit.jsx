import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Database,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  Trash2,
  RefreshCw,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmployeeDataIntegrity from "./EmployeeDataIntegrity";
import EmployeeConsolidationReport from "./EmployeeConsolidationReport";
import DirectConsolidation from "./DirectConsolidation";
import FinalConsolidationStep from "./FinalConsolidationStep";

export default function EmployeeDataAudit() {
  const [auditResults, setAuditResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    performAudit();
  }, []);

  const performAudit = async () => {
    setLoading(true);
    try {
      const results = {
        entities: {},
        totalRecords: 0,
        dataQuality: {},
        recommendations: []
      };

      // 1. EmployeeMasterDatabase (FUENTE PRINCIPAL)
      const masterEmployees = await base44.entities.EmployeeMasterDatabase.list('nombre', 1000);
      results.entities.EmployeeMasterDatabase = {
        count: masterEmployees.length,
        status: "Principal",
        role: "Fuente única de verdad",
        fields: Object.keys(masterEmployees[0] || {}),
        hasData: masterEmployees.length > 0
      };
      results.totalRecords += masterEmployees.length;

      // 2. Employee (ELIMINADA)
      results.entities.Employee = {
        count: 0,
        status: "Eliminada ✅",
        role: "Entidad eliminada - Datos consolidados en EmployeeMasterDatabase",
        hasData: false
      };

      // 3. Entidades relacionadas con EmployeeMasterDatabase
      const relatedEntities = [
        { name: "EmployeeSkill", relation: "employee_id → EmployeeMasterDatabase", description: "Habilidades y competencias" },
        { name: "EmployeeTraining", relation: "employee_id → EmployeeMasterDatabase", description: "Formación asignada" },
        { name: "EmployeeOnboarding", relation: "employee_id → EmployeeMasterDatabase", description: "Procesos de onboarding" },
        { name: "EmployeeDocument", relation: "employee_id → EmployeeMasterDatabase", description: "Documentos personales" },
        { name: "LockerAssignment", relation: "employee_id → EmployeeMasterDatabase", description: "Asignaciones de taquillas" },
        { name: "AttendanceRecord", relation: "employee_id → EmployeeMasterDatabase", description: "Registros de fichaje" },
        { name: "EmployeeAuditLog", relation: "target_employee_id → EmployeeMasterDatabase", description: "Auditoría de acciones" },
        { name: "EmployeeSyncHistory", relation: "employee_id → EmployeeMasterDatabase", description: "Historial de sincronización" },
        { name: "Absence", relation: "employee_id → EmployeeMasterDatabase", description: "Ausencias registradas" },
        { name: "ShiftAssignment", relation: "employee_id → EmployeeMasterDatabase", description: "Asignaciones de turno" },
        { name: "PerformanceReview", relation: "employee_id → EmployeeMasterDatabase", description: "Evaluaciones de desempeño" },
        { name: "PerformanceImprovementPlan", relation: "employee_id → EmployeeMasterDatabase", description: "Planes de mejora" },
        { name: "EmployeeIncentiveResult", relation: "employee_id → EmployeeMasterDatabase", description: "Resultados de incentivos" }
      ];

      for (const entity of relatedEntities) {
        try {
          const records = await base44.entities[entity.name].list('-created_date', 100);
          results.entities[entity.name] = {
            count: records.length,
            status: "Activa",
            role: entity.description,
            relation: entity.relation,
            hasData: records.length > 0
          };
          results.totalRecords += records.length;
        } catch (e) {
          results.entities[entity.name] = {
            count: 0,
            status: "Error",
            error: e.message,
            relation: entity.relation
          };
        }
      }

      // 4. Análisis de calidad de datos
      const masterIds = new Set(masterEmployees.map(e => e.id));
      
      // Verificar integridad referencial
      const absences = await base44.entities.Absence.list('-created_date', 500);
      const orphanedAbsences = absences.filter(a => a.employee_id && !masterIds.has(a.employee_id));
      
      results.dataQuality = {
        masterEmployeesWithEmail: masterEmployees.filter(e => e.email).length,
        masterEmployeesWithDNI: masterEmployees.filter(e => e.dni).length,
        masterEmployeesComplete: masterEmployees.filter(e => 
          e.email && e.dni && e.departamento && e.puesto && e.fecha_alta
        ).length,
        orphanedAbsences: orphanedAbsences.length,
        completenessPercentage: Math.round(
          (masterEmployees.filter(e => e.email && e.dni && e.departamento).length / masterEmployees.length) * 100
        )
      };

      if (orphanedAbsences.length > 0) {
        results.recommendations.push({
          priority: "HIGH",
          action: "Limpiar ausencias huérfanas",
          impact: `${orphanedAbsences.length} ausencias sin empleado válido`,
          solution: "Eliminar o reasignar ausencias"
        });
      }

      setAuditResults(results);
    } catch (error) {
      console.error("Error in audit:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!auditResults) return;
    
    const report = {
      timestamp: new Date().toISOString(),
      ...auditResults
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-data-audit-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Auditando datos de empleados...</p>
        </CardContent>
      </Card>
    );
  }

  if (!auditResults) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            Auditoría y Consolidación de Datos de Empleados
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Análisis completo, integridad referencial y plan de consolidación
          </p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>

      {/* Paso Final - Eliminar Employee.json */}
      <FinalConsolidationStep 
        employeeCount={auditResults?.entities?.Employee?.count || 0}
        masterCount={auditResults?.entities?.EmployeeMasterDatabase?.count || 0}
      />

      {/* Ejecutor de Consolidación Directa (por si acaso) */}
      <DirectConsolidation />

      {/* Reporte de Arquitectura Completo */}
      <EmployeeConsolidationReport />

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-medium">Total Registros</p>
                <p className="text-2xl font-bold text-blue-900">{auditResults.totalRecords}</p>
              </div>
              <Database className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-medium">Completitud Datos</p>
                <p className="text-2xl font-bold text-green-900">
                  {auditResults.dataQuality.completenessPercentage}%
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-700 font-medium">Recomendaciones</p>
                <p className="text-2xl font-bold text-orange-900">
                  {auditResults.recommendations.length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 font-medium">Entidades</p>
                <p className="text-2xl font-bold text-purple-900">
                  {Object.keys(auditResults.entities).length}
                </p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recomendaciones Críticas */}
      {auditResults.recommendations.length > 0 && (
        <Alert className="border-orange-300 bg-orange-50">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold text-orange-900">Acciones Recomendadas:</p>
              {auditResults.recommendations.map((rec, idx) => (
                <div key={idx} className="ml-4">
                  <Badge className={
                    rec.priority === "CRITICAL" ? "bg-red-600" : "bg-orange-600"
                  }>
                    {rec.priority}
                  </Badge>
                  <p className="text-sm mt-1 text-orange-800">
                    <strong>{rec.action}:</strong> {rec.impact}
                  </p>
                  <p className="text-xs text-orange-700 ml-4">→ {rec.solution}</p>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabla de Entidades */}
      <Card>
        <CardHeader>
          <CardTitle>Inventario de Entidades de Empleados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(auditResults.entities).map(([name, info]) => (
              <div
                key={name}
                className={`p-4 rounded-lg border-2 ${
                  info.status === "Principal" ? "bg-green-50 border-green-300" :
                  info.status === "Deprecated" ? "bg-red-50 border-red-300" :
                  info.hasData ? "bg-blue-50 border-blue-200" :
                  "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{name}</h3>
                      <Badge className={
                        info.status === "Principal" ? "bg-green-600" :
                        info.status === "Deprecated" ? "bg-red-600" :
                        info.hasData ? "bg-blue-600" :
                        "bg-slate-600"
                      }>
                        {info.status}
                      </Badge>
                      {info.relation && (
                        <Badge variant="outline" className="text-xs">
                          Relación: {info.relation}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{info.role}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {info.count} registros
                      </span>
                      {info.warning && (
                        <span className="text-orange-600 font-medium">{info.warning}</span>
                      )}
                      {info.error && (
                        <span className="text-red-600">Error: {info.error}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calidad de Datos */}
      <Card>
        <CardHeader>
          <CardTitle>Calidad de Datos - EmployeeMasterDatabase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Con Email:</span>
                <span className="font-semibold">{auditResults.dataQuality.masterEmployeesWithEmail}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Con DNI:</span>
                <span className="font-semibold">{auditResults.dataQuality.masterEmployeesWithDNI}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Datos Completos:</span>
                <span className="font-semibold text-green-600">
                  {auditResults.dataQuality.masterEmployeesComplete}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Ausencias Huérfanas:</span>
                <span className={`font-semibold ${
                  auditResults.dataQuality.orphanedAbsences > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {auditResults.dataQuality.orphanedAbsences}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Análisis Detallado */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Datos Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="stats" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stats">Estadísticas</TabsTrigger>
              <TabsTrigger value="entities">Entidades</TabsTrigger>
            </TabsList>

            <TabsContent value="stats">
              <Card className="bg-blue-50 border-2 border-blue-300">
                <CardHeader>
                  <CardTitle className="text-blue-900">Calidad de Datos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Con Email:</span>
                        <span className="font-semibold">{auditResults.dataQuality.masterEmployeesWithEmail}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Con DNI:</span>
                        <span className="font-semibold">{auditResults.dataQuality.masterEmployeesWithDNI}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Datos Completos:</span>
                        <span className="font-semibold text-green-600">
                          {auditResults.dataQuality.masterEmployeesComplete}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Ausencias Huérfanas:</span>
                        <span className={`font-semibold ${
                          auditResults.dataQuality.orphanedAbsences > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {auditResults.dataQuality.orphanedAbsences}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="entities">
              <div className="space-y-3">
                {Object.entries(auditResults.entities).map(([name, info]) => (
                  <div
                    key={name}
                    className={`p-4 rounded-lg border-2 ${
                      info.status === "Principal" ? "bg-green-50 border-green-300" :
                      info.status === "Deprecated" ? "bg-red-50 border-red-300" :
                      info.hasData ? "bg-blue-50 border-blue-200" :
                      "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{name}</h3>
                          <Badge className={
                            info.status === "Principal" ? "bg-green-600" :
                            info.status === "Deprecated" ? "bg-red-600" :
                            info.hasData ? "bg-blue-600" :
                            "bg-slate-600"
                          }>
                            {info.status}
                          </Badge>
                          {info.relation && (
                            <Badge variant="outline" className="text-xs">
                              {info.relation}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mb-2">{info.role}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            {info.count} registros
                          </span>
                          {info.warning && (
                            <span className="text-orange-600 font-medium">{info.warning}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}