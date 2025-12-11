import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building, Plus, Pencil, Trash2, Network, User } from "lucide-react";
import { toast } from "sonner";
import ThemeToggle from "../components/common/ThemeToggle";

export default function DepartmentManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const queryClient = useQueryClient();

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Department.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success("Departamento eliminado");
    },
    onError: () => toast.error("Error al eliminar departamento")
  });

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este departamento?")) {
      deleteMutation.mutate(id);
    }
  };

  // Build hierarchy tree
  const buildTree = (depts, parentId = null, level = 0) => {
    return depts
      .filter(d => d.parent_id === parentId || (!parentId && !d.parent_id))
      .map(d => ({
        ...d,
        level,
        children: buildTree(depts, d.id, level + 1)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const getFlatTree = (tree, acc = []) => {
    tree.forEach(node => {
      acc.push(node);
      if (node.children) {
        getFlatTree(node.children, acc);
      }
    });
    return acc;
  };

  const treeData = buildTree(departments);
  const flatData = getFlatTree(treeData);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Network className="w-8 h-8 text-blue-600" />
              Gestión de Departamentos
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Configura la estructura organizativa y jerarquías
            </p>
          </div>
          <div className="flex gap-3">
            <ThemeToggle />
            <Button onClick={() => { setEditingDept(null); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Departamento
            </Button>
          </div>
        </div>

        <Card className="bg-white dark:bg-slate-900 shadow-lg border-0">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle>Estructura Organizativa</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flatData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No hay departamentos configurados
                    </TableCell>
                  </TableRow>
                ) : (
                  flatData.map((dept) => {
                    const manager = employees.find(e => e.id === dept.manager_id);
                    return (
                      <TableRow key={dept.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell>
                          <div style={{ paddingLeft: `${dept.level * 24}px` }} className="flex items-center gap-2">
                            {dept.level > 0 && <div className="w-4 h-px bg-slate-300" />}
                            <Building className="w-4 h-4 text-slate-500" />
                            <span className="font-medium">{dept.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {dept.code && (
                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                              {dept.code}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {manager ? (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-3 h-3 text-blue-500" />
                              {manager.nombre}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 max-w-xs truncate">
                          {dept.description}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditingDept(dept); setIsDialogOpen(true); }}
                            >
                              <Pencil className="w-4 h-4 text-slate-600 hover:text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(dept.id)}
                            >
                              <Trash2 className="w-4 h-4 text-slate-600 hover:text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <DepartmentDialog
        open={isDialogOpen}
        onClose={() => { setIsDialogOpen(false); setEditingDept(null); }}
        department={editingDept}
        departments={departments} // Pass all depts for parent selection
        employees={employees}
      />
    </div>
  );
}

function DepartmentDialog({ open, onClose, department, departments, employees }) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    parent_id: "none",
    manager_id: "none",
    color: "#3b82f6"
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || "",
        code: department.code || "",
        description: department.description || "",
        parent_id: department.parent_id || "none",
        manager_id: department.manager_id || "none",
        color: department.color || "#3b82f6"
      });
    } else {
      setFormData({
        name: "",
        code: "",
        description: "",
        parent_id: "none",
        manager_id: "none",
        color: "#3b82f6"
      });
    }
  }, [department, open]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        parent_id: data.parent_id === "none" ? null : data.parent_id,
        manager_id: data.manager_id === "none" ? null : data.manager_id
      };
      
      if (department) {
        return base44.entities.Department.update(department.id, payload);
      }
      return base44.entities.Department.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success(department ? "Departamento actualizado" : "Departamento creado");
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  // Filter out self from parent options to avoid cycles
  const parentOptions = departments.filter(d => !department || d.id !== department.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{department ? "Editar Departamento" : "Nuevo Departamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ej: FAB"
              />
            </div>
            <div className="space-y-2">
              <Label>Departamento Padre</Label>
              <Select
                value={formData.parent_id}
                onValueChange={val => setFormData({ ...formData, parent_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ninguno (Raíz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno (Raíz)</SelectItem>
                  {parentOptions.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Responsable</Label>
            <Select
              value={formData.manager_id}
              onValueChange={val => setFormData({ ...formData, manager_id: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar responsable" />
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
            <Label>Descripción</Label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}