import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Users, TrendingUp, DollarSign, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DepartmentSalarySummary() {
  const [expandedDept, setExpandedDept] = useState(null);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const all = await base44.entities.EmployeeMasterDatabase.list();
      return all.filter(emp => emp.estado_empleado === 'Alta');
    },
  });

  const { data: salaries = [], isLoading: loadingSalaries } = useQuery({
    queryKey: ['all-employee-salaries'],
    queryFn: () => base44.entities.EmployeeSalary.filter({ is_current: true }),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  // Calcular resumen por departamento
  const departmentSummary = React.useMemo(() => {
    const summary = {};

    employees.forEach(emp => {
      const dept = emp.departamento || 'Sin Departamento';
      
      if (!summary[dept]) {
        summary[dept] = {
          name: dept,
          employeeCount: 0,
          totalSalary: 0,
          employees: []
        };
      }

      const empSalaries = salaries.filter(s => s.employee_id === emp.id);
      const empTotalSalary = empSalaries.reduce((sum, s) => sum + (s.amount || 0), 0);

      summary[dept].employeeCount++;
      summary[dept].totalSalary += empTotalSalary;
      summary[dept].employees.push({
        id: emp.id,
        name: emp.nombre,
        position: emp.puesto,
        salary: empTotalSalary,
        components: empSalaries.length
      });
    });

    // Convertir a array y ordenar por coste total
    return Object.values(summary).sort((a, b) => b.totalSalary - a.totalSalary);
  }, [employees, salaries]);

  const totalCompanySalary = departmentSummary.reduce((sum, dept) => sum + dept.totalSalary, 0);
  const totalEmployees = employees.length;
  const avgSalary = totalEmployees > 0 ? totalCompanySalary / totalEmployees : 0;

  if (loadingEmployees || loadingSalaries) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Cargando resumen...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-slate-500">Coste Total Mensual</span>
            </div>
            <div className="text-3xl font-bold text-emerald-600">
              {totalCompanySalary.toFixed(0)}€
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-slate-500">Total Empleados</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {totalEmployees}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-slate-500">Salario Medio</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {avgSalary.toFixed(0)}€
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-slate-500">Departamentos</span>
            </div>
            <div className="text-3xl font-bold text-orange-600">
              {departmentSummary.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desglose por Departamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Costes Salariales por Departamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-3">
              {departmentSummary.map((dept) => {
                const isExpanded = expandedDept === dept.name;
                const avgDeptSalary = dept.employeeCount > 0 
                  ? dept.totalSalary / dept.employeeCount 
                  : 0;
                const percentOfTotal = totalCompanySalary > 0 
                  ? (dept.totalSalary / totalCompanySalary) * 100 
                  : 0;

                return (
                  <Card key={dept.name} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedDept(isExpanded ? null : dept.name)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <ChevronRight 
                              className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                            />
                            <h3 className="font-semibold text-lg">{dept.name}</h3>
                            <Badge variant="outline">{dept.employeeCount} empleados</Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-4 ml-8">
                            <div>
                              <span className="text-xs text-slate-500 block mb-1">Coste Total</span>
                              <span className="text-xl font-bold text-emerald-600">
                                {dept.totalSalary.toFixed(0)}€
                              </span>
                              <span className="text-xs text-slate-500 ml-2">
                                ({percentOfTotal.toFixed(1)}%)
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-slate-500 block mb-1">Media Departamento</span>
                              <span className="text-xl font-bold text-blue-600">
                                {avgDeptSalary.toFixed(0)}€
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-slate-500 block mb-1">vs Media Empresa</span>
                              <Badge 
                                variant={avgDeptSalary > avgSalary ? "default" : "secondary"}
                                className="text-sm"
                              >
                                {avgDeptSalary > avgSalary ? '+' : ''}
                                {((avgDeptSalary - avgSalary) / avgSalary * 100).toFixed(1)}%
                              </Badge>
                            </div>
                          </div>

                          {/* Barra de progreso */}
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3 ml-8">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(percentOfTotal, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Lista de empleados expandida */}
                      {isExpanded && (
                        <div className="mt-4 ml-8 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                          <div className="space-y-2">
                            {dept.employees
                              .sort((a, b) => b.salary - a.salary)
                              .map(emp => (
                                <div 
                                  key={emp.id} 
                                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <div>
                                    <span className="font-medium">{emp.name}</span>
                                    <span className="text-xs text-slate-500 ml-2">
                                      {emp.position}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-xs">
                                      {emp.components} componentes
                                    </Badge>
                                    <span className="font-bold text-emerald-600 min-w-[100px] text-right">
                                      {emp.salary.toFixed(2)}€
                                    </span>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {departmentSummary.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No hay datos de departamentos</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}