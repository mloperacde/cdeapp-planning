import { useMemo, useState } from "react";
import { useSharedAbsences, useSharedAbsenceTypes } from "@/components/utils/useSharedData";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AbsenceHistoryView() {
  const { data: absences = [] } = useSharedAbsences();
  const { data: absenceTypes = [] } = useSharedAbsenceTypes();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list("nombre", 500),
    initialData: [],
  });

  const [filters, setFilters] = useState({
    empleado_id: "all",
    departamento: "all",
    tipo_ausencia: "all",
    estado_aprobacion: "all",
    search: "",
  });

  const departamentos = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.departamento) set.add(e.departamento);
    });
    return Array.from(set).sort();
  }, [employees]);

  const tiposAusencia = useMemo(() => {
    if (Array.isArray(absenceTypes) && absenceTypes.length > 0) {
      return absenceTypes.map((t) => t.nombre || t.tipo || t.id).filter(Boolean);
    }
    const set = new Set();
    absences.forEach((a) => {
      if (a.tipo) set.add(a.tipo);
    });
    return Array.from(set).sort();
  }, [absenceTypes, absences]);

  const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatSafe = (value, pattern = "dd/MM/yyyy HH:mm") => {
    try {
      const d = parseDate(value);
      if (!d) return "-";
      return format(d, pattern, { locale: es });
    } catch {
      return "-";
    }
  };

  const filteredAbsences = useMemo(() => {
    return absences
      .slice()
      .sort((a, b) => {
        const da = parseDate(a.fecha_inicio);
        const db = parseDate(b.fecha_inicio);
        const ta = da ? da.getTime() : -Infinity;
        const tb = db ? db.getTime() : -Infinity;
        return tb - ta;
      })
      .filter((abs) => {
        const emp = employees.find((e) => e.id === abs.employee_id);

        if (filters.empleado_id !== "all" && abs.employee_id !== filters.empleado_id) {
          return false;
        }

        if (filters.departamento !== "all" && emp?.departamento !== filters.departamento) {
          return false;
        }

        if (filters.tipo_ausencia !== "all" && abs.tipo !== filters.tipo_ausencia) {
          return false;
        }

        if (
          filters.estado_aprobacion !== "all" &&
          abs.estado_aprobacion !== filters.estado_aprobacion
        ) {
          return false;
        }

        if (filters.search) {
          const term = filters.search.toLowerCase();
          const nombre = emp?.nombre?.toLowerCase() || "";
          const motivo = abs.motivo?.toLowerCase() || "";
          if (!nombre.includes(term) && !motivo.includes(term)) {
            return false;
          }
        }

        return true;
      });
  }, [absences, employees, filters]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <CalendarDays className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-sm">
              Histórico completo de ausencias
            </CardTitle>
            <p className="text-xs text-slate-500">
              Vista global para RRHH con filtros por empleado, departamento, tipo y estado.
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          Registros: <span className="font-semibold">{filteredAbsences.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Empleado</Label>
            <Select
              value={filters.empleado_id}
              onValueChange={(value) => setFilters((f) => ({ ...f, empleado_id: value }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Departamento</Label>
            <Select
              value={filters.departamento}
              onValueChange={(value) => setFilters((f) => ({ ...f, departamento: value }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departamentos.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Tipo de ausencia</Label>
            <Select
              value={filters.tipo_ausencia}
              onValueChange={(value) => setFilters((f) => ({ ...f, tipo_ausencia: value }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tiposAusencia.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Estado aprobación</Label>
            <Select
              value={filters.estado_aprobacion}
              onValueChange={(value) =>
                setFilters((f) => ({ ...f, estado_aprobacion: value }))
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Aprobada">Aprobada</SelectItem>
                <SelectItem value="Rechazada">Rechazada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Buscar (empleado o motivo)</Label>
            <Input
              className="h-8 text-xs"
              placeholder="Texto libre..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          {filteredAbsences.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No se han encontrado ausencias con los filtros seleccionados.
            </div>
          ) : (
            <div className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50 z-10">
                  <TableRow>
                    <TableHead className="text-xs">Empleado</TableHead>
                    <TableHead className="text-xs">Departamento</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Inicio</TableHead>
                    <TableHead className="text-xs">Fin</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">Remunerada</TableHead>
                    <TableHead className="text-xs">Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAbsences.map((abs) => {
                    const emp = employees.find((e) => e.id === abs.employee_id);
                    return (
                      <TableRow key={abs.id}>
                        <TableCell className="text-xs font-medium">
                          {emp?.nombre || "Desconocido"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {emp?.departamento || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {abs.tipo || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatSafe(abs.fecha_inicio)}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {abs.fecha_fin_desconocida
                            ? "Indefinida"
                            : formatSafe(abs.fecha_fin)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge
                            className={
                              abs.estado_aprobacion === "Aprobada"
                                ? "bg-green-100 text-green-800"
                                : abs.estado_aprobacion === "Rechazada"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }
                          >
                            {abs.estado_aprobacion || "Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge
                            className={
                              abs.remunerada
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }
                          >
                            {abs.remunerada ? "Sí" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-xs truncate">
                          {abs.motivo || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
