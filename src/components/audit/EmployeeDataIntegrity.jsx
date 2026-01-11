import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Database,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Unlink,
  Download
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * COMPONENTE DE VERIFICACIÓN DE INTEGRIDAD REFERENCIAL
 * Verifica que todas las relaciones employee_id apunten a registros válidos
 */
export default function EmployeeDataIntegrity() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeIntegrity();
  }, []);

  const analyzeIntegrity = async () => {
    setLoading(true);
    try {
      // Obtener todos los IDs válidos de EmployeeMasterDatabase
      const masterEmployees = await base44.entities.EmployeeMasterDatabase.list('nombre', 1000);
      const validMasterIds = new Set(masterEmployees.map(e => e.id));
      
      // También considerar Employee deprecated (temporal)
      let deprecatedEmployees = [];
      try {
        deprecatedEmployees = await base44.entities.Employee.list('nombre', 1000);
      } catch (e) {
        console.log("Employee entity not accessible or deleted");
      }
      const validDeprecatedIds = new Set(deprecatedEmployees.map(e => e.id));

      const results = {
        validMasterIds: validMasterIds.size,
        validDeprecatedIds: validDeprecatedIds.size,
        entities: {},
        orphanedRecords: [],
        brokenReferences: 0,
        totalReferences: 0
      };

      // Entidades a verificar
      const entitiesToCheck = [
        { name: "Absence", field: "employee_id", description: "Ausencias" },
        { name: "ShiftAssignment", field: "employee_id", description: "Asignaciones de turno" },
        { name: "LockerAssignment", field: "employee_id", description: "Asignaciones de taquilla" },
        { name: "AttendanceRecord", field: "employee_id", description: "Registros de asistencia" },
        { name: "EmployeeSkill", field: "employee_id", description: "Habilidades" },
        { name: "EmployeeTraining", field: "employee_id", description: "Formación" },
        { name: "EmployeeOnboarding", field: "employee_id", description: "Onboarding" },
        { name: "EmployeeDocument", field: "employee_id", description: "Documentos" },
        { name: "PerformanceReview", field: "employee_id", description: "Evaluaciones" },
        { name: "PerformanceImprovementPlan", field: "employee_id", description: "Planes de mejora" },
        { name: "EmployeeIncentiveResult", field: "employee_id", description: "Resultados incentivos" },
        { name: "EmployeeAuditLog", field: "target_employee_id", description: "Log de auditoría" }
      ];

      for (const entity of entitiesToCheck) {
        try {
          const records = await base44.entities[entity.name].list('-created_date', 500);
          const orphaned = records.filter(r => {
            const empId = r[entity.field];
            return empId && !validMasterIds.has(empId) && !validDeprecatedIds.has(empId);
          });

          results.entities[entity.name] = {
            total: records.length,
            orphaned: orphaned.length,
            valid: records.length - orphaned.length,
            description: entity.description,
            field: entity.field,
            integrity: records.length > 0 ? Math.round(((records.length - orphaned.length) / records.length) * 100) : 100
          };

          results.totalReferences += records.length;
          results.brokenReferences += orphaned.length;

          if (orphaned.length > 0) {
            results.orphanedRecords.push({
              entity: entity.name,
              count: orphaned.length,
              records: orphaned.slice(0, 5) // Primeros 5 para revisión
            });
          }
        } catch (e) {
          results.entities[entity.name] = {
            total: 0,
            orphaned: 0,
            valid: 0,
            error: e.message,
            description: entity.description
          };
        }
      }

      results.integrityPercentage = results.totalReferences > 0 
        ? Math.round(((results.totalReferences - results.brokenReferences) / results.totalReferences) * 100)
        : 100;

      setAnalysis(results);
    } catch (error) {
      console.error("Error analyzing integrity:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verificando integridad referencial...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <Database className="w-6 h-6" />
            Integridad Referencial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Estado General:</span>
              <div className="flex items-center gap-2">
                <Progress value={analysis.integrityPercentage} className="w-32 h-2" />
                <Badge className={
                  analysis.integrityPercentage === 100 ? "bg-green-600" :
                  analysis.integrityPercentage >= 90 ? "bg-amber-600" :
                  "bg-red-600"
                }>
                  {analysis.integrityPercentage}%
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-blue-700 font-medium">Referencias Válidas</p>
                <p className="text-2xl font-bold text-blue-900">
                  {analysis.totalReferences - analysis.brokenReferences}
                </p>
              </div>
              <div>
                <p className="text-red-700 font-medium">Referencias Rotas</p>
                <p className="text-2xl font-bold text-red-900">{analysis.brokenReferences}</p>
              </div>
              <div>
                <p className="text-green-700 font-medium">IDs Empleados Válidos</p>
                <p className="text-2xl font-bold text-green-900">{analysis.validMasterIds}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Referencias Rotas */}
      {analysis.orphanedRecords.length > 0 && (
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription>
            <p className="font-semibold text-red-900 mb-2">
              ⚠️ {analysis.brokenReferences} registros con referencias rotas detectados
            </p>
            <ul className="text-sm text-red-800 space-y-1">
              {analysis.orphanedRecords.map((orphan, idx) => (
                <li key={idx}>
                  • <strong>{orphan.entity}:</strong> {orphan.count} registros huérfanos
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabla de Entidades */}
      <Card>
        <CardHeader>
          <CardTitle>Integridad por Entidad</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entidad</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Válidas</TableHead>
                <TableHead>Huérfanas</TableHead>
                <TableHead>Integridad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(analysis.entities).map(([name, data]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell className="text-sm text-slate-600">{data.description}</TableCell>
                  <TableCell>{data.total}</TableCell>
                  <TableCell className="text-green-600 font-semibold">{data.valid}</TableCell>
                  <TableCell className={data.orphaned > 0 ? "text-red-600 font-semibold" : "text-slate-500"}>
                    {data.orphaned}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={data.integrity} className="w-20 h-2" />
                      <span className="text-xs font-medium">{data.integrity}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {data.error ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700">Error</Badge>
                    ) : data.orphaned === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan de Limpieza */}
      {analysis.brokenReferences > 0 && (
        <Card className="bg-orange-50 border-2 border-orange-300">
          <CardHeader>
            <CardTitle className="text-orange-900">Plan de Limpieza de Referencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Opciones de Limpieza:</strong>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Eliminar registros huérfanos (recomendado si son antiguos)</li>
                    <li>Reasignar a un empleado genérico "Empleado Eliminado"</li>
                    <li>Migrar a EmployeeMasterDatabase si vienen de Employee deprecated</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-white p-4 rounded-lg border">
                <p className="text-sm font-semibold text-slate-900 mb-2">
                  Acción Recomendada:
                </p>
                <ol className="text-sm text-slate-700 space-y-2 list-decimal ml-4">
                  <li>Ejecutar consolidación Employee → EmployeeMasterDatabase</li>
                  <li>Actualizar referencias de employee_id en todas las entidades</li>
                  <li>Verificar que no quedan referencias rotas</li>
                  <li>Eliminar entidad Employee deprecated</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}