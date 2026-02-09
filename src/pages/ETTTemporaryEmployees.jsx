import { useMemo, useState } from "react";
import { useAppData } from "../components/data/DataProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, AlertTriangle, CheckCircle2, Clock, Users, Filter, Download, UserPlus, Pencil } from "lucide-react";
import { format, differenceInDays, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import EmployeeForm from "../components/employees/EmployeeForm";

// Initial Seed Data (Fallback)
const INITIAL_PROFILES = {
  "tecnico-proceso": {
    id: "tecnico-proceso",
    title: "Técnico de Proceso",
    mission: "El Técnico de Proceso es el máximo responsable operativo de una línea de fabricación...",
    onboarding: [
      { phase: "Semana 1", focus: "Seguridad y Entorno", milestones: "Seguridad de máquinas, protocolos LOTO..." },
      { phase: "Semana 2", focus: "Gestión y Control", milestones: "Manejo de la App interna, control de procesos..." },
      { phase: "Semana 3", focus: "Técnica Operativa", milestones: "Cambios de formato, ajustes finos..." },
      { phase: "Semana 4", focus: "Autonomía", milestones: "Arranque de línea independiente..." }
    ],
    responsibilities: [],
    protocols: [],
    handover: [],
    troubleshooting: []
  }
};

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
  const [showOnboardingDialog, setShowOnboardingDialog] = useState(false);
  const [selectedForOnboarding, setSelectedForOnboarding] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState("");

  const { employees, machines } = useAppData();
  const queryClient = useQueryClient();

  // Fetch Profiles
  const { data: profiles } = useQuery({
    queryKey: ['positionProfiles'],
    queryFn: async () => {
      try {
        const config = await base44.entities.AppConfig.list();
        const profileConfig = config.find(c => c.key === 'position_profiles_v1');
        if (profileConfig) return JSON.parse(profileConfig.value);
        return INITIAL_PROFILES;
      } catch (e) {
        return INITIAL_PROFILES;
      }
    },
    initialData: INITIAL_PROFILES
  });

  const assignOnboardingMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Check if already exists
      const existing = await base44.entities.EmployeeOnboarding.filter({ employee_id: data.employeeId });
      if (existing.length > 0) {
        throw new Error("El empleado ya tiene un proceso de onboarding activo o completado.");
      }

      // 2. Create Onboarding Record
      return base44.entities.EmployeeOnboarding.create({
        employee_id: data.employeeId,
        profile_id: data.profileId,
        fecha_inicio: new Date().toISOString(),
        estado: "Pendiente",
        progreso: 0,
        tareas_completadas: []
      });
    },
    onSuccess: () => {
      toast.success("Proceso de onboarding asignado correctamente");
      setShowOnboardingDialog(false);
      setSelectedForOnboarding(null);
      setSelectedProfileId("");
      queryClient.invalidateQueries({ queryKey: ['employeeOnboardings'] });
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleAssignOnboardingClick = (employee) => {
    setSelectedForOnboarding(employee);
    setSelectedProfileId(""); // Reset
    setShowOnboardingDialog(true);
  };

  const confirmAssignOnboarding = () => {
    if (!selectedForOnboarding || !selectedProfileId) return;
    assignOnboardingMutation.mutate({
      employeeId: selectedForOnboarding.id,
      profileId: selectedProfileId
    });
  };

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
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header Section Compact */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Personal ETT y Temporal
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Gestión y seguimiento de contratos temporales y vencimientos
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-2" onClick={handleExportCSV}>
            <Download className="w-3 h-3" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col gap-2">
        {/* Stats Row Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 shrink-0">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Total</p>
                <div className="text-xl font-bold">{stats.total}</div>
              </div>
              <Users className="w-4 h-4 text-slate-400" />
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase">ETT</p>
                <div className="text-xl font-bold text-blue-600">{stats.ettCount}</div>
              </div>
              <div className="h-2 w-2 rounded-full bg-blue-500" />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Temporales</p>
                <div className="text-xl font-bold text-indigo-600">{stats.temporalesCount}</div>
              </div>
              <div className="h-2 w-2 rounded-full bg-indigo-500" />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Vencidos</p>
                <div className="text-xl font-bold text-red-600">{stats.vencidos}</div>
              </div>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Prox. 7 días</p>
                <div className="text-xl font-bold text-orange-600">{stats.proximos7dias}</div>
              </div>
              <Clock className="w-4 h-4 text-orange-500" />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-500 uppercase">Prox. 30 días</p>
                <div className="text-xl font-bold text-amber-600">{stats.proximos30dias}</div>
              </div>
              <Calendar className="w-4 h-4 text-amber-500" />
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table Area */}
        <Card className="flex-1 flex flex-col shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {/* Filters Toolbar */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative flex-1 max-w-xs">
              <Filter className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Buscar por nombre..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                className="pl-8 h-8 text-xs bg-white dark:bg-slate-950"
              />
            </div>
            
            <div className="flex flex-1 gap-2 overflow-x-auto pb-1 sm:pb-0">
              <Select value={filters.tipoContrato} onValueChange={(v) => setFilters({...filters, tipoContrato: v})}>
                <SelectTrigger className="h-8 w-[130px] text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="ETT">Solo ETT</SelectItem>
                  <SelectItem value="TEMPORAL">Solo Temporales</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.departamento} onValueChange={(v) => setFilters({...filters, departamento: v})}>
                <SelectTrigger className="h-8 w-[160px] text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los dept.</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.empresaETT} onValueChange={(v) => setFilters({...filters, empresaETT: v})}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Empresa ETT" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas empresas</SelectItem>
                  {empresasETT.map(emp => (
                    <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.alertaDias} onValueChange={(v) => setFilters({...filters, alertaDias: v})}>
                <SelectTrigger className="h-8 w-[140px] text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Estado contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="vencido">Vencidos</SelectItem>
                  <SelectItem value="7">Próximos (7 días)</SelectItem>
                  <SelectItem value="30">Próximos (30 días)</SelectItem>
                  <SelectItem value="sinFecha">Sin fecha fin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[250px] text-xs font-semibold">Empleado</TableHead>
                  <TableHead className="text-xs font-semibold">Tipo Contrato</TableHead>
                  <TableHead className="text-xs font-semibold">Empresa ETT</TableHead>
                  <TableHead className="text-xs font-semibold">Departamento</TableHead>
                  <TableHead className="text-xs font-semibold">Fecha Fin</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Días</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Estado</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="font-medium text-xs">
                        <div>{employee.nombre}</div>
                        <div className="text-[10px] text-slate-500">{employee.puesto}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="font-normal text-[10px]">
                          {employee.tipo_contrato}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {employee.empresa_ett || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {employee.departamento}
                      </TableCell>
                      <TableCell className="text-xs">
                        {employee.fecha_fin_contrato ? (
                          format(new Date(employee.fecha_fin_contrato), "dd MMM yyyy", { locale: es })
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {employee.diasRestantes !== null ? (
                          <span className={employee.diasRestantes <= 7 ? "font-bold text-red-600" : ""}>
                            {employee.diasRestantes}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getEstadoBadge(employee.estadoAlerta, employee.diasRestantes, employee.vencido)}
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          title="Editar Ficha"
                          onClick={() => handleViewDetail(employee)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Asignar Onboarding"
                          onClick={() => handleAssignOnboardingClick(employee)}
                        >
                          <UserPlus className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-slate-500">
                      No se encontraron empleados que coincidan con los filtros
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {stats.sinFecha > 0 && (
          <Card className="shrink-0 bg-amber-50 border border-amber-200">
            <CardContent className="p-2 px-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-xs text-amber-800">
                  Hay <strong>{stats.sinFecha}</strong> empleado(s) sin fecha de fin de contrato.
                </p>
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

      <Dialog open={showOnboardingDialog} onOpenChange={setShowOnboardingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Proceso de Onboarding</DialogTitle>
            <DialogDescription>
              Seleccione el perfil de puesto para iniciar el onboarding de <strong>{selectedForOnboarding?.nombre}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-2">
              <Label>Perfil / Puesto</Label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar perfil..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(profiles).map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProfileId && profiles[selectedProfileId] && (
                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border mt-2">
                  <p className="font-medium">Resumen del plan:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>{(profiles[selectedProfileId].onboarding || []).length} fases definidas</li>
                    <li>{(profiles[selectedProfileId].responsibilities || []).length} áreas de responsabilidad</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnboardingDialog(false)}>Cancelar</Button>
            <Button onClick={confirmAssignOnboarding} disabled={!selectedProfileId || assignOnboardingMutation.isPending}>
              {assignOnboardingMutation.isPending ? "Asignando..." : "Asignar Onboarding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
