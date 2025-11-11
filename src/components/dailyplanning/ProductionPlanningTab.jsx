import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save, Trash2, Edit, CheckCircle2, Factory } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProductionPlanningTab({ selectedDate, selectedTeam, selectedShift }) {
  const [showForm, setShowForm] = useState(false);
  const [editingPlanning, setEditingPlanning] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    machine_id: "",
    process_id: "",
    operadores_asignados: [],
    responsable_linea_id: "",
    segunda_linea_id: "",
    articulo: "",
    cantidad_objetivo: 0,
    notas: "",
  });

  const { data: plannings, isLoading } = useQuery({
    queryKey: ['dailyProductionPlannings', selectedDate, selectedTeam],
    queryFn: () => base44.entities.DailyProductionPlanning.list(),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    initialData: [],
  });

  const { data: processes } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list(),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const finalData = {
        ...data,
        fecha: selectedDate,
        team_key: selectedTeam,
        turno: selectedShift || "Mañana",
      };

      if (editingPlanning?.id) {
        return base44.entities.DailyProductionPlanning.update(editingPlanning.id, finalData);
      }
      return base44.entities.DailyProductionPlanning.create(finalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyProductionPlannings'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyProductionPlanning.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyProductionPlannings'] });
    },
  });

  const handleEdit = (planning) => {
    setEditingPlanning(planning);
    setFormData({
      machine_id: planning.machine_id || "",
      process_id: planning.process_id || "",
      operadores_asignados: planning.operadores_asignados || [],
      responsable_linea_id: planning.responsable_linea_id || "",
      segunda_linea_id: planning.segunda_linea_id || "",
      articulo: planning.articulo || "",
      cantidad_objetivo: planning.cantidad_objetivo || 0,
      notas: planning.notas || "",
    });
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingPlanning(null);
    setFormData({
      machine_id: "",
      process_id: "",
      operadores_asignados: [],
      responsable_linea_id: "",
      segunda_linea_id: "",
      articulo: "",
      cantidad_objetivo: 0,
      notas: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta planificación?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredPlannings = plannings.filter(
    p => p.fecha === selectedDate && p.team_key === selectedTeam
  );

  const fabricationEmployees = employees.filter(emp => {
    if (emp.departamento !== "FABRICACION") return false;
    if (emp.disponibilidad !== "Disponible") return false;
    if (emp.incluir_en_planning === false) return false;
    return true;
  });

  const responsables = fabricationEmployees.filter(e => 
    e.puesto?.toLowerCase().includes('responsable de linea')
  );
  const segundas = fabricationEmployees.filter(e => 
    e.puesto?.toLowerCase().includes('segunda de linea')
  );
  const operarios = fabricationEmployees.filter(e => 
    e.puesto?.toLowerCase().includes('operaria de linea')
  );

  const getMachineName = (id) => machines.find(m => m.id === id)?.nombre || 'N/A';
  const getProcessName = (id) => processes.find(p => p.id === id)?.nombre || 'N/A';
  const getEmployeeName = (id) => employees.find(e => e.id === id)?.nombre || 'N/A';

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="border-b border-blue-100">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Factory className="w-6 h-6" />
              Planificación de Producción - {selectedShift || 'Sin turno'}
            </CardTitle>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Planificación
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <p className="text-center text-slate-500 py-8">Cargando...</p>
          ) : filteredPlannings.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              No hay planificaciones para esta fecha y equipo
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Proceso</TableHead>
                    <TableHead>Artículo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlannings.map((planning) => (
                    <TableRow key={planning.id}>
                      <TableCell className="font-semibold">
                        {getMachineName(planning.machine_id)}
                      </TableCell>
                      <TableCell>{getProcessName(planning.process_id)}</TableCell>
                      <TableCell>{planning.articulo || '-'}</TableCell>
                      <TableCell>
                        {planning.cantidad_objetivo ? `${planning.cantidad_objetivo} uds` : '-'}
                      </TableCell>
                      <TableCell>
                        {getEmployeeName(planning.responsable_linea_id)}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          planning.estado === "Completado" ? "bg-green-100 text-green-800" :
                          planning.estado === "En Curso" ? "bg-blue-100 text-blue-800" :
                          "bg-slate-100 text-slate-600"
                        }>
                          {planning.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(planning)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(planning.id)}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <Card className="shadow-xl border-2 border-blue-300">
          <CardHeader className="bg-blue-50 border-b border-blue-200">
            <CardTitle>
              {editingPlanning ? 'Editar Planificación' : 'Nueva Planificación de Producción'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Máquina *</Label>
                  <Select
                    value={formData.machine_id}
                    onValueChange={(value) => setFormData({ ...formData, machine_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar máquina" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines.filter(m => m.estado === "Disponible").map((machine) => (
                        <SelectItem key={machine.id} value={machine.id}>
                          {machine.nombre} ({machine.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Proceso *</Label>
                  <Select
                    value={formData.process_id}
                    onValueChange={(value) => setFormData({ ...formData, process_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proceso" />
                    </SelectTrigger>
                    <SelectContent>
                      {processes.filter(p => p.activo).map((process) => (
                        <SelectItem key={process.id} value={process.id}>
                          {process.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Responsable de Línea</Label>
                  <Select
                    value={formData.responsable_linea_id}
                    onValueChange={(value) => setFormData({ ...formData, responsable_linea_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {responsables.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Segunda de Línea</Label>
                  <Select
                    value={formData.segunda_linea_id}
                    onValueChange={(value) => setFormData({ ...formData, segunda_linea_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {segundas.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Artículo</Label>
                  <Input
                    value={formData.articulo}
                    onChange={(e) => setFormData({ ...formData, articulo: e.target.value })}
                    placeholder="Código o nombre del artículo"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cantidad Objetivo</Label>
                  <Input
                    type="number"
                    value={formData.cantidad_objetivo}
                    onChange={(e) => setFormData({ ...formData, cantidad_objetivo: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}