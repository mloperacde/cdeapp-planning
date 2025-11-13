import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Award } from "lucide-react";
import { toast } from "sonner";

export default function SkillManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    categoria: "Técnica",
    descripcion: "",
    activo: true,
    departamentos_aplicables: []
  });

  const { data: skills, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => base44.entities.Skill.list('nombre'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const departments = [...new Set(employees.map(e => e.departamento).filter(Boolean))];

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingSkill?.id) {
        return base44.entities.Skill.update(editingSkill.id, data);
      }
      return base44.entities.Skill.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      handleClose();
      toast.success("Habilidad guardada correctamente");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Skill.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      toast.success("Habilidad eliminada");
    },
  });

  const handleEdit = (skill) => {
    setEditingSkill(skill);
    setFormData({
      nombre: skill.nombre,
      codigo: skill.codigo,
      categoria: skill.categoria || "Técnica",
      descripcion: skill.descripcion || "",
      activo: skill.activo ?? true,
      departamentos_aplicables: skill.departamentos_aplicables || []
    });
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingSkill(null);
    setFormData({
      nombre: "",
      codigo: "",
      categoria: "Técnica",
      descripcion: "",
      activo: true,
      departamentos_aplicables: []
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta habilidad?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleDepartment = (dept) => {
    const current = formData.departamentos_aplicables || [];
    if (current.includes(dept)) {
      setFormData({
        ...formData,
        departamentos_aplicables: current.filter(d => d !== dept)
      });
    } else {
      setFormData({
        ...formData,
        departamentos_aplicables: [...current, dept]
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Catálogo de Habilidades
            </CardTitle>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Habilidad
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">Cargando...</div>
          ) : skills.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No hay habilidades registradas</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Departamentos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skills.map((skill) => (
                  <TableRow key={skill.id} className="hover:bg-slate-50">
                    <TableCell>
                      <Badge variant="outline">{skill.codigo}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{skill.nombre}</div>
                        {skill.descripcion && (
                          <div className="text-xs text-slate-500">{skill.descripcion}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-purple-100 text-purple-800">{skill.categoria}</Badge>
                    </TableCell>
                    <TableCell>
                      {skill.departamentos_aplicables?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {skill.departamentos_aplicables.slice(0, 2).map(dept => (
                            <Badge key={dept} variant="outline" className="text-xs">{dept}</Badge>
                          ))}
                          {skill.departamentos_aplicables.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{skill.departamentos_aplicables.length - 2}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">Todos</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={skill.activo ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}>
                        {skill.activo ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(skill)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(skill.id)}
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
          )}
        </CardContent>
      </Card>

      {showForm && (
        <Dialog open={true} onOpenChange={() => setShowForm(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSkill ? 'Editar Habilidad' : 'Nueva Habilidad'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="SKL-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoría *</Label>
                  <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Técnica">Técnica</SelectItem>
                      <SelectItem value="Seguridad">Seguridad</SelectItem>
                      <SelectItem value="Calidad">Calidad</SelectItem>
                      <SelectItem value="Maquinaria">Maquinaria</SelectItem>
                      <SelectItem value="Proceso">Proceso</SelectItem>
                      <SelectItem value="Software">Software</SelectItem>
                      <SelectItem value="Idiomas">Idiomas</SelectItem>
                      <SelectItem value="Otra">Otra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="ej: Manejo de Máquina CNC"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Departamentos Aplicables</Label>
                <div className="grid grid-cols-3 gap-2">
                  {departments.map(dept => (
                    <div key={dept} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${dept}`}
                        checked={formData.departamentos_aplicables?.includes(dept)}
                        onCheckedChange={() => toggleDepartment(dept)}
                      />
                      <label htmlFor={`dept-${dept}`} className="text-sm">{dept}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <label htmlFor="activo" className="text-sm font-medium">Habilidad activa</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}