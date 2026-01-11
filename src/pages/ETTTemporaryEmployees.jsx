import React, { useMemo, useState } from "react";
import { useAppData } from "../components/data/DataProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, AlertTriangle, CheckCircle2, Clock, Users, Filter, Download } from "lucide-react";
import { format, differenceInDays, isBefore, addDays } from "date-fns";
import { es } from "date-fns/locale";
import EmployeeForm from "../components/employees/EmployeeForm";

export default function ETTTemporaryEmployeesPage() {
  const [filters, setFilters] = useState({
    searchTerm: "",
    tipoContrato: "all",
    departamento: "all",
    alertaDias: "all",
    empresaETT: "all"
  });
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);

  const { employees, machines } = useAppData();

  // Filtrar empleados ETT y temporales
  const ettAndTemporaryEmployees = useMemo(() => {
    const today = new Date();
    
    return employees
      .filter(emp => {
        const tipoContrato = emp.tipo_contrato?.toUpperCase() || "";
        return tipoContrato.includes("ETT") || 
               tipoContrato.includes("TEMPORAL") || 
               tipoContrato.includes("OBRA Y SERVICIO") ||
               tipoContrato.includes("INTERINIDAD");
      })
      .map(emp => {
        const fechaFin = emp.fecha_fin_contrato ? new Date(emp.fecha_fin_contrato) : null;
        const diasRestantes = fechaFin ? differenceInDays(fechaFin, today) : null;
        const vencido = fechaFin ? isBefore(fechaFin, today) : false;
        
        let estadoAlerta = "ok";
        if (vencido) {
          estadoAlerta = "vencido";
        } else if (diasRestantes !== null && diasRestantes <= 7) {
          estadoAlerta = "critico";
        } else if (diasRestantes !== null && diasRestantes <= 30) {
          estadoAlerta = "proximo";
        }
        
        return {
          ...emp,
          diasRestantes,
          vencido,
          estadoAlerta
        };
      })
      .sort((a, b) => {
        if (a.vencido && !b.vencido) return -1;
        if (!a.vencido && b.vencido) return 1;
        if (a.diasRestantes === null && b.diasRestantes !== null) return 1;
        if (a.diasRestantes !== null && b.diasRestantes === null) return -1;
        if (a.diasRestantes !== null && b.diasRestantes !== null) {
          return a.diasRestantes - b.diasRestantes;
        }
        return 0;
      });
  }, [employees]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = ettAndTemporaryEmployees.length;
    const ettCount = ettAndTemporaryEmployees.filter(e => 
      e.tipo_contrato?.toUpperCase().includes("ETT")
    ).length;
    const temporalesCount = total - ettCount;
    
    const vencidos = ettAndTemporaryEmployees.filter(e => e.vencido).length;
    const proximos7dias = ettAndTemporaryEmployees.filter(e => 
      !e.vencido && e.diasRestantes !== null && e.diasRestantes <= 7
    ).length;
    const proximos30dias = ettAndTemporaryEmployees.filter(e => 
      !e.vencido && e.diasRestantes !== null && e.diasRestantes > 7 && e.diasRestantes <= 30
    ).length;
    const sinFecha = ettAndTemporaryEmployees.filter(e => !e.fecha_fin_contrato).length;
    
    return {
      total,
      ettCount,
      temporalesCount,
      vencidos,
      proximos7dias,
      proximos30dias,
      sinFecha
    };
  }, [ettAndTemporaryEmployees]);

  const empresasETT = useMemo(() => {
    const empresas = new Set();
    ettAndTemporaryEmployees.forEach(emp => {
      if (emp.empresa_ett) empresas.add(emp.empresa_ett);
    });
    return Array.from(empresas).sort();
  }, [ettAndTemporaryEmployees]);

  const departments = useMemo(() => {
    const depts = new Set();
    ettAndTemporaryEmployees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [ettAndTemporaryEmployees]);

  const filteredEmployees = useMemo(() => {
    return ettAndTemporaryEmployees.filter(emp => {
      const matchesSearch = !filters.searchTerm || 
        emp.nombre?.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      const matchesTipo = filters.tipoContrato === "all" || 
        (filters.tipoContrato === "ETT" && emp.tipo_contrato?.toUpperCase().includes("ETT")) ||
        (filters.tipoContrato === "TEMPORAL" && !emp.tipo_contrato?.toUpperCase().includes("ETT"));
      
      const matchesDept = filters.departamento === "all" || emp.departamento === filters.departamento;
      
      const matchesEmpresaETT = filters.empresaETT === "all" || emp.empresa_ett === filters.empresaETT;
      
      const matchesAlerta = filters.alertaDias === "all" ||
        (filters.alertaDias === "vencido" && emp.vencido) ||
        (filters.alertaDias === "7" && !emp.vencido && emp.diasRestantes !== null && emp.diasRestantes <= 7) ||
        (filters.alertaDias === "30" && !emp.vencido && emp.diasRestantes !== null && emp.diasRestantes > 7 && emp.diasRestantes <= 30) ||
        (filters.alertaDias === "sinFecha" && !emp.fecha_fin_contrato);
      
      return matchesSearch && matchesTipo && matchesDept && matchesAlerta && matchesEmpresaETT;
    });
  }, [ettAndTemporaryEmployees, filters]);

  const getEstadoBadge = (estadoAlerta, diasRestantes, vencido) => {
    if (vencido) {
      return <Badge className="bg-red-600 text-white">Vencido</Badge>;
    }
    if (estadoAlerta === "critico") {
      return <Badge className="bg-orange-600 text-white">≤ 7 días</Badge>;
    }
    if (estadoAlerta === "proximo") {
      return <Badge className="bg-amber-100 text-amber-800">≤ 30 días</Badge>;
    }
    if (diasRestantes === null) {
      return <Badge variant="outline">Sin fecha</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">OK</Badge>;
  };

  const handleExportCSV = () => {
    const csv = [
      "Empleado,Tipo Contrato,Empresa ETT,Departamento,Fecha Alta,Fecha Fin Contrato,Días Restantes,Estado",
      ...filteredEmployees.map(emp => [
        emp.nombre,
        emp.tipo_contrato || "",
        emp.empresa_ett || "",
        emp.departamento || "",
        emp.fecha_alta ? format(new Date(emp.fecha_alta), "dd/MM/yyyy") : "",
        emp.fecha_fin_contrato ? format(new Date(emp.fecha_fin_contrato), "dd/MM/yyyy") : "",
        emp.diasRestantes !== null ? emp.diasRestantes : "Sin fecha",
        emp.vencido ? "Vencido" : emp.estadoAlerta === "critico" ? "Crítico" : emp.estadoAlerta === "proximo" ? "Próximo" : "OK"
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `empleados_ett_temporales_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleViewDetail = (employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeForm(true);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Empleados ETT y Temporales
            </h1>
            <p className="text-slate-600 mt-1">
              Consulta y seguimiento de contratos temporales
            </p>
          </div>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total ETT + Temporales</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    ETT: {stats.ettCount} | Temp: {stats.temporalesCount}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Contratos Vencidos</p>
                  <p className="text-2xl font-bold text-red-900">{stats.vencidos}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Vencen en 7 días</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.proximos7dias}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Vencen en 30 días</p>
                  <p className="text-2xl font-bold text-amber-900">{stats.proximos30dias}</p>
                </div>
                <Calendar className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Buscar por Nombre</Label>
                <Input
                  placeholder="Nombre del empleado..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <Select value={filters.tipoContrato} onValueChange={(value) => setFilters({...filters, tipoContrato: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ETT">ETT</SelectItem>
                    <SelectItem value="TEMPORAL">Temporal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filters.tipoContrato !== "TEMPORAL" && (
                <div className="space-y-2">
                  <Label>Empresa ETT</Label>
                  <Select value={filters.empresaETT} onValueChange={(value) => setFilters({...filters, empresaETT: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {empresasETT.map((empresa) => (
                        <SelectItem key={empresa} value={empresa}>
                          {empresa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={filters.departamento} onValueChange={(value) => setFilters({...filters, departamento: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado de Alerta</Label>
                <Select value={filters.alertaDias} onValueChange={(value) => setFilters({...filters, alertaDias: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="vencido">Vencidos</SelectItem>
                    <SelectItem value="7">Vencen en ≤ 7 días</SelectItem>
                    <SelectItem value="30">Vencen en ≤ 30 días</SelectItem>
                    <SelectItem value="sinFecha">Sin fecha fin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>
              Listado de Empleados ({filteredEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Empleado</TableHead>
                    <TableHead>Tipo Contrato</TableHead>
                    <TableHead>Empresa ETT</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Fecha Alta</TableHead>
                    <TableHead>Fecha Fin Contrato</TableHead>
                    <TableHead>Días Restantes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        No hay empleados con los filtros seleccionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow 
                        key={employee.id} 
                        className={`hover:bg-slate-50 ${
                          employee.vencido ? 'bg-red-50' : 
                          employee.estadoAlerta === 'critico' ? 'bg-orange-50' : ''
                        }`}
                      >
                        <TableCell>
                          <div className="font-semibold text-slate-900">{employee.nombre}</div>
                          {employee.codigo_empleado && (
                            <div className="text-xs text-slate-500">{employee.codigo_empleado}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            employee.tipo_contrato?.toUpperCase().includes("ETT") 
                              ? "bg-purple-100 text-purple-800" 
                              : "bg-blue-100 text-blue-800"
                          }>
                            {employee.tipo_contrato || "No especificado"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-700">{employee.empresa_ett || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-700">{employee.departamento || "-"}</div>
                        </TableCell>
                        <TableCell>
                          {employee.fecha_alta ? (
                            <div className="text-sm">
                              {format(new Date(employee.fecha_alta), "dd/MM/yyyy", { locale: es })}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.fecha_fin_contrato ? (
                            <div className="text-sm font-medium">
                              {format(new Date(employee.fecha_fin_contrato), "dd/MM/yyyy", { locale: es })}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">Sin fecha</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.diasRestantes !== null ? (
                            <div className={`text-sm font-bold ${
                              employee.vencido ? 'text-red-600' :
                              employee.diasRestantes <= 7 ? 'text-orange-600' :
                              employee.diasRestantes <= 30 ? 'text-amber-600' :
                              'text-green-600'
                            }`}>
                              {employee.vencido ? `Vencido hace ${Math.abs(employee.diasRestantes)} días` : `${employee.diasRestantes} días`}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getEstadoBadge(employee.estadoAlerta, employee.diasRestantes, employee.vencido)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetail(employee)}
                          >
                            Ver Detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {stats.sinFecha > 0 && (
          <Card className="mt-6 bg-amber-50 border-2 border-amber-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">Atención: Contratos sin fecha de finalización</p>
                  <p className="text-sm text-amber-800 mt-1">
                    Hay <strong>{stats.sinFecha}</strong> empleado(s) ETT o temporal(es) sin fecha de fin de contrato registrada. 
                    Por favor, actualiza esta información para un mejor seguimiento.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showEmployeeForm && selectedEmployee && (
        <EmployeeForm
          employee={selectedEmployee}
          machines={machines}
          onClose={() => {
            setShowEmployeeForm(false);
            setSelectedEmployee(null);
          }}
        />
      )}
    </div>
  );
}