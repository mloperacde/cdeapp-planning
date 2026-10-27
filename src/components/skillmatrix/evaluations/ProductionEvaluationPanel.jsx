import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ClipboardCheck, Clock3, Search, Upload, UserCheck, Users } from "lucide-react";
import EvaluationEmployeeList from "./EvaluationEmployeeList";
import EvaluationFormDialog from "./EvaluationFormDialog";
import EvaluationHistoryDialog from "./EvaluationHistoryDialog";
import ExcelEvaluationsImportDialog from "./ExcelEvaluationsImportDialog";
import { isProductionEmployee, isTemporalContract } from "./evaluationUtils";

const StatCard = ({ label, value, icon: Icon, tone }) => (
  <Card className={`p-2.5 flex items-center justify-between ${tone}`}>
    <div>
      <p className="text-[10px] font-medium text-slate-600">{label}</p>
      <p className="text-lg font-bold text-slate-900 leading-tight">{value}</p>
    </div>
    <Icon className="w-5 h-5 text-slate-500" />
  </Card>
);

export default function ProductionEvaluationPanel() {
  const [search, setSearch] = useState("");
  const [onlyTemporales, setOnlyTemporales] = useState(false);
  const [formEmployee, setFormEmployee] = useState(null);
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employeesMaster"],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list("nombre", 1000),
    initialData: [],
  });

  const { data: evaluations = [], isLoading: loadingEvaluations } = useQuery({
    queryKey: ["productionEvaluations"],
    queryFn: () => base44.entities.ProductionEvaluation.list("-fecha_evaluacion", 1000),
    initialData: [],
  });

  const productionEmployees = useMemo(() => employees.filter(isProductionEmployee), [employees]);

  const evaluationsByEmployee = useMemo(() => {
    const map = {};
    evaluations.forEach((evaluation) => {
      map[evaluation.employee_id] = map[evaluation.employee_id] || [];
      map[evaluation.employee_id].push(evaluation);
    });
    return map;
  }, [evaluations]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return productionEmployees
      .filter((employee) => !term || `${employee.nombre || ""} ${employee.puesto || ""}`.toLowerCase().includes(term))
      .filter((employee) => !onlyTemporales || isTemporalContract(employee))
      .map((employee) => ({
        employee,
        temporal: isTemporalContract(employee),
        evaluations: [...(evaluationsByEmployee[employee.id] || [])].sort((a, b) =>
          String(b.fecha_evaluacion || "").localeCompare(String(a.fecha_evaluacion || ""))
        ),
      }))
      .sort((a, b) => {
        if (a.temporal !== b.temporal) return a.temporal ? -1 : 1;
        return String(a.employee.nombre || "").localeCompare(String(b.employee.nombre || ""));
      });
  }, [productionEmployees, evaluationsByEmployee, search, onlyTemporales]);

  const stats = useMemo(() => {
    const temporales = productionEmployees.filter(isTemporalContract);
    return {
      total: productionEmployees.length,
      temporales: temporales.length,
      sinEvaluar: productionEmployees.filter((e) => !(evaluationsByEmployee[e.id] || []).length).length,
      temporalesSinEvaluar: temporales.filter((e) => !(evaluationsByEmployee[e.id] || []).length).length,
      evaluaciones: evaluations.length,
    };
  }, [productionEmployees, evaluationsByEmployee, evaluations]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
            Evaluaciones de producción
          </h2>
          <p className="text-[11px] text-slate-500">
            Evaluaciones a demanda de actitud, desempeño y habilidad técnica. Se priorizan los contratos temporales.
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs w-fit" onClick={() => setImportOpen(true)}>
          <Upload className="w-3.5 h-3.5 mr-1" /> Importar Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Empleados de producción" value={stats.total} icon={Users} tone="bg-blue-50 border-blue-200" />
        <StatCard label="Contratos temporales" value={stats.temporales} icon={Clock3} tone="bg-amber-50 border-amber-200" />
        <StatCard label="Temporales sin evaluar" value={stats.temporalesSinEvaluar} icon={UserCheck} tone="bg-rose-50 border-rose-200" />
        <StatCard label="Evaluaciones registradas" value={stats.evaluaciones} icon={ClipboardCheck} tone="bg-emerald-50 border-emerald-200" />
      </div>

      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre o puesto…"
                className="pl-9 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="solo-temporales" checked={onlyTemporales} onCheckedChange={setOnlyTemporales} />
              <Label htmlFor="solo-temporales" className="text-xs text-slate-600">
                Solo contratos temporales
              </Label>
            </div>
            <span className="text-[11px] text-slate-400">{rows.length} empleados</span>
          </div>

          <EvaluationEmployeeList
            rows={rows}
            loading={loadingEmployees || loadingEvaluations}
            onEvaluate={setFormEmployee}
            onHistory={setHistoryEmployee}
          />
        </CardContent>
      </Card>

      {formEmployee && (
        <EvaluationFormDialog employee={formEmployee} onClose={() => setFormEmployee(null)} />
      )}

      {historyEmployee && (
        <EvaluationHistoryDialog
          employee={historyEmployee}
          evaluations={evaluationsByEmployee[historyEmployee.id] || []}
          onClose={() => setHistoryEmployee(null)}
        />
      )}

      {importOpen && (
        <ExcelEvaluationsImportDialog
          employees={productionEmployees}
          evaluations={evaluations}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  );
}