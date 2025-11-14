import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export default function MaintenanceForm({ maintenance, machines, employees, maintenanceTypes, onClose }) {
  const [formData, setFormData] = useState(maintenance || {
    machine_id: "",
    maintenance_type_id: "",
    tipo: "Mantenimiento Planificado",
    prioridad: "Media",
    estado: "Pendiente",
    fecha_programada: "",
    duracion_estimada: 0,
    tecnico_asignado: "",
    creado_por: "",
    descripcion: "",
    notas: "",
    tareas: [],
    alerta_activa: true,
    dias_anticipacion_alerta: 7,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("");
  const queryClient = useQueryClient();

  // Importar tareas del tipo de mantenimiento cuando se selecciona
  useEffect(() => {
    if (formData.maintenance_type_id && !maintenance?.id) {
      const selectedType = maintenanceTypes.find(mt => mt.id === formData.maintenance_type_id);
      if (selectedType) {
        const tareas = [];
        
        // Importar hasta 6 tareas
        for (let i = 1; i <= 6; i++) {
          const tarea = selectedType[`tarea_${i}`];
          if (tarea && tarea.nombre) {
            const subtareas = [];
            
            // Importar subtareas (hasta 8)
            for (let j = 1; j <= 8; j++) {
              const subtarea = tarea[`subtarea_${j}`];
              if (subtarea) {
                subtareas.push({
                  titulo: subtarea,
                  completada: false
                });
              }
            }
            
            tareas.push({
              titulo: tarea.nombre,
              descripcion: "",
              completada: false,
              subtareas: subtareas
            });
          }
        }
        
        setFormData(prev => ({ ...prev, tareas }));
      }
    }
  }, [formData.maintenance_type_id, maintenanceTypes, maintenance?.id]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (maintenance?.id) {
        return base44.entities.MaintenanceSchedule.update(maintenance.id, data);
      }
      return base44.entities.MaintenanceSchedule.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  // Filtrar solo empleados del departamento Mantenimiento
  const maintenanceTechnicians = useMemo(() => {
    return employees.filter(emp => 
      emp.departamento === "MANTENIMIENTO" || emp.departamento === "Mantenimiento"
    );
  }, [employees]);

  const getFilteredEmployees = (field) => {
    if (searchField !== field) return employees;
    return employees.filter(emp =>
      emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const EmployeeSearchSelect = ({ field, label, value, onChange }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Buscar ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar empleado..."
                value={searchField === field ? searchTerm : ""}
                onChange={(e) => {
                  e.stopPropagation();
                  setSearchField(field);
                  setSearchTerm(e.target.value);
                }}
                className="pl-10 mb-2"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <SelectItem value={null}>Sin asignar</SelectItem>
          {getFilteredEmployees(field).map((emp) => (
            <SelectItem key={emp.id} value={emp.id}>
              {emp.nombre} {emp.departamento && `(${emp.departamento})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {maintenance ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machine_id">Máquina *</Label>
              <Select
                value={formData.machine_id}
                onValueChange={(value) => setFormData({ ...formData, machine_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar máquina" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.nombre} ({machine.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance_type_id">Tipo de Mantenimiento Configurado</Label>
              <Select
                value={formData.maintenance_type_id || ""}
                onValueChange={(value) => setFormData({ ...formData, maintenance_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Ninguno</SelectItem>
                  {maintenanceTypes.filter(mt => mt.activo).map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.maintenance_type_id && (
                <p className="text-xs text-blue-600">
                  ✓ Las tareas se importarán automáticamente
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mantenimiento Planificado">Mantenimiento Planificado</SelectItem>
                  <SelectItem value="Reparación No Planificada">Reparación No Planificada</SelectItem>
                  <SelectItem value="Inspección">Inspección</SelectItem>
                  <SelectItem value="Calibración">Calibración</SelectItem>
                  <SelectItem value="Limpieza">Limpieza</SelectItem>
                  <SelectItem value="Predictivo">Predictivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridad">Prioridad *</Label>
              <Select
                value={formData.prioridad}
                onValueChange={(value) => setFormData({ ...formData, prioridad: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baja">Baja</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_programada">Fecha Programada *</Label>
              <Input
                id="fecha_programada"
                type="datetime-local"
                value={formData.fecha_programada}
                onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duracion_estimada">Duración Estimada (horas)</Label>
              <Input
                id="duracion_estimada"
                type="number"
                step="0.5"
                value={formData.duracion_estimada}
                onChange={(e) => setFormData({ ...formData, duracion_estimada: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tecnico_asignado">Técnico Asignado</Label>
              <Select
                value={formData.tecnico_asignado || ""}
                onValueChange={(value) => setFormData({ ...formData, tecnico_asignado: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar técnico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin asignar</SelectItem>
                  {maintenanceTechnicians.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Solo empleados del departamento Mantenimiento ({maintenanceTechnicians.length} disponibles)
              </p>
            </div>

            <EmployeeSearchSelect
              field="creado_por"
              label="Creado Por"
              value={formData.creado_por}
              onChange={(value) => setFormData({ ...formData, creado_por: value })}
            />

            <EmployeeSearchSelect
              field="revisado_por"
              label="Revisado Por"
              value={formData.revisado_por}
              onChange={(value) => setFormData({ ...formData, revisado_por: value })}
            />

            <EmployeeSearchSelect
              field="verificado_por"
              label="Verificado Por"
              value={formData.verificado_por}
              onChange={(value) => setFormData({ ...formData, verificado_por: value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas Adicionales</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}