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
} from "@/components/ui/table.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";

export default function ProcessTypesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const queryClient = useQueryClient();

  const { data: processTypes = [], isLoading } = useQuery({
    queryKey: ['processTypes'],
    queryFn: () => base44.entities.ProcessType.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingProcess) {
        return base44.entities.ProcessType.update(editingProcess.id, data);
      }
      return base44.entities.ProcessType.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processTypes'] });
      setIsDialogOpen(false);
      setEditingProcess(null);
      toast.success(editingProcess ? "Tipo de proceso actualizado" : "Tipo de proceso creado");
    },
    onError: () => toast.error("Error al guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProcessType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processTypes'] });
      toast.success("Tipo de proceso eliminado");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      operators_required: parseInt(formData.get("operators_required")),
      description: formData.get("description"),
    };
    saveMutation.mutate(data);
  };

  const handleEdit = (process) => {
    setEditingProcess(process);
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm("¿Estás seguro de eliminar este tipo de proceso?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-blue-600" />
            Tipos de Proceso
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configuración de procesos de fabricación y requisitos de personal
          </p>
        </div>
        <Button onClick={() => { setEditingProcess(null); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Tipo de Proceso
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Operadores Requeridos</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    No hay tipos de proceso definidos
                  </TableCell>
                </TableRow>
              ) : (
                processTypes.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="font-medium">{process.name}</TableCell>
                    <TableCell>{process.operators_required}</TableCell>
                    <TableCell className="text-slate-600 max-w-md truncate">{process.description}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(process)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(process.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) setEditingProcess(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProcess ? "Editar Tipo de Proceso" : "Nuevo Tipo de Proceso"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input 
                id="name" 
                name="name" 
                defaultValue={editingProcess?.name} 
                required 
                placeholder="Ej. Envasado Líquidos" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operators_required">Operadores Requeridos *</Label>
              <Input 
                id="operators_required" 
                name="operators_required" 
                type="number" 
                min="1" 
                defaultValue={editingProcess?.operators_required || 1} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={editingProcess?.description} 
                placeholder="Detalles del proceso..." 
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}