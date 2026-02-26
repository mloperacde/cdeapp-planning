import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAppData } from "@/components/data/DataProvider";

export default function InitialSalarySetup() {
  const queryClient = useQueryClient();
  const { user } = useAppData();
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const all = await base44.entities.EmployeeMasterDatabase.list('nombre');
      return all.filter(emp => emp.estado_empleado === 'Alta');
    },
  });

  const { data: salaries = [] } = useQuery({
    queryKey: ['all-employee-salaries'],
    queryFn: () => base44.entities.EmployeeSalary.filter({ is_current: true }),
  });

  const { data: baseComponent } = useQuery({
    queryKey: ['salary-base-component'],
    queryFn: async () => {
      const components = await base44.entities.SalaryComponent.filter({ 
        code: 'SAL-BASE',
        is_active: true 
      });
      return components[0];
    },
  });

  // Crear componente base si no existe
  const createBaseComponentMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.SalaryComponent.create({
        name: "Salario Base",
        code: "SAL-BASE",
        type: "Fijo",
        category: "Salario Base",
        is_taxable: true,
        is_social_security_contributory: true,
        calculation_method: "Fijo",
        applies_to_all: true,
        periodicity: "Mensual",
        is_active: true,
        order: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-base-component'] });
      toast.success("Componente Salario Base creado");
    },
  });

  // Importación masiva desde salario_anual del empleado
  const importFromEmployeeDataMutation = useMutation({
    mutationFn: async () => {
      if (!baseComponent) {
        throw new Error("Primero debes crear el componente Salario Base");
      }

      setImporting(true);
      const results = {
        success: 0,
        skipped: 0,
        errors: [],
        details: []
      };

      for (const employee of employees) {
        try {
          // Verificar si ya tiene salario configurado
          const hasSalary = salaries.some(s => s.employee_id === employee.id);
          
          if (hasSalary) {
            results.skipped++;
            results.details.push({
              employee: employee.nombre,
              status: 'skipped',
              message: 'Ya tiene salario configurado'
            });
            continue;
          }

          // Si tiene salario_anual en su ficha, importarlo
          if (employee.salario_anual && employee.salario_anual > 0) {
            const mensualSalary = employee.salario_anual / 12;

            await base44.entities.EmployeeSalary.create({
              employee_id: employee.id,
              employee_name: employee.nombre,
              employee_code: employee.codigo_empleado,
              component_id: baseComponent.id,
              component_name: baseComponent.name,
              component_code: baseComponent.code,
              amount: parseFloat(mensualSalary.toFixed(2)),
              start_date: format(new Date(), 'yyyy-MM-dd'),
              is_current: true,
              notes: `Importado desde salario_anual: ${employee.salario_anual}€/año`
            });

            // Crear auditoría
            await base44.entities.SalaryAuditLog.create({
              entity_type: 'EmployeeSalary',
              entity_id: employee.id,
              action: 'create',
              employee_id: employee.id,
              employee_name: employee.nombre,
              new_value: `Salario Base: ${mensualSalary.toFixed(2)}€/mes`,
              change_amount: mensualSalary,
              change_reason: 'Importación inicial desde ficha de empleado',
              changed_by: user.id,
              changed_by_name: user.full_name,
              change_date: new Date().toISOString()
            });

            results.success++;
            results.details.push({
              employee: employee.nombre,
              status: 'success',
              salary: mensualSalary.toFixed(2),
              message: `Importado: ${employee.salario_anual}€/año → ${mensualSalary.toFixed(2)}€/mes`
            });
          } else {
            results.skipped++;
            results.details.push({
              employee: employee.nombre,
              status: 'skipped',
              message: 'No tiene salario_anual en su ficha'
            });
          }

        } catch (error) {
          results.errors.push({
            employee: employee.nombre,
            error: error.message
          });
        }
      }

      setImporting(false);
      return results;
    },
    onSuccess: (results) => {
      setImportResults(results);
      queryClient.invalidateQueries({ queryKey: ['all-employee-salaries'] });
      toast.success(`Importación completada: ${results.success} empleados procesados`);
    },
  });

  const employeesWithoutSalary = employees.filter(emp => 
    !salaries.some(s => s.employee_id === emp.id)
  );

  const employeesWithSalaryInData = employeesWithoutSalary.filter(emp => 
    emp.salario_anual && emp.salario_anual > 0
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Configuración Inicial de Salarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estadísticas */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Empleados</div>
              <div className="text-3xl font-bold text-blue-600">{employees.length}</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Con Salario Configurado</div>
              <div className="text-3xl font-bold text-emerald-600">
                {employees.length - employeesWithoutSalary.length}
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Pendientes de Configurar</div>
              <div className="text-3xl font-bold text-amber-600">{employeesWithoutSalary.length}</div>
            </div>
          </div>

          {/* Información */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-2">¿Dónde se almacena el salario actual de cada empleado?</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Los salarios se gestionan en la entidad <strong>EmployeeSalary</strong></li>
                  <li>Cada empleado puede tener múltiples componentes salariales (Salario Base, Pluses, etc.)</li>
                  <li>El sistema mantiene histórico completo con versiones y auditoría</li>
                  <li>El campo <code>salario_anual</code> en <strong>EmployeeMasterDatabase</strong> es un dato de referencia que puede importarse aquí</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Paso 1: Crear componente base */}
          {!baseComponent && (
            <Card className="border-2 border-amber-300 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-1">Paso 1: Crear Componente Salario Base</h3>
                    <p className="text-sm text-amber-700">
                      Necesitas un componente "Salario Base" para poder importar los salarios
                    </p>
                  </div>
                  <Button 
                    onClick={() => createBaseComponentMutation.mutate()}
                    disabled={createBaseComponentMutation.isPending}
                  >
                    {createBaseComponentMutation.isPending ? "Creando..." : "Crear Componente"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Paso 2: Importar desde datos del empleado (DEPRECATED) */}
          <Card className="border-2 border-slate-200 bg-slate-50">
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <CheckCircle className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Nuevo Flujo de Configuración Salarial</h3>
                  <p className="text-sm text-slate-600 max-w-lg mx-auto">
                    La gestión de salarios ahora se realiza de forma centralizada desde el módulo de <strong>Gestión Salarial</strong>.
                    <br/><br/>
                    En lugar de importar datos desde la ficha del empleado, debes configurar las políticas retributivas y asignar salarios directamente en la pestaña "Salarios Empleados".
                    <br/><br/>
                    <span className="text-xs text-slate-500 italic">
                      Nota: Próximamente se habilitará la sincronización automática hacia la ficha maestra del empleado.
                    </span>
                  </p>
                </div>
                <Button variant="outline" disabled className="opacity-50 cursor-not-allowed">
                  Importación Deshabilitada
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resultados de importación */}
          {importResults && (
            <Card className="border-2 border-emerald-300">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Resultados de la Importación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                    <div className="text-xs text-slate-600 mb-1">Importados</div>
                    <div className="text-2xl font-bold text-emerald-600">{importResults.success}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <div className="text-xs text-slate-600 mb-1">Omitidos</div>
                    <div className="text-2xl font-bold text-slate-600">{importResults.skipped}</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <div className="text-xs text-slate-600 mb-1">Errores</div>
                    <div className="text-2xl font-bold text-red-600">{importResults.errors.length}</div>
                  </div>
                </div>

                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {importResults.details.map((detail, idx) => (
                      <div 
                        key={idx}
                        className={`p-3 rounded border ${
                          detail.status === 'success' 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-medium">{detail.employee}</span>
                            <p className="text-xs text-slate-600 mt-1">{detail.message}</p>
                          </div>
                          {detail.status === 'success' && (
                            <Badge className="bg-emerald-600">{detail.salary}€/mes</Badge>
                          )}
                        </div>
                      </div>
                    ))}

                    {importResults.errors.map((error, idx) => (
                      <div 
                        key={`error-${idx}`}
                        className="p-3 rounded border bg-red-50 border-red-200"
                      >
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium text-red-900">{error.employee}</span>
                            <p className="text-xs text-red-700 mt-1">{error.error}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}