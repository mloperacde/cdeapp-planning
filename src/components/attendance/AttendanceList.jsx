import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CheckCircle2, 
  Clock, 
  UserX, 
  AlertTriangle,
  Edit,
  Search,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function AttendanceList({ selectedDate, onDateChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [editingRecord, setEditingRecord] = useState(null);
  const queryClient = useQueryClient();

  const { data: attendanceRecords } = useQuery({
    queryKey: ['attendanceRecords'],
    queryFn: () => base44.entities.AttendanceRecord.list('-fecha'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AttendanceRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      toast.success("Registro actualizado");
      setEditingRecord(null);
    },
  });

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(record => {
      if (record.fecha !== selectedDate) return false;

      const employee = employees.find(e => e.id === record.employee_id);
      if (!employee) return false;

      const matchesSearch = employee.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || record.estado === filterStatus;
      const matchesDept = filterDept === "all" || employee.departamento === filterDept;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [attendanceRecords, selectedDate, searchTerm, filterStatus, filterDept, employees]);

  const getEmployeeName = (empId) => {
    return employees.find(e => e.id === empId)?.nombre || "Desconocido";
  };

  const getEmployeeDept = (empId) => {
    return employees.find(e => e.id === empId)?.departamento || "";
  };

  const getStatusBadge = (estado) => {
    const styles = {
      "A tiempo": "bg-green-100 text-green-800",
      "Presente": "bg-green-100 text-green-800",
      "Retraso": "bg-amber-100 text-amber-800",
      "Ausencia": "bg-red-100 text-red-800",
      "Salida anticipada": "bg-orange-100 text-orange-800"
    };
    return <Badge className={styles[estado] || "bg-slate-100"}>{estado}</Badge>;
  };

  const handleJustify = (record) => {
    setEditingRecord(record);
  };

  const handleSaveJustification = () => {
    if (!editingRecord) return;
    
    updateMutation.mutate({
      id: editingRecord.id,
      data: {
        justificado: true,
        motivo_justificacion: editingRecord.motivo_justificacion || "Justificado por supervisor"
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex justify-between items-center">
            <CardTitle>Registros de Presencia</CardTitle>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-48"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Filtros */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar empleado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="A tiempo">A tiempo</SelectItem>
                <SelectItem value="Retraso">Retrasos</SelectItem>
                <SelectItem value="Ausencia">Ausencias</SelectItem>
                <SelectItem value="Salida anticipada">Salida anticipada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No hay registros para esta fecha
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id} className={record.estado === "Ausencia" ? "bg-red-50" : ""}>
                      <TableCell>
                        <div>
                          <div className="font-semibold">{getEmployeeName(record.employee_id)}</div>
                          {record.justificado && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              Justificado
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getEmployeeDept(record.employee_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.turno_programado}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="text-slate-500">{record.hora_entrada_programada}</div>
                          <div className={`font-semibold ${
                            record.minutos_retraso_entrada > 0 ? "text-red-700" : "text-green-700"
                          }`}>
                            {record.hora_entrada_real || "—"}
                            {record.minutos_retraso_entrada > 0 && (
                              <span className="text-xs ml-1">(+{record.minutos_retraso_entrada}m)</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="text-slate-500">{record.hora_salida_programada}</div>
                          <div className="font-semibold">{record.hora_salida_real || "—"}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.estado)}</TableCell>
                      <TableCell>
                        {record.horas_trabajadas ? `${record.horas_trabajadas.toFixed(1)}h` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {!record.justificado && (record.estado === "Retraso" || record.estado === "Ausencia") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleJustify(record)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Justificar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para justificar */}
      {editingRecord && (
        <Dialog open={true} onOpenChange={() => setEditingRecord(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Justificar Incidencia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600">Empleado:</p>
                <p className="font-semibold">{getEmployeeName(editingRecord.employee_id)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Incidencia:</p>
                <Badge className={
                  editingRecord.estado === "Ausencia" ? "bg-red-600" : "bg-amber-600"
                }>
                  {editingRecord.estado}
                  {editingRecord.minutos_retraso_entrada > 0 && ` - ${editingRecord.minutos_retraso_entrada} min`}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>Motivo de Justificación</Label>
                <Textarea
                  value={editingRecord.motivo_justificacion || ""}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    motivo_justificacion: e.target.value
                  })}
                  rows={3}
                  placeholder="Explica el motivo..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditingRecord(null)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveJustification}
                  disabled={updateMutation.isPending}
                >
                  Guardar Justificación
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}