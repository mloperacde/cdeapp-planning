import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Users, Plus, Edit, Trash2, ArrowUpDown, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdvancedSearch from "../components/common/AdvancedSearch";
import ThemeToggle from "../components/common/ThemeToggle";
import { toast } from "sonner";

export default function EmployeesPage() {
  const [searchFilters, setSearchFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ field: "nombre", direction: "asc" });
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: masterEmployees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowDialog(false);
      setFormData({});
      toast.success("Empleado creado correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear empleado: " + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowDialog(false);
      setEditingEmployee(null);
      setFormData({});
      toast.success("Empleado actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar empleado: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Empleado eliminado correctamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar empleado: " + error.message);
    }
  });

  const filterOptions = useMemo(() => {
    const departamentos = [...new Set(employees.map(e => e.departamento).filter(Boolean))].sort();
    const puestos = [...new Set(employees.map(e => e.puesto).filter(Boolean))].sort();
    const equipos = teams.map(t => t.team_name);
    
    return {
      departamento: {
        label: 'Departamento',
        options: departamentos.map(d => ({ value: d, label: d }))
      },
      puesto: {
        label: 'Puesto',
        options: puestos.map(p => ({ value: p, label: p }))
      },
      equipo: {
        label: 'Equipo',
        options: equipos.map(e => ({ value: e, label: e }))
      },
      sexo: {
        label: 'Sexo',
        options: [
          { value: 'Masculino', label: 'Masculino' },
          { value: 'Femenino', label: 'Femenino' },
          { value: 'Otro', label: 'Otro' }
        ]
      },
      estado_empleado: {
        label: 'Estado',
        options: [
          { value: 'Alta', label: 'Alta' },
          { value: 'Baja', label: 'Baja' }
        ]
      }
    };
  }, [employees, teams]);

  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees.filter(emp => {
      const searchTerm = searchFilters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.departamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.puesto?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept = !searchFilters.departamento || searchFilters.departamento === "all" || 
        emp.departamento === searchFilters.departamento;
      
      const matchesPuesto = !searchFilters.puesto || searchFilters.puesto === "all" || 
        emp.puesto === searchFilters.puesto;
      
      const matchesTeam = !searchFilters.equipo || searchFilters.equipo === "all" || 
        emp.equipo === searchFilters.equipo;
      
      const matchesSex = !searchFilters.sexo || searchFilters.sexo === "all" || 
        emp.sexo === searchFilters.sexo;

      const matchesEstado = !searchFilters.estado_empleado || searchFilters.estado_empleado === "all" || 
        (emp.estado_empleado || "Alta") === searchFilters.estado_empleado;
      
      return matchesSearch && matchesDept && matchesPuesto && matchesTeam && matchesSex && matchesEstado;
    });

    filtered.sort((a, b) => {
      let aVal = a[sortConfig.field] || "";
      let bVal = b[sortConfig.field] || "";
      
      if (sortConfig.direction === "asc") {
        return aVal.toString().localeCompare(bVal.toString());
      } else {
        return bVal.toString().localeCompare(aVal.toString());
      }
    });

    return filtered;
  }, [employees, searchFilters, sortConfig]);

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    setFormData({
      nombre: "",
      codigo_empleado: "",
      departamento: "",
      puesto: "",
      equipo: "",
      sexo: "",
      tipo_jornada: "Jornada Completa",
      tipo_turno: "Rotativo",
      estado_empleado: "Alta"
    });
    setShowDialog(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData(employee);
    setShowDialog(true);
  };

  const handleDelete = (employee) => {
    if (window.confirm(`¿Eliminar a ${employee.nombre}?`)) {
      deleteMutation.mutate(employee.id);
    }
  };

  const handleSubmit = () => {
    if (!formData.nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const SortableHeader = ({ field, label }) => (
    <TableHead 
      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown 
          className={`w-4 h-4 transition-transform 
            ${sortConfig.field === field 
              ? `text-blue-600 dark:text-blue-400 ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}` 
              : 'text-slate-400 dark:text-slate-600'
            }`
          }
        />
      </div>
    </TableHead>
  );

  const stats = useMemo(() => {
    const total = employees.length;
    const activos = employees.filter(e => (e.estado_empleado || "Alta") === "Alta").length;
    const sincronizados = employees.filter(e => {
      const master = masterEmployees.find(m => m.employee_id === e.id);
      return master?.estado_sincronizacion === "Sincronizado";
    }).length;
    
    return { total, activos, sincronizados };
  }, [employees, masterEmployees]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("HRDashboard")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Panel RRHH
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Gestión de Empleados
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Listado maestro con edición completa
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Empleado
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Empleados</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium">Activos</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.activos}</p>
                </div>
                <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Sincronizados</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.sincronizados}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm mb-6">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="dark:text-slate-100">Filtros de Búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <AdvancedSearch
              data={employees}
              onFilterChange={setSearchFilters}
              searchFields={['nombre', 'codigo_empleado', 'departamento', 'puesto']}
              filterOptions={filterOptions}
              placeholder="Buscar por nombre, código, departamento o puesto..."
            />
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="dark:text-slate-100">
              Empleados ({filteredAndSortedEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">Cargando...</div>
            ) : filteredAndSortedEmployees.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                No hay empleados con los filtros aplicados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800">
                      <SortableHeader field="codigo_empleado" label="Código" />
                      <SortableHeader field="nombre" label="Nombre" />
                      <SortableHeader field="departamento" label="Departamento" />
                      <SortableHeader field="puesto" label="Puesto" />
                      <SortableHeader field="equipo" label="Equipo" />
                      <TableHead className="dark:text-slate-300">Estado</TableHead>
                      <TableHead className="text-center dark:text-slate-300">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedEmployees.map((emp) => (
                      <TableRow key={emp.id} className="dark:border-slate-800 dark:hover:bg-slate-800/50">
                        <TableCell className="font-mono text-xs dark:text-slate-300">
                          {emp.codigo_empleado || '-'}
                        </TableCell>
                        <TableCell className="font-semibold dark:text-slate-200">
                          {emp.nombre}
                        </TableCell>
                        <TableCell className="dark:text-slate-300">{emp.departamento || '-'}</TableCell>
                        <TableCell className="dark:text-slate-300">{emp.puesto || '-'}</TableCell>
                        <TableCell className="dark:text-slate-300">{emp.equipo || '-'}</TableCell>
                        <TableCell>
                          <Badge className={
                            (emp.estado_empleado || "Alta") === "Alta" 
                              ? "bg-green-600 dark:bg-green-700" 
                              : "bg-slate-600 dark:bg-slate-700"
                          }>
                            {emp.estado_empleado || "Alta"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(emp)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(emp)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">
              {editingEmployee ? "Editar Empleado" : "Nuevo Empleado"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="dark:text-slate-300">Nombre *</Label>
              <Input
                value={formData.nombre || ""}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                placeholder="Nombre completo"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Código Empleado</Label>
              <Input
                value={formData.codigo_empleado || ""}
                onChange={(e) => setFormData({...formData, codigo_empleado: e.target.value})}
                placeholder="Código"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Departamento</Label>
              <Input
                value={formData.departamento || ""}
                onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                placeholder="Departamento"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Puesto</Label>
              <Input
                value={formData.puesto || ""}
                onChange={(e) => setFormData({...formData, puesto: e.target.value})}
                placeholder="Puesto"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Equipo</Label>
              <Select value={formData.equipo || ""} onValueChange={(value) => setFormData({...formData, equipo: value})}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                  <SelectValue placeholder="Seleccionar equipo" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value={null} className="dark:text-slate-200">Sin equipo</SelectItem>
                  {teams.map(t => (
                    <SelectItem key={t.team_key} value={t.team_name} className="dark:text-slate-200">
                      {t.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Sexo</Label>
              <Select value={formData.sexo || ""} onValueChange={(value) => setFormData({...formData, sexo: value})}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                  <SelectValue placeholder="Seleccionar sexo" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="Masculino" className="dark:text-slate-200">Masculino</SelectItem>
                  <SelectItem value="Femenino" className="dark:text-slate-200">Femenino</SelectItem>
                  <SelectItem value="Otro" className="dark:text-slate-200">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Tipo de Jornada</Label>
              <Select value={formData.tipo_jornada || "Jornada Completa"} onValueChange={(value) => setFormData({...formData, tipo_jornada: value})}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="Jornada Completa" className="dark:text-slate-200">Jornada Completa</SelectItem>
                  <SelectItem value="Jornada Parcial" className="dark:text-slate-200">Jornada Parcial</SelectItem>
                  <SelectItem value="Reducción de Jornada" className="dark:text-slate-200">Reducción de Jornada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Tipo de Turno</Label>
              <Select value={formData.tipo_turno || "Rotativo"} onValueChange={(value) => setFormData({...formData, tipo_turno: value})}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="Rotativo" className="dark:text-slate-200">Rotativo</SelectItem>
                  <SelectItem value="Fijo Mañana" className="dark:text-slate-200">Fijo Mañana</SelectItem>
                  <SelectItem value="Fijo Tarde" className="dark:text-slate-200">Fijo Tarde</SelectItem>
                  <SelectItem value="Turno Partido" className="dark:text-slate-200">Turno Partido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Estado</Label>
              <Select value={formData.estado_empleado || "Alta"} onValueChange={(value) => setFormData({...formData, estado_empleado: value})}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="Alta" className="dark:text-slate-200">Alta</SelectItem>
                  <SelectItem value="Baja" className="dark:text-slate-200">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}