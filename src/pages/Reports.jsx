import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import { FileText, Download, Filter, Calendar, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AIReportGenerator from "../components/reports/AIReportGenerator";
import ProtectedPage from "../components/roles/ProtectedPage";

export default function ReportsPage() {
  return (
    <ProtectedPage module="reports" action="view">
      <ReportsContent />
    </ProtectedPage>
  );
}

function ReportsContent() {
  const [reportType, setReportType] = useState("employees");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    staleTime: 5 * 60 * 1000,
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: absences } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio'),
    initialData: [],
  });

  const { data: maintenances } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => base44.entities.MaintenanceSchedule.list('-fecha_programada'),
    initialData: [],
  });

  const { data: plannings } = useQuery({
    queryKey: ['machinePlannings'],
    queryFn: () => base44.entities.MachinePlanning.list(),
    initialData: [],
  });

  const filteredData = useMemo(() => {
    let data = [];

    switch (reportType) {
      case "employees":
        data = employees.filter(emp => {
          const teamMatch = selectedTeam === "all" || emp.equipo === selectedTeam;
          return teamMatch;
        });
        break;

      case "absences":
        data = absences.filter(abs => {
          const dateMatch = (!startDate || new Date(abs.fecha_inicio) >= new Date(startDate)) &&
                           (!endDate || new Date(abs.fecha_fin) <= new Date(endDate));
          const empMatch = selectedEmployee === "all" || abs.employee_id === selectedEmployee;
          return dateMatch && empMatch;
        });
        break;

      case "maintenance":
        data = maintenances.filter(maint => {
          const dateMatch = (!startDate || new Date(maint.fecha_programada) >= new Date(startDate)) &&
                           (!endDate || new Date(maint.fecha_programada) <= new Date(endDate));
          const machineMatch = selectedMachine === "all" || maint.machine_id === selectedMachine;
          return dateMatch && machineMatch;
        });
        break;

      case "planning":
        data = plannings.filter(plan => {
          const dateMatch = (!startDate || plan.fecha_planificacion >= startDate) &&
                           (!endDate || plan.fecha_planificacion <= endDate);
          const teamMatch = selectedTeam === "all" || plan.team_key === selectedTeam;
          const machineMatch = selectedMachine === "all" || plan.machine_id === selectedMachine;
          return dateMatch && teamMatch && machineMatch && plan.activa_planning;
        });
        break;

      default:
        data = [];
    }

    return data;
  }, [reportType, startDate, endDate, selectedTeam, selectedMachine, selectedEmployee, employees, absences, maintenances, plannings]);

  const exportToCSV = () => {
    let csvContent = "";
    let headers = [];
    let rows = [];

    switch (reportType) {
      case "employees":
        headers = ["Código", "Nombre", "Equipo", "Puesto", "Tipo Jornada", "Tipo Turno", "Disponibilidad"];
        rows = filteredData.map(emp => [
          emp.codigo_empleado || "-",
          emp.nombre,
          emp.equipo,
          emp.puesto || "-",
          emp.tipo_jornada,
          emp.tipo_turno,
          emp.disponibilidad
        ]);
        break;

      case "absences":
        headers = ["Empleado", "Tipo", "Fecha Inicio", "Fecha Fin", "Motivo"];
        rows = filteredData.map(abs => [
          employees.find(e => e.id === abs.employee_id)?.nombre || "Desconocido",
          abs.tipo,
          format(new Date(abs.fecha_inicio), "dd/MM/yyyy HH:mm"),
          format(new Date(abs.fecha_fin), "dd/MM/yyyy HH:mm"),
          abs.motivo
        ]);
        break;

      case "maintenance":
        headers = ["Máquina", "Tipo", "Estado", "Fecha Programada", "Técnico"];
        rows = filteredData.map(maint => [
          machines.find(m => m.id === maint.machine_id)?.nombre || "Desconocida",
          maint.tipo,
          maint.estado,
          format(new Date(maint.fecha_programada), "dd/MM/yyyy HH:mm"),
          employees.find(e => e.id === maint.tecnico_asignado)?.nombre || "-"
        ]);
        break;

      case "planning":
        headers = ["Fecha", "Máquina", "Equipo", "Operadores Necesarios"];
        rows = filteredData.map(plan => [
          plan.fecha_planificacion,
          machines.find(m => m.id === plan.machine_id)?.nombre || "Desconocida",
          teams.find(t => t.team_key === plan.team_key)?.team_name || plan.team_key,
          plan.operadores_necesarios || 0
        ]);
        break;
    }

    csvContent = headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_${reportType}_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.click();
  };

  const getEmployeeName = (id) => {
    return employees.find(e => e.id === id)?.nombre || "Desconocido";
  };

  const getMachineName = (id) => {
    return machines.find(m => m.id === id)?.nombre || "Desconocida";
  };

  const getTeamName = (key) => {
    return teams.find(t => t.team_key === key)?.team_name || key;
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Informes y Reportes
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Genera reportes personalizados con filtros avanzados o usa IA
          </p>
        </div>

        <AIReportGenerator />

        {/* Configuración del Reporte */}
        <Card className="mb-6 mt-6 shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Configuración del Reporte
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportType">Tipo de Reporte</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employees">Empleados</SelectItem>
                    <SelectItem value="absences">Ausencias</SelectItem>
                    <SelectItem value="maintenance">Mantenimientos</SelectItem>
                    <SelectItem value="planning">Planificación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(reportType === "absences" || reportType === "maintenance" || reportType === "planning") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Fecha Inicio</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Fecha Fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              {(reportType === "employees" || reportType === "planning") && (
                <div className="space-y-2">
                  <Label htmlFor="team">Equipo</Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los Equipos</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.team_name}>
                          {team.team_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(reportType === "maintenance" || reportType === "planning") && (
                <div className="space-y-2">
                  <Label htmlFor="machine">Máquina</Label>
                  <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las Máquinas</SelectItem>
                      {machines.map(machine => (
                        <SelectItem key={machine.id} value={machine.id}>
                          {machine.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {reportType === "absences" && (
                <div className="space-y-2">
                  <Label htmlFor="employee">Empleado</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los Empleados</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={exportToCSV}
                disabled={filteredData.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle>
              Resultados ({filteredData.length} registros)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {filteredData.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                No se encontraron datos con los filtros seleccionados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                      {reportType === "employees" && (
                        <>
                          <TableHead>Código</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead>Puesto</TableHead>
                          <TableHead>Tipo Jornada</TableHead>
                          <TableHead>Disponibilidad</TableHead>
                        </>
                      )}
                      {reportType === "absences" && (
                        <>
                          <TableHead>Empleado</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Fecha Inicio</TableHead>
                          <TableHead>Fecha Fin</TableHead>
                          <TableHead>Motivo</TableHead>
                        </>
                      )}
                      {reportType === "maintenance" && (
                        <>
                          <TableHead>Máquina</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha Programada</TableHead>
                          <TableHead>Técnico</TableHead>
                        </>
                      )}
                      {reportType === "planning" && (
                        <>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Máquina</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead>Operadores</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportType === "employees" && filteredData.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell>{emp.codigo_empleado || "-"}</TableCell>
                        <TableCell className="font-semibold">{emp.nombre}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{emp.equipo}</Badge>
                        </TableCell>
                        <TableCell>{emp.puesto || "-"}</TableCell>
                        <TableCell>{emp.tipo_jornada}</TableCell>
                        <TableCell>
                          <Badge className={
                            emp.disponibilidad === "Disponible" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }>
                            {emp.disponibilidad}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}

                    {reportType === "absences" && filteredData.map(abs => (
                      <TableRow key={abs.id}>
                        <TableCell className="font-semibold">{getEmployeeName(abs.employee_id)}</TableCell>
                        <TableCell><Badge variant="outline">{abs.tipo}</Badge></TableCell>
                        <TableCell>{format(new Date(abs.fecha_inicio), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>{format(new Date(abs.fecha_fin), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>{abs.motivo}</TableCell>
                      </TableRow>
                    ))}

                    {reportType === "maintenance" && filteredData.map(maint => (
                      <TableRow key={maint.id}>
                        <TableCell className="font-semibold">{getMachineName(maint.machine_id)}</TableCell>
                        <TableCell>{maint.tipo}</TableCell>
                        <TableCell>
                          <Badge className={
                            maint.estado === "Completado" ? "bg-green-100 text-green-800" :
                            maint.estado === "En Progreso" ? "bg-blue-100 text-blue-800" :
                            "bg-yellow-100 text-yellow-800"
                          }>
                            {maint.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>{getEmployeeName(maint.tecnico_asignado)}</TableCell>
                      </TableRow>
                    ))}

                    {reportType === "planning" && filteredData.map(plan => (
                      <TableRow key={plan.id}>
                        <TableCell>{plan.fecha_planificacion}</TableCell>
                        <TableCell className="font-semibold">{getMachineName(plan.machine_id)}</TableCell>
                        <TableCell><Badge variant="outline">{getTeamName(plan.team_key)}</Badge></TableCell>
                        <TableCell>
                          <Badge className="bg-purple-100 text-purple-800">
                            {plan.operadores_necesarios || 0}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}