import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ExternalLink, Users, Database } from "lucide-react";

export default function LockerAudit({ employees, lockerAssignments }) {
  const auditResults = useMemo(() => {
    const results = {
      employeesWithoutAssignment: [],
      assignmentsWithoutEmployee: [],
      duplicateAssignments: [],
      inconsistencies: []
    };

    // Empleados sin registro de asignación
    employees.forEach(emp => {
      const hasAssignment = lockerAssignments.find(la => la.employee_id === emp.id);
      if (!hasAssignment) {
        results.employeesWithoutAssignment.push(emp);
      }
    });

    // Asignaciones sin empleado válido
    lockerAssignments.forEach(la => {
      const employee = employees.find(e => e.id === la.employee_id);
      if (!employee) {
        results.assignmentsWithoutEmployee.push(la);
      }
    });

    // Detectar asignaciones duplicadas por vestuario + número
    const assignmentMap = new Map();
    lockerAssignments.forEach(la => {
      if (!la.numero_taquilla_actual || la.requiere_taquilla === false) return;
      
      const key = `${la.vestuario}|${la.numero_taquilla_actual}`;
      if (!assignmentMap.has(key)) {
        assignmentMap.set(key, []);
      }
      assignmentMap.get(key).push(la);
    });

    assignmentMap.forEach((assignments, key) => {
      if (assignments.length > 1) {
        const [vestuario, numero] = key.split('|');
        const employeeNames = assignments.map(la => {
          const emp = employees.find(e => e.id === la.employee_id);
          return emp?.nombre || 'Desconocido';
        });
        
        results.duplicateAssignments.push({
          vestuario,
          numero,
          count: assignments.length,
          employees: employeeNames,
          assignments
        });
      }
    });

    return results;
  }, [employees, lockerAssignments]);

  const totalProblems = 
    auditResults.employeesWithoutAssignment.length +
    auditResults.assignmentsWithoutEmployee.length +
    auditResults.duplicateAssignments.length;

  return (
    <div className="space-y-6">
      <Card className={`shadow-lg border-2 ${
        totalProblems > 0 ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-300'
      }`}>
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Auditoría de Datos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-lg border-2 ${
              auditResults.employeesWithoutAssignment.length > 0 
                ? 'bg-amber-100 border-amber-300' 
                : 'bg-green-100 border-green-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Sin Registro</span>
                <Badge className={auditResults.employeesWithoutAssignment.length > 0 ? 'bg-amber-600' : 'bg-green-600'}>
                  {auditResults.employeesWithoutAssignment.length}
                </Badge>
              </div>
              <p className="text-xs text-slate-600">Empleados sin asignación creada</p>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              auditResults.assignmentsWithoutEmployee.length > 0 
                ? 'bg-red-100 border-red-300' 
                : 'bg-green-100 border-green-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Huérfanas</span>
                <Badge className={auditResults.assignmentsWithoutEmployee.length > 0 ? 'bg-red-600' : 'bg-green-600'}>
                  {auditResults.assignmentsWithoutEmployee.length}
                </Badge>
              </div>
              <p className="text-xs text-slate-600">Asignaciones sin empleado</p>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              auditResults.duplicateAssignments.length > 0 
                ? 'bg-red-100 border-red-300' 
                : 'bg-green-100 border-green-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Duplicadas</span>
                <Badge className={auditResults.duplicateAssignments.length > 0 ? 'bg-red-600' : 'bg-green-600'}>
                  {auditResults.duplicateAssignments.length}
                </Badge>
              </div>
              <p className="text-xs text-slate-600">Taquillas con múltiples asignaciones</p>
            </div>
          </div>

          {totalProblems === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-semibold text-green-900">✅ Base de datos consistente</p>
              <p className="text-sm text-slate-600 mt-1">No se detectaron problemas de integridad</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditResults.employeesWithoutAssignment.length > 0 && (
                <div className="border-2 border-amber-300 rounded-lg p-4 bg-amber-50">
                  <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Empleados sin Registro de Asignación ({auditResults.employeesWithoutAssignment.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {auditResults.employeesWithoutAssignment.slice(0, 10).map(emp => (
                      <div key={emp.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <div className="font-medium text-sm">{emp.nombre}</div>
                          <div className="text-xs text-slate-600">{emp.departamento}</div>
                        </div>
                        <Link to={createPageUrl(`Employees?id=${emp.id}`)}>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                  {auditResults.employeesWithoutAssignment.length > 10 && (
                    <p className="text-xs text-amber-700 mt-2">
                      ... y {auditResults.employeesWithoutAssignment.length - 10} más
                    </p>
                  )}
                </div>
              )}

              {auditResults.duplicateAssignments.length > 0 && (
                <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Taquillas Duplicadas ({auditResults.duplicateAssignments.length})
                  </h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {auditResults.duplicateAssignments.map((dup, idx) => (
                      <div key={idx} className="p-3 bg-white rounded border-2 border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-red-600 text-white">
                            Taquilla {dup.numero}
                          </Badge>
                          <Badge variant="outline">{dup.vestuario}</Badge>
                          <Badge className="bg-orange-600 text-white">
                            {dup.count} empleados
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-700">
                          <strong>Asignada a:</strong> {dup.employees.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {auditResults.assignmentsWithoutEmployee.length > 0 && (
                <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-900 mb-3">
                    Asignaciones Huérfanas ({auditResults.assignmentsWithoutEmployee.length})
                  </h3>
                  <p className="text-xs text-red-800">
                    Hay {auditResults.assignmentsWithoutEmployee.length} asignación(es) sin empleado válido en la base de datos
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}