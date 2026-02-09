import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ArticleManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const queryClient = useQueryClient();

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('nombre'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingArticle?.id) {
        return base44.entities.Article.update(editingArticle.id, data);
      }
      return base44.entities.Article.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setShowForm(false);
      setEditingArticle(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Article.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['articles'] }),
  });

  const handleEdit = (article) => {
    setEditingArticle(article);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('¿Eliminar este artículo?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    saveMutation.mutate(data);
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Standard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Catálogo de Artículos
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Gestiona los artículos/productos que se fabrican
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setEditingArticle(null); setShowForm(true); }} size="sm" className="h-8 gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Artículo</span>
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col gap-6">

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Artículos ({articles.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Máquinas Asignadas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => {
                  const machineCount = [1,2,3,4,5,6,7,8,9,10]
                    .filter(n => article[`maquina_${n}`]).length;
                  
                  return (
                    <TableRow key={article.id}>
                      <TableCell className="font-mono font-semibold">{article.codigo}</TableCell>
                      <TableCell className="font-semibold">{article.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{machineCount} máquinas</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={article.activo ? "bg-green-600" : "bg-slate-400"}>
                          {article.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(article)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(article.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Dialog open={true} onOpenChange={() => { setShowForm(false); setEditingArticle(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingArticle ? 'Editar Artículo' : 'Nuevo Artículo'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input name="codigo" defaultValue={editingArticle?.codigo} required />
                </div>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input name="nombre" defaultValue={editingArticle?.nombre} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea name="descripcion" defaultValue={editingArticle?.descripcion} rows={2} />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Máquinas que pueden fabricar este artículo</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <div key={n} className="space-y-2">
                      <Label>Máquina {n}</Label>
                      <Select name={`maquina_${n}`} defaultValue={editingArticle?.[`maquina_${n}`] || ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Sin asignar</SelectItem>
                          {machines.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.nombre} ({m.codigo})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingArticle(null); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600" disabled={saveMutation.isPending}>
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
