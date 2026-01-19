import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdvancedReportGenerator() {
  const [filters, setFilters] = useState({
    tipo_reporte: "ausencias",
    fecha_inicio: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    fecha_fin: format(new Date(), 'yyyy-MM-dd'),
    departamento: "all",
    empleado_id: "all",
    tipo_ausencia: "all",
    machine_id: "all",
    incluir_graficos: true
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 500);
      return (Array.isArray(data) ? data : [])
        .map(m => ({
          id: m.id,
          nombre: m.nombre || '',
          codigo: m.codigo_maquina || m.codigo || '',
          orden: m.orden_visualizacion || 999
        }))
        .sort((a, b) => (a.orden || 999) - (b.orden || 999));
    },
    initialData: [],
  });

  const { data: plannings = [] } = useQuery({
    queryKey: ['machinePlannings'],
    queryFn: () => base44.entities.MachinePlanning.list(),
    initialData: [],
  });

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const absenceTypes = useMemo(() => {
    const types = new Set();
    absences.forEach(abs => {
      if (abs.tipo) types.add(abs.tipo);
    });
    return Array.from(types).sort();
  }, [absences]);

  const reportData = useMemo(() => {
    const startDate = new Date(filters.fecha_inicio);
    const endDate = new Date(filters.fecha_fin);

    if (filters.tipo_reporte === "ausencias") {
      let filtered = absences.filter(abs => {
        const absDate = new Date(abs.fecha_inicio);
        const matchesDate = absDate >= startDate && absDate <= endDate;
        
        const emp = employees.find(e => e.id === abs.employee_id);
        const matchesDept = filters.departamento === "all" || emp?.departamento === filters.departamento;
        const matchesEmp = filters.empleado_id === "all" || abs.employee_id === filters.empleado_id;
        const matchesType = filters.tipo_ausencia === "all" || abs.tipo === filters.tipo_ausencia;
        
        return matchesDate && matchesDept && matchesEmp && matchesType;
      });

      return {
        total: filtered.length,
        byType: Object.entries(
          filtered.reduce((acc, abs) => {
            acc[abs.tipo] = (acc[abs.tipo] || 0) + 1;
            return acc;
          }, {})
        ).map(([name, value]) => ({ name, value })),
        byEmployee: Object.entries(
          filtered.reduce((acc, abs) => {
            const emp = employees.find(e => e.id === abs.employee_id);
            const name = emp?.nombre || "Desconocido";
            acc[name] = (acc[name] || 0) + 1;
            return acc;
          }, {})
        ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        rawData: filtered
      };
    } else if (filters.tipo_reporte === "planificacion") {
      let filtered = plannings.filter(p => {
        const planDate = new Date(p.fecha_planificacion);
        const matchesDate = planDate >= startDate && planDate <= endDate;
        const matchesMachine = filters.machine_id === "all" || p.machine_id === filters.machine_id;
        
        return matchesDate && matchesMachine && p.activa_planning;
      });

      return {
        total: filtered.length,
        byMachine: Object.entries(
          filtered.reduce((acc, p) => {
            const machine = machines.find(m => m.id === p.machine_id);
            const name = machine?.nombre || "Desconocida";
            acc[name] = (acc[name] || 0) + 1;
            return acc;
          }, {})
        ).map(([name, value]) => ({ name, value })),
        rawData: filtered
      };
    } else if (filters.tipo_reporte === "absentismo") {
      const employeesFiltered = employees.filter(emp => {
        const matchesDept = filters.departamento === "all" || emp.departamento === filters.departamento;
        const matchesEmp = filters.empleado_id === "all" || emp.id === filters.empleado_id;
        return matchesDept && matchesEmp && emp.tasa_absentismo !== undefined;
      });

      return {
        total: employeesFiltered.length,
        byEmployee: employeesFiltered
          .map(emp => ({
            name: emp.nombre,
            tasa: emp.tasa_absentismo || 0,
            horas: emp.horas_no_trabajadas || 0
          }))
          .sort((a, b) => b.tasa - a.tasa),
        rawData: employeesFiltered
      };
    }

    return { total: 0, rawData: [] };
  }, [filters, absences, employees, machines, plannings]);

  const exportCSV = () => {
    let csv = "";
    
    if (filters.tipo_reporte === "ausencias") {
      csv = "Empleado,Tipo,Fecha Inicio,Fecha Fin,Motivo,Remunerada\n";
      reportData.rawData.forEach(abs => {
        const emp = employees.find(e => e.id === abs.employee_id);
        csv += `"${emp?.nombre}","${abs.tipo}","${format(new Date(abs.fecha_inicio), 'dd/MM/yyyy')}","${abs.fecha_fin ? format(new Date(abs.fecha_fin), 'dd/MM/yyyy') : 'N/A'}","${abs.motivo}","${abs.remunerada ? 'Sí' : 'No'}"\n`;
      });
    } else if (filters.tipo_reporte === "absentismo") {
      csv = "Empleado,Departamento,Tasa Absentismo (%),Horas No Trabajadas,Horas Esperadas\n";
      reportData.rawData.forEach(emp => {
        csv += `"${emp.nombre}","${emp.departamento || 'N/A'}","${emp.tasa_absentismo?.toFixed(2) || '0.00'}","${emp.horas_no_trabajadas || 0}","${emp.horas_deberian_trabajarse || 0}"\n`;
      });
    } else if (filters.tipo_reporte === "planificacion") {
      csv = "Máquina,Fecha,Equipo,Proceso,Operadores\n";
      reportData.rawData.forEach(p => {
        const machine = machines.find(m => m.id === p.machine_id);
        csv += `"${machine?.nombre}","${p.fecha_planificacion}","${p.team_key}","${p.process_id || 'N/A'}","${p.operadores_necesarios || 0}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_${filters.tipo_reporte}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success("CSV descargado");
  };

  const exportPDF = () => {
    window.print();
    toast.success("Abre la ventana de impresión para guardar como PDF");
  };

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444'];

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Generador de Reportes Avanzados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Reporte *</Label>
              <Select value={filters.tipo_reporte} onValueChange={(value) => setFilters({...filters, tipo_reporte: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ausencias">Ausencias</SelectItem>
                  <SelectItem value="absentismo">Absentismo</SelectItem>
                  <SelectItem value="planificacion">Planificación Máquinas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={filters.fecha_inicio}
                onChange={(e) => setFilters({...filters, fecha_inicio: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={filters.fecha_fin}
                onChange={(e) => setFilters({...filters, fecha_fin: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filters.tipo_reporte !== "planificacion" && (
              <>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select value={filters.departamento} onValueChange={(value) => setFilters({...filters, departamento: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Empleado</Label>
                  <Select value={filters.empleado_id} onValueChange={(value) => setFilters({...filters, empleado_id: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {filters.tipo_reporte === "ausencias" && (
              <div className="space-y-2">
                <Label>Tipo Ausencia</Label>
                <Select value={filters.tipo_ausencia} onValueChange={(value) => setFilters({...filters, tipo_ausencia: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {absenceTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filters.tipo_reporte === "planificacion" && (
              <div className="space-y-2">
                <Label>Máquina</Label>
                <Select value={filters.machine_id} onValueChange={(value) => setFilters({...filters, machine_id: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {machines.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t pt-4">
            <Checkbox
              checked={filters.incluir_graficos}
              onCheckedChange={(checked) => setFilters({...filters, incluir_graficos: checked})}
            />
            <label className="text-sm">Incluir gráficos en el reporte</label>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={exportCSV} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={exportPDF} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="report-content">
        <CardHeader className="border-b">
          <CardTitle>
            Reporte de {filters.tipo_reporte === "ausencias" ? "Ausencias" : filters.tipo_reporte === "absentismo" ? "Absentismo" : "Planificación"}
          </CardTitle>
          <p className="text-sm text-slate-600">
            Período: {format(new Date(filters.fecha_inicio), "dd/MM/yyyy", { locale: es })} - {format(new Date(filters.fecha_fin), "dd/MM/yyyy", { locale: es })}
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-xs text-blue-700 font-medium">Total Registros</p>
                <p className="text-3xl font-bold text-blue-900">{reportData.total}</p>
              </CardContent>
            </Card>
          </div>

          {filters.incluir_graficos && (
            <>
              {filters.tipo_reporte === "ausencias" && reportData.byType && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Por Tipo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={reportData.byType}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            dataKey="value"
                          >
                            {reportData.byType.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Por Empleado (Top 10)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={reportData.byEmployee?.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3B82F6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {filters.tipo_reporte === "absentismo" && reportData.byEmployee && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tasa de Absentismo por Empleado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={reportData.byEmployee.slice(0, 15)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis label={{ value: 'Tasa (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Bar dataKey="tasa" fill="#F59E0B" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {filters.tipo_reporte === "planificacion" && reportData.byMachine && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Días Activas por Máquina</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.byMachine}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-content, #report-content * { visibility: visible; }
          #report-content { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
