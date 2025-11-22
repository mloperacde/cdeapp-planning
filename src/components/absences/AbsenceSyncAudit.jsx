import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/table";
import { FileText, Search, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AbsenceSyncAudit() {
  const [filters, setFilters] = useState({
    employee: "all",
    syncType: "all",
    status: "all"
  });

  const { data: syncHistory = [] } = useQuery({
    queryKey: ['employeeSyncHistory'],
    queryFn: () => base44.entities.EmployeeSyncHistory.list('-sync_date'),
    initialData: [],
  });

  const { data: masterEmployees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const getEmployeeName = (masterId) => {
    const emp = masterEmployees.find(e => e.id === masterId);
    return emp?.nombre || "Empleado desconocido";
  };

  const filteredHistory = syncHistory.filter(entry => {
    const matchesEmployee = filters.employee === "all" || entry.master_employee_id === filters.employee;
    const matchesSyncType = filters.syncType === "all" || entry.sync_type === filters.syncType;
    const matchesStatus = filters.status === "all" || entry.status === filters.status;
    
    return matchesEmployee && matchesSyncType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ Auditoría de Sincronización:</strong> Registro completo de todas las sincronizaciones
            realizadas entre la Base de Datos Maestra y el sistema operativo, incluyendo qué campos
            se modificaron y qué reglas se aplicaron.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base">Filtros de Auditoría</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select value={filters.employee} onValueChange={(value) => setFilters({...filters, employee: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Empleados</SelectItem>
                  {masterEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Sincronización</Label>
              <Select value={filters.syncType} onValueChange={(value) => setFilters({...filters, syncType: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Tipos</SelectItem>
                  <SelectItem value="Creación">Creación</SelectItem>
                  <SelectItem value="Sincronización Total">Sincronización Total</SelectItem>
                  <SelectItem value="Sincronización Parcial">Sincronización Parcial</SelectItem>
                  <SelectItem value="Sincronización Automática">Sincronización Automática</SelectItem>
                  <SelectItem value="Deshacer Sincronización">Deshacer Sincronización</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  <SelectItem value="Exitoso">Exitoso</SelectItem>
                  <SelectItem value="Error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Historial de Sincronizaciones ({filteredHistory.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No hay registros de sincronización
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Campos</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-slate-50">
                      <TableCell className="text-xs">
                        {format(new Date(entry.sync_date), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {getEmployeeName(entry.master_employee_id)}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          entry.sync_type === 'Creación' ? 'bg-green-600' :
                          entry.sync_type === 'Sincronización Automática' ? 'bg-blue-600' :
                          entry.sync_type === 'Deshacer Sincronización' ? 'bg-amber-600' :
                          'bg-purple-600'
                        }>
                          {entry.sync_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {entry.fields_synced?.slice(0, 3).map((field) => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                          {entry.fields_synced?.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{entry.fields_synced.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{entry.synced_by || 'Sistema'}</TableCell>
                      <TableCell>
                        {entry.status === 'Exitoso' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Exitoso
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Error
                          </Badge>
                        )}
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
  );
}