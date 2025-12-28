import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, Building2, Search, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function DepartmentManagementPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Queries
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre', 1000),
    initialData: [],
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Department.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success("Departamento creado correctamente");
      setShowDialog(false);
      setEditingDept(null);
    },
    onError: (err) => toast.error("Error al crear: " + err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Department.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success("Departamento actualizado correctamente");
      setShowDialog(false);
      setEditingDept(null);
    },
    onError: (err) => toast.error("Error al actualizar: " + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Department.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success("Departamento eliminado");
    },
    onError: (err) => toast.error("Error al eliminar: " + err.message)
  });

  // Filtered list
  const filteredDepartments = departments.filter(d => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Form handling
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      code: formData.get('code'),
      description: formData.get('description'),
      manager_id: formData.get('manager_id') || null,
      parent_id: formData.get('parent_id') || null,
      color: formData.get('color')
    };

    if (editingDept) {
      updateMutation.mutate({ id: editingDept.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getManagerName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.nombre : '-';
  };

  const getParentName = (id) => {
    const dept = departments.find(d => d.id === id);
    return dept ? dept.name : '-';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              Gestión de Departamentos
            </h1>
            <p className="text-slate-500">Configura la estructura organizativa de la empresa</p>
          </div>
        </div>
        <Button onClick={() => { setEditingDept(null); setShowDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Departamento
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[100px]">Color</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Departamento Padre</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No hay departamentos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDepartments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell>
                        <div 
                          className="w-6 h-6 rounded-full border shadow-sm" 
                          style={{ backgroundColor: dept.color || '#e2e8f0' }} 
                        />
                      </TableCell>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                          {dept.code || '-'}
                        </span>
                      </TableCell>
                      <TableCell>{getManagerName(dept.manager_id)}</TableCell>
                      <TableCell>{getParentName(dept.parent_id)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => { setEditingDept(dept); setShowDialog(true); }}
                          >
                            <Pencil className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              if (window.confirm('¿Estás seguro de eliminar este departamento?')) {
                                deleteMutation.mutate(dept.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDept ? 'Editar Departamento' : 'Nuevo Departamento'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={editingDept?.name} 
                  required 
                  placeholder="ej. Fabricación"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input 
                  id="code" 
                  name="code" 
                  defaultValue={editingDept?.code} 
                  placeholder="ej. FAB"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={editingDept?.description} 
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manager_id">Responsable</Label>
                <Select name="manager_id" defaultValue={editingDept?.manager_id || "none"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color" 
                    id="color" 
                    name="color" 
                    defaultValue={editingDept?.color || "#3b82f6"} 
                    className="w-12 p-1 h-10"
                  />
                  <Input 
                    type="text" 
                    defaultValue={editingDept?.color || "#3b82f6"}
                    className="flex-1"
                    onChange={(e) => document.getElementById('color').value = e.target.value}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_id">Departamento Padre</Label>
              <Select name="parent_id" defaultValue={editingDept?.parent_id || "none"}>
                <SelectTrigger>
                  <SelectValue placeholder="Ninguno (Nivel superior)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno (Nivel superior)</SelectItem>
                  {departments
                    .filter(d => d.id !== editingDept?.id) // Prevent self-parenting
                    .map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingDept ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}