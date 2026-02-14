import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, Download, Loader2 } from "lucide-react";
import EmployeeSearchSelect from "@/components/common/EmployeeSearchSelect";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PayrollSimulator() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [periodStart, setPeriodStart] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'));
  const [simulation, setSimulation] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const all = await base44.entities.EmployeeMasterDatabase.list('nombre');
      return all.filter(emp => emp.estado_empleado === 'Alta');
    },
  });

  const { data: salaryComponents = [] } = useQuery({
    queryKey: ['employeeSalaries', selectedEmployeeId],
    queryFn: () => selectedEmployeeId 
      ? base44.entities.EmployeeSalary.filter({ employee_id: selectedEmployeeId, is_current: true })
      : Promise.resolve([]),
    enabled: !!selectedEmployeeId
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences', selectedEmployeeId, periodStart, periodEnd],
    queryFn: async () => {
      if (!selectedEmployeeId) return [];
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      
      const allAbsences = await base44.entities.Absence.filter({ 
        employee_id: selectedEmployeeId 
      });
      
      return allAbsences.filter(absence => {
        const absStart = new Date(absence.fecha_inicio);
        const absEnd = absence.fecha_fin ? new Date(absence.fecha_fin) : new Date();
        return absStart <= end && absEnd >= start;
      });
    },
    enabled: !!selectedEmployeeId
  });

  const calculatePayroll = () => {
    if (!selectedEmployeeId) {
      toast.error("Selecciona un empleado");
      return;
    }

    setCalculating(true);
    
    setTimeout(() => {
      const employee = employees.find(e => e.id === selectedEmployeeId);
      const hours = (() => {
        if (typeof employee?.num_horas_jornada === 'number' && employee.num_horas_jornada > 0) return employee.num_horas_jornada;
        const parsed = parseFloat(employee?.num_horas_jornada);
        return isNaN(parsed) || parsed <= 0 ? 8 : parsed;
      })();
      const jornadaFactor = Math.max(0, hours / 8);
      
      // Calcular días trabajados
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      // Días de ausencia no remunerada
      const unpaidAbsenceDays = absences.filter(a => !a.remunerada).reduce((sum, absence) => {
        const aStart = new Date(absence.fecha_inicio);
        const aEnd = absence.fecha_fin ? new Date(absence.fecha_fin) : new Date();
        const days = Math.ceil((aEnd - aStart) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0);

      const workedDays = totalDays - unpaidAbsenceDays;
      
      // Calcular bruto base (8h) y ajustado por jornada
      const grossBase = salaryComponents.reduce((sum, comp) => sum + (comp.amount || 0), 0);
      const grossAdjusted = grossBase * jornadaFactor;
      
      // Prorrateado por días trabajados
      const proportionalGross = (grossAdjusted * workedDays) / totalDays;
      
      // Deducciones simuladas
      const irpfRate = proportionalGross > 2000 ? 0.15 : proportionalGross > 1500 ? 0.12 : 0.10;
      const irpfAmount = proportionalGross * irpfRate;
      
      const ssRate = 0.0635; // 6.35% aprox
      const ssAmount = proportionalGross * ssRate;
      
      const totalDeductions = irpfAmount + ssAmount;
      const netSalary = proportionalGross - totalDeductions;
      
      // Aportaciones empresa
      const employerSS = proportionalGross * 0.30; // ~30% aprox
      const totalCost = proportionalGross + employerSS;

      setSimulation({
        employee: employee.nombre,
        period: `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`,
        totalDays,
        workedDays,
        absenceDays: unpaidAbsenceDays,
        hoursPerDay: hours,
        jornadaFactor,
        grossBase,
        grossAdjusted,
        components: salaryComponents.map(c => ({
          name: c.component_name,
          amount: c.amount
        })),
        grossSalary: proportionalGross,
        deductions: {
          irpf: { rate: irpfRate, amount: irpfAmount },
          ss: { rate: ssRate, amount: ssAmount },
          total: totalDeductions
        },
        netSalary,
        employerContributions: employerSS,
        totalCost
      });
      
      setCalculating(false);
      toast.success("Nómina calculada");
    }, 800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* Configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Simulador de Nómina
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Seleccionar Empleado *</Label>
            <EmployeeSearchSelect
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              employees={employees}
              placeholder="Buscar empleado..."
              showDepartment={true}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inicio del Periodo</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fin del Periodo</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          {selectedEmployeeId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-medium mb-2">Componentes Salariales:</div>
              <div className="space-y-1">
                {salaryComponents.map(comp => (
                  <div key={comp.id} className="flex justify-between text-sm">
                    <span>{comp.component_name}</span>
                    <span className="font-medium">{comp.amount}€</span>
                  </div>
                ))}
                {salaryComponents.length === 0 && (
                  <p className="text-sm text-slate-500">No hay componentes configurados</p>
                )}
              </div>
            </div>
          )}

          {absences.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-sm font-medium mb-2">Ausencias en el Periodo:</div>
              <div className="space-y-1">
                {absences.map(abs => (
                  <div key={abs.id} className="text-xs flex justify-between">
                    <span>{abs.motivo}</span>
                    <Badge variant={abs.remunerada ? "secondary" : "destructive"} className="text-xs">
                      {abs.remunerada ? "Remunerada" : "No Remunerada"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button 
            onClick={calculatePayroll} 
            className="w-full" 
            disabled={calculating || !selectedEmployeeId}
          >
            {calculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Calcular Nómina
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card>
        <CardHeader>
          <CardTitle>Resultado de la Simulación</CardTitle>
        </CardHeader>
        <CardContent>
          {simulation ? (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                <div className="font-semibold text-lg mb-1">{simulation.employee}</div>
                <div className="text-sm text-slate-500">{simulation.period}</div>
                <div className="flex gap-4 mt-2 text-sm">
                  <span>Días totales: <strong>{simulation.totalDays}</strong></span>
                  <span>Trabajados: <strong>{simulation.workedDays}</strong></span>
                  {simulation.absenceDays > 0 && (
                    <span className="text-red-600">Ausencias: <strong>{simulation.absenceDays}</strong></span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Jornada: <strong>{simulation.hoursPerDay}h/día</strong> • Factor: <strong>{simulation.jornadaFactor.toFixed(3)}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-medium text-sm mb-2">Componentes Salariales:</div>
                {simulation.components.map((comp, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-white border rounded">
                    <span className="text-sm">{comp.name}</span>
                    <span className="font-medium">{comp.amount.toFixed(2)}€</span>
                  </div>
                ))}
                <div className="flex justify-between p-2 bg-white border rounded">
                  <span>Bruto Base (8h)</span>
                  <span className="font-medium">{simulation.grossBase.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between p-2 bg-white border rounded">
                  <span>Bruto Ajustado por Jornada</span>
                  <span className="font-medium">{simulation.grossAdjusted.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between p-3 bg-emerald-50 border-2 border-emerald-200 rounded font-semibold">
                  <span>BRUTO DEL PERIODO (ajustado y prorrateado)</span>
                  <span className="text-emerald-700">{simulation.grossSalary.toFixed(2)}€</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-medium text-sm mb-2">Deducciones:</div>
                <div className="flex justify-between p-2 bg-white border rounded text-sm">
                  <span>IRPF ({(simulation.deductions.irpf.rate * 100).toFixed(2)}%)</span>
                  <span className="font-medium text-red-600">-{simulation.deductions.irpf.amount.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between p-2 bg-white border rounded text-sm">
                  <span>Seguridad Social ({(simulation.deductions.ss.rate * 100).toFixed(2)}%)</span>
                  <span className="font-medium text-red-600">-{simulation.deductions.ss.amount.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between p-3 bg-red-50 border-2 border-red-200 rounded font-semibold text-sm">
                  <span>TOTAL DEDUCCIONES</span>
                  <span className="text-red-700">-{simulation.deductions.total.toFixed(2)}€</span>
                </div>
              </div>

              <div className="flex justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg font-bold text-lg">
                <span>SALARIO NETO</span>
                <span className="text-blue-700">{simulation.netSalary.toFixed(2)}€</span>
              </div>

              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Aportación Empresa (SS):</span>
                  <span className="font-medium">{simulation.employerContributions.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Coste Total Empresa:</span>
                  <span className="text-lg text-purple-700">{simulation.totalCost.toFixed(2)}€</span>
                </div>
              </div>

              <Button variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Descargar Vista Previa PDF
              </Button>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Calculator className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Selecciona un empleado y periodo para simular la nómina</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
