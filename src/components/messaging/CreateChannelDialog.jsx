import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import EmployeeSelect from "../common/EmployeeSelect";
import { X } from "lucide-react";

export default function CreateChannelDialog({ onClose, employees, currentEmployee }) {
  const [tipo, setTipo] = useState("Equipo");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([currentEmployee?.id]);
  const [departamento, setDepartamento] = useState("");
  const [equipo, setEquipo] = useState("");
  const queryClient = useQueryClient();

  const departamentos = useMemo(() => {
    return [...new Set(employees.map(e => e.departamento).filter(Boolean))].sort();
  }, [employees]);

  const equipos = useMemo(() => {
    return [...new Set(employees.map(e => e.equipo).filter(Boolean))].sort();
  }, [employees]);

  const createChannelMutation = useMutation({
    mutationFn: async (data) => {
      let participantes = [...selectedParticipants];
      
      if (tipo === "Departamento" && departamento) {
        const deptEmployees = employees.filter(e => e.departamento === departamento);
        participantes = [...new Set([...participantes, ...deptEmployees.map(e => e.id)])];
      } else if (tipo === "Equipo" && equipo) {
        const teamEmployees = employees.filter(e => e.equipo === equipo);
        participantes = [...new Set([...participantes, ...teamEmployees.map(e => e.id)])];
      }

      return base44.entities.ChatChannel.create({
        ...data,
        participantes,
        admins: [currentEmployee?.id],
        activo: true,
        ultimo_mensaje_fecha: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatChannels'] });
      toast.success("Canal creado exitosamente");
      onClose();
    },
    onError: (error) => {
      toast.error("Error al crear canal: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (tipo === "Direct" && selectedParticipants.length !== 2) {
      toast.error("Los mensajes directos requieren exactamente 2 participantes");
      return;
    }

    if (!nombre.trim()) {
      toast.error("El nombre del canal es requerido");
      return;
    }

    createChannelMutation.mutate({
      nombre,
      descripcion,
      tipo,
      departamento: tipo === "Departamento" ? departamento : undefined,
      equipo: tipo === "Equipo" ? equipo : undefined
    });
  };

  const toggleParticipant = (employeeId) => {
    if (selectedParticipants.includes(employeeId)) {
      setSelectedParticipants(selectedParticipants.filter(p => p !== employeeId));
    } else {
      setSelectedParticipants([...selectedParticipants, employeeId]);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Canal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Canal</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Direct">Mensaje Directo</SelectItem>
                <SelectItem value="Equipo">Canal de Equipo</SelectItem>
                <SelectItem value="Departamento">Canal de Departamento</SelectItem>
                <SelectItem value="General">Canal General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo === "Equipo" && (
            <div className="space-y-2">
              <Label>Equipo</Label>
              <Select value={equipo} onValueChange={setEquipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar equipo" />
                </SelectTrigger>
                <SelectContent>
                  {equipos.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo === "Departamento" && (
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={departamento} onValueChange={setDepartamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nombre del Canal</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={
                tipo === "Direct" ? "Mensaje directo" :
                tipo === "Equipo" ? "Ej: Equipo 1 - Coordinación" :
                tipo === "Departamento" ? "Ej: Producción - General" :
                "Ej: Avisos Generales"
              }
            />
          </div>

          {tipo !== "Direct" && (
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe el propósito de este canal..."
                rows={2}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Participantes</Label>
            <div className="space-y-3">
              <EmployeeSelect
                employees={employees.filter(e => e.id !== currentEmployee?.id)}
                value=""
                onValueChange={(empId) => {
                  if (empId && !selectedParticipants.includes(empId)) {
                    setSelectedParticipants([...selectedParticipants, empId]);
                  }
                }}
                placeholder="Buscar y añadir empleado..."
              />
              
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {selectedParticipants.filter(id => id !== currentEmployee?.id).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-2">
                    No hay participantes seleccionados
                  </p>
                ) : (
                  selectedParticipants.filter(id => id !== currentEmployee?.id).map(empId => {
                    const emp = employees.find(e => e.id === empId);
                    return emp ? (
                      <div key={empId} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div>
                          <span className="text-sm font-medium">{emp.nombre}</span>
                          {emp.departamento && (
                            <span className="text-xs text-slate-500 ml-2">({emp.departamento})</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleParticipant(empId)}
                        >
                          <X className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    ) : null;
                  })
                )}
              </div>
              
              <p className="text-xs text-slate-500">
                {selectedParticipants.filter(id => id !== currentEmployee?.id).length} participante(s) seleccionado(s)
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createChannelMutation.isPending}>
              Crear Canal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
