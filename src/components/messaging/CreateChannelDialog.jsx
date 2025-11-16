
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, Filter } from "lucide-react";

export default function CreateChannelDialog({ onClose, employees = [], currentEmployee }) {
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    tipo: "General",
    equipo: "",
    departamento: "",
    participantes: []
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const queryClient = useQueryClient();

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (e.id === currentEmployee?.id) return false;
      
      const matchesSearch = !searchTerm.trim() || (
        e.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.dni?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.equipo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const matchesDept = filterDept === "all" || e.departamento === filterDept;
      const matchesEstado = filterEstado === "all" || (e.estado_empleado || "Alta") === filterEstado;
      
      return matchesSearch && matchesDept && matchesEstado;
    });
  }, [employees, currentEmployee, searchTerm, filterDept, filterEstado]);

  const createChannelMutation = useMutation({
    mutationFn: async (data) => {
      let participantes = [];
      
      if (data.tipo === "General") {
        participantes = currentEmployee?.id ? [currentEmployee.id] : [];
      } else if (data.tipo === "Equipo" && data.equipo) {
        participantes = employees.filter(e => e.equipo === data.equipo).map(e => e.id);
      } else if (data.tipo === "Departamento" && data.departamento) {
        participantes = employees.filter(e => e.departamento === data.departamento).map(e => e.id);
      } else if (data.tipo === "Direct") {
        participantes = [...data.participantes];
        if (currentEmployee?.id && !participantes.includes(currentEmployee.id)) {
          participantes.push(currentEmployee.id);
        }
      }

      const channelData = {
        nombre: data.nombre,
        descripcion: data.descripcion || "",
        tipo: data.tipo,
        participantes,
        admins: currentEmployee?.id ? [currentEmployee.id] : [],
        activo: true,
        ultimo_mensaje_fecha: new Date().toISOString()
      };

      if (data.tipo === "Equipo" && data.equipo) {
        channelData.equipo = data.equipo;
      }
      if (data.tipo === "Departamento" && data.departamento) {
        channelData.departamento = data.departamento;
      }

      return base44.entities.ChatChannel.create(channelData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatChannels'] });
      onClose();
    },
  });

  const toggleParticipant = (empId) => {
    const current = formData.participantes;
    const updated = current.includes(empId)
      ? current.filter(id => id !== empId)
      : [...current, empId];
    setFormData({ ...formData, participantes: updated });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createChannelMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Canal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Canal *</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value, equipo: "", departamento: "", participantes: []})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Equipo">Equipo</SelectItem>
                <SelectItem value="Departamento">Departamento</SelectItem>
                <SelectItem value="Direct">Mensaje Directo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.tipo === "Equipo" && (
            <div className="space-y-2">
              <Label>Equipo *</Label>
              <Select value={formData.equipo} onValueChange={(value) => setFormData({...formData, equipo: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar equipo" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.team_name}>
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.tipo === "Departamento" && (
            <div className="space-y-2">
              <Label>Departamento *</Label>
              <Select value={formData.departamento} onValueChange={(value) => setFormData({...formData, departamento: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nombre del Canal *</Label>
            <Input
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              placeholder="ej. Equipo Mañana, Departamento Producción..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              placeholder="Descripción del canal (opcional)"
              rows={2}
            />
          </div>

          {formData.tipo === "Direct" && employees.length > 0 && (
            <div className="space-y-2">
              <Label>Seleccionar Participantes *</Label>
              
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="relative col-span-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por nombre, DNI, código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger>
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded p-3 max-h-64 overflow-y-auto space-y-2">
                {filteredEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded">
                    <Checkbox
                      id={`participant-${emp.id}`}
                      checked={formData.participantes.includes(emp.id)}
                      onCheckedChange={() => toggleParticipant(emp.id)}
                    />
                    <label 
                      htmlFor={`participant-${emp.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      <div className="font-medium">{emp.nombre}</div>
                      <div className="text-xs text-slate-500">
                        {emp.codigo_empleado && `${emp.codigo_empleado} • `}
                        {emp.departamento || 'Sin dept.'} • {emp.puesto || 'Sin puesto'}
                      </div>
                    </label>
                  </div>
                ))}
                {filteredEmployees.length === 0 && (
                  <p className="text-center text-slate-500 text-sm py-4">
                    No se encontraron empleados
                  </p>
                )}
              </div>
              {formData.participantes.length > 0 && (
                <p className="text-xs text-slate-600">
                  {formData.participantes.length} participante(s) seleccionado(s)
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createChannelMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createChannelMutation.isPending ? "Creando..." : "Crear Canal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
