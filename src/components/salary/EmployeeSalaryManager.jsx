import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, DollarSign, Plus, Eye, TrendingUp } from "lucide-react";
import EmployeeSalaryDetail from "./EmployeeSalaryDetail";

export default function EmployeeSalaryManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showSummary, setShowSummary] = useState(true);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const all = await base44.entities.EmployeeMasterDatabase.list('nombre');
      return all.filter(emp => emp.estado_empleado === 'Alta');
    },
  });

  const { data: employeeSalaries = [] } = useQuery({
    queryKey: ['employeeSalaries'],
    queryFn: () => base44.entities.EmployeeSalary.filter({ is_current: true }),
  });

  const employeesWithSalary = useMemo(() => {
    return employees.map(emp => {
      const salaries = employeeSalaries.filter(s => s.employee_id === emp.id);
      const totalSalary = salaries.reduce((sum, s) => sum + (s.amount || 0), 0);
      return {
        ...emp,
        totalSalary,
        componentCount: salaries.length
      };
    });
  }, [employees, employeeSalaries]);

  const filteredEmployees = employeesWithSalary.filter(emp =>
    emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const costsByDepartment = React.useMemo(() => {
    const summary = {};
    filteredEmployees.forEach(emp => {
      const dept = emp.departamento || "Sin Departamento";
      if (!summary[dept]) {
        summary[dept] = { total: 0, count: 0 };
      }
      summary[dept].total += emp.totalSalary;
      summary[dept].count += 1;
    });
    return Object.entries(summary).map(([dept, data]) => ({
      departamento: dept,
      total: data.total,
      count: data.count,
      promedio: data.total / data.count
    })).sort((a, b) => b.total - a.total);
  }, [filteredEmployees]);

  if (selectedEmployee) {
    return (
      <EmployeeSalaryDetail
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
      />
    );
  }

  const totalCosts = costsByDepartment.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="space-y-4">
      {showSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-slate-500 mb-1">Coste Total Mensual</div>
              <div className="text-3xl font-bold text-emerald-600">{totalCosts.toFixed(2)}€</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-slate-500 mb-1">Coste Anual</div>
              <div className="text-2xl font-bold text-blue-600">{(totalCosts * 14).toFixed(2)}€</div>
              <div className="text-xs text-slate-400 mt-1">14 pagas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-slate-500 mb-1">Empleados</div>
              <div className="text-3xl font-bold">{filteredEmployees.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-slate-500 mb-1">Salario Promedio</div>
              <div className="text-2xl font-bold text-purple-600">
                {filteredEmployees.length > 0 ? (totalCosts / filteredEmployees.length).toFixed(2) : 0}€
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Salarios de Empleados
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)}>
            {showSummary ? "Ocultar" : "Mostrar"} Resumen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar empleado..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedEmployee(employee)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{employee.nombre}</h3>
                      <p className="text-sm text-slate-500">{employee.codigo_empleado}</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-slate-500">Puesto</span>
                      <p className="text-sm font-medium">{employee.puesto || "Sin puesto"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Departamento</span>
                      <p className="text-sm font-medium">{employee.departamento || "Sin departamento"}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block">Salario Total</span>
                      <span className="text-lg font-bold text-emerald-600">
                        {employee.totalSalary.toFixed(2)}€
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {employee.componentCount} componentes
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No se encontraron empleados</p>
            </div>
          )}
        </ScrollArea>

        {showSummary && costsByDepartment.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Resumen por Departamento
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {costsByDepartment.slice(0, 6).map((dept) => (
                <div key={dept.departamento} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                  <span className="font-medium truncate flex-1">{dept.departamento}</span>
                  <div className="text-right ml-2">
                    <div className="font-semibold text-emerald-600">{dept.total.toFixed(0)}€</div>
                    <div className="text-xs text-slate-500">{dept.count} empl.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}