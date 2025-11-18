import React, { useState, useMemo } from "react";
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
import { Plus, Edit, Trash2, Cog, Search, Filter, Download, X, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MachineDetailCard from "../components/machines/MachineDetailCard";

export default function MasterMachineView() {
  const [showForm, setShowForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [viewingMachine, setViewingMachine] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tipo: "all",
    ubicacion: "all",
    marca: "all",
  });
  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    marca: "",
    modelo: "",
    numero_serie: "",
    fecha_compra: "",
    tipo: "",
    ubicacion: "",
    descripcion: "",
    programa_mantenimiento: "",
    orden: 0,
  });

  const queryClient = useQueryClient();

  const { data: machines, isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingMachine?.id) {
        return base44.entities.Machine.update(editingMachine.id, data);
      }
      return base44.entities.Machine.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setShowForm(false);
      setEditingMachine(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Machine.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });

  const filterOptions = useMemo(() => {
    const options = {
      tipo: new Set(),
      ubicacion: new Set(),
      marca: new Set(),
    };

    machines.forEach(machine => {
      if (machine.tipo) options.tipo.add(machine.tipo);
      if (machine.ubicacion) options.ubicacion.add(machine.ubicacion);
      if (machine.marca) options.marca.add(machine.marca);
    });

    return {
      tipo: Array.from(options.tipo).sort(),
      ubicacion: Array.from(options.ubicacion).sort(),
      marca: Array.from(options.marca).sort(),
    };
  }, [machines]);

  const filteredMachines = useMemo(() => {
    return machines.filter(machine => {
      const matchesSearch = !searchTerm || 
        machine.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.numero_serie?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTipo = filters.tipo === "all" || machine.tipo === filters.tipo;
      const matchesUbicacion = filters.ubicacion === "all" || machine.ubicacion === filters.ubicacion;
      const matchesMarca = filters.marca === "all" || machine.marca === filters.marca;

      return matchesSearch && matchesTipo && matchesUbicacion && matchesMarca;
    });
  }, [machines, searchTerm, filters]);

  const handleEdit = (machine) => {
    setEditingMachine(machine);
    setFormData({
      nombre: machine.nombre || "",
      codigo: machine.codigo || "",
      marca: machine.marca || "",
      modelo: machine.modelo || "",
      numero_serie: machine.numero_serie || "",
      fecha_compra: machine.fecha_compra || "",
      tipo: machine.tipo || "",
      ubicacion: machine.ubicacion || "",
      descripcion: machine.descripcion || "",
      programa_mantenimiento: machine.programa_mantenimiento || "",
      orden: machine.orden || 0,
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta máquina?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      codigo: "",
      marca: "",
      modelo: "",
      numero_serie: "",
      fecha_compra: "",
      tipo: "",
      ubicacion: "",
      descripcion: "",
      programa_mantenimiento: "",
      orden: 0,
    });
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingMachine(null);
    resetForm();
  };

  const clearFilters = () => {
    setFilters({
      tipo: "all",
      ubicacion: "all",
      marca: "all",
    });
    setSearchTerm("");
  };

  const exportToCSV = () => {
    const headers = [
      "Código", "Nombre", "Marca", "Modelo", "Nº Serie", "Tipo", "Ubicación", 
      "Fecha Compra", "Programa Mantenimiento", "Orden"
    ];

    const rows = filteredMachines.map(machine => [
      machine.codigo || "",
      machine.nombre || "",
      machine.marca || "",
      machine.modelo || "",
      machine.numero_serie || "",
      machine.tipo || "",
      machine.ubicacion || "",
      machine.fecha_compra ? format(new Date(machine.fecha_compra), "dd/MM/yyyy") : "",
      machine.programa_mantenimiento || "",
      machine.orden || 0
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `maquinas_${format(new Date(), "yyyyMMdd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "all") count++;
    });
    return count;
  }, [searchTerm, filters]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Cog className="w-8 h-8 text-blue-600" />
              Base de Datos Maestra de Máquinas
            </h1>
            <p className="text-slate-600 mt-1">
              Gestión centralizada - {filteredMachines.length} máquinas
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Máquina
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge className="bg-blue-600">
                    {activeFilterCount} activos
                  </Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {activeFilterCount > 0 && (
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    <X className="w-4 h-4 mr-2" />
                    Limpiar
                  </Button>
                )}
                <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm">
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {showFilters && (
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por código, nombre, marca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Select value={filters.marca} onValueChange={(value) => setFilters({...filters, marca: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {filterOptions.marca.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={filters.tipo} onValueChange={(value) => setFilters({...filters, tipo: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {filterOptions.tipo.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ubicación</Label>
                  <Select value={filters.ubicacion} onValueChange={(value) => setFilters({...filters, ubicacion: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {filterOptions.ubicacion.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b">
            <CardTitle>Máquinas ({filteredMachines.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando máquinas...</div>
            ) : filteredMachines.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No se encontraron máquinas con estos filtros
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMachines.map((machine) => (
                      <TableRow key={machine.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono font-semibold">
                          {machine.codigo}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {machine.nombre}
                        </TableCell>
                        <TableCell>
                          {machine.marca && machine.modelo ? (
                            <span>{machine.marca} {machine.modelo}</span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{machine.tipo || "-"}</TableCell>
                        <TableCell>{machine.ubicacion || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewingMachine(machine)}
                              title="Ver ficha"
                            >
                              <FileText className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(machine)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(machine.id)}
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
      </div>

      {showForm && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMachine ? 'Editar Máquina' : 'Nueva Máquina'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_serie">Número de Serie</Label>
                  <Input
                    id="numero_serie"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_compra">Fecha de Compra</Label>
                  <Input
                    id="fecha_compra"
                    type="date"
                    value={formData.fecha_compra}
                    onChange={(e) => setFormData({ ...formData, fecha_compra: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Input
                    id="tipo"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubicacion">Ubicación</Label>
                  <Input
                    id="ubicacion"
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    />
                    </div>

                    <div className="space-y-2">
                  <Label htmlFor="orden">Orden</Label>
                  <Input
                    id="orden"
                    type="number"
                    value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                  />
                </div>
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
                <Label htmlFor="programa_mantenimiento">Programa de Mantenimiento</Label>
                <Textarea
                  id="programa_mantenimiento"
                  value={formData.programa_mantenimiento}
                  onChange={(e) => setFormData({ ...formData, programa_mantenimiento: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
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

      {viewingMachine && (
        <MachineDetailCard
          machine={viewingMachine}
          onClose={() => setViewingMachine(null)}
        />
      )}
    </div>
  );
}