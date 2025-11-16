import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Edit, Trash2, Users, Search, Filter, Download, X, ChevronDown, ChevronUp } from "lucide-react";
import EmployeeForm from "../components/employees/EmployeeForm";
import { format, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";

export default function MasterEmployeeView() {
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    // Datos personales
    sexo: "all",
    nacionalidad: "all",
    formacion: "all",
    edad_min: "",
    edad_max: "",
    
    // Datos organizacionales
    departamento: "all",
    puesto: "all",
    categoria: "all",
    equipo: "all",
    
    // Datos de jornada
    tipo_jornada: "all",
    tipo_turno: "all",
    num_horas_min: "",
    num_horas_max: "",
    
    // Datos contractuales
    tipo_contrato: "all",
    empresa_ett: "all",
    estado_empleado: "all",
    
    // Disponibilidad
    disponibilidad: "all",
    incluir_en_planning: "all",
    
    // Taquilla
    taquilla_vestuario: "all",
    taquilla_numero: "all",
  });

  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const options = {
      sexo: new Set(),
      nacionalidad: new Set(),
      formacion: new Set(),
      departamento: new Set(),
      puesto: new Set(),
      categoria: new Set(),
      equipo: new Set(),
      tipo_jornada: new Set(),
      tipo_turno: new Set(),
      tipo_contrato: new Set(),
      empresa_ett: new Set(),
      taquilla_vestuario: new Set(),
    };

    employees.forEach(emp => {
      if (emp.sexo) options.sexo.add(emp.sexo);
      if (emp.nacionalidad) options.nacionalidad.add(emp.nacionalidad);
      if (emp.formacion) options.formacion.add(emp.formacion);
      if (emp.departamento) options.departamento.add(emp.departamento);
      if (emp.puesto) options.puesto.add(emp.puesto);
      if (emp.categoria) options.categoria.add(emp.categoria);
      if (emp.equipo) options.equipo.add(emp.equipo);
      if (emp.tipo_jornada) options.tipo_jornada.add(emp.tipo_jornada);
      if (emp.tipo_turno) options.tipo_turno.add(emp.tipo_turno);
      if (emp.tipo_contrato) options.tipo_contrato.add(emp.tipo_contrato);
      if (emp.empresa_ett) options.empresa_ett.add(emp.empresa_ett);
      if (emp.taquilla_vestuario) options.taquilla_vestuario.add(emp.taquilla_vestuario);
    });

    return {
      sexo: Array.from(options.sexo).sort(),
      nacionalidad: Array.from(options.nacionalidad).sort(),
      formacion: Array.from(options.formacion).sort(),
      departamento: Array.from(options.departamento).sort(),
      puesto: Array.from(options.puesto).sort(),
      categoria: Array.from(options.categoria).sort(),
      equipo: Array.from(options.equipo).sort(),
      tipo_jornada: Array.from(options.tipo_jornada).sort(),
      tipo_turno: Array.from(options.tipo_turno).sort(),
      tipo_contrato: Array.from(options.tipo_contrato).sort(),
      empresa_ett: Array.from(options.empresa_ett).sort(),
      taquilla_vestuario: Array.from(options.taquilla_vestuario).sort(),
    };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search term
      const matchesSearch = !searchTerm || 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.dni?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.nuss?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.telefono_movil?.includes(searchTerm);

      // Datos personales
      const matchesSexo = filters.sexo === "all" || emp.sexo === filters.sexo;
      const matchesNacionalidad = filters.nacionalidad === "all" || emp.nacionalidad === filters.nacionalidad;
      const matchesFormacion = filters.formacion === "all" || emp.formacion === filters.formacion;
      
      let matchesEdad = true;
      if (filters.edad_min || filters.edad_max) {
        if (emp.fecha_nacimiento) {
          const edad = differenceInYears(new Date(), new Date(emp.fecha_nacimiento));
          if (filters.edad_min && edad < parseInt(filters.edad_min)) matchesEdad = false;
          if (filters.edad_max && edad > parseInt(filters.edad_max)) matchesEdad = false;
        } else {
          matchesEdad = false;
        }
      }

      // Datos organizacionales
      const matchesDepartamento = filters.departamento === "all" || emp.departamento === filters.departamento;
      const matchesPuesto = filters.puesto === "all" || emp.puesto === filters.puesto;
      const matchesCategoria = filters.categoria === "all" || emp.categoria === filters.categoria;
      const matchesEquipo = filters.equipo === "all" || emp.equipo === filters.equipo;

      // Datos de jornada
      const matchesTipoJornada = filters.tipo_jornada === "all" || emp.tipo_jornada === filters.tipo_jornada;
      const matchesTipoTurno = filters.tipo_turno === "all" || emp.tipo_turno === filters.tipo_turno;
      
      let matchesHoras = true;
      if (filters.num_horas_min && emp.num_horas_jornada < parseInt(filters.num_horas_min)) matchesHoras = false;
      if (filters.num_horas_max && emp.num_horas_jornada > parseInt(filters.num_horas_max)) matchesHoras = false;

      // Datos contractuales
      const matchesTipoContrato = filters.tipo_contrato === "all" || emp.tipo_contrato === filters.tipo_contrato;
      const matchesEmpresaETT = filters.empresa_ett === "all" || emp.empresa_ett === filters.empresa_ett;
      const matchesEstado = filters.estado_empleado === "all" || (emp.estado_empleado || "Alta") === filters.estado_empleado;

      // Disponibilidad
      const matchesDisponibilidad = filters.disponibilidad === "all" || emp.disponibilidad === filters.disponibilidad;
      const matchesPlanning = filters.incluir_en_planning === "all" || 
        (filters.incluir_en_planning === "si" && emp.incluir_en_planning !== false) ||
        (filters.incluir_en_planning === "no" && emp.incluir_en_planning === false);

      // Taquilla
      const matchesVestuario = filters.taquilla_vestuario === "all" || emp.taquilla_vestuario === filters.taquilla_vestuario;
      const matchesTaquillaNum = filters.taquilla_numero === "all" || 
        !filters.taquilla_numero || 
        emp.taquilla_numero?.includes(filters.taquilla_numero);

      return matchesSearch && matchesSexo && matchesNacionalidad && matchesFormacion && matchesEdad &&
             matchesDepartamento && matchesPuesto && matchesCategoria && matchesEquipo &&
             matchesTipoJornada && matchesTipoTurno && matchesHoras &&
             matchesTipoContrato && matchesEmpresaETT && matchesEstado &&
             matchesDisponibilidad && matchesPlanning &&
             matchesVestuario && matchesTaquillaNum;
    });
  }, [employees, searchTerm, filters]);

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  const clearFilters = () => {
    setFilters({
      sexo: "all",
      nacionalidad: "all",
      formacion: "all",
      edad_min: "",
      edad_max: "",
      departamento: "all",
      puesto: "all",
      categoria: "all",
      equipo: "all",
      tipo_jornada: "all",
      tipo_turno: "all",
      num_horas_min: "",
      num_horas_max: "",
      tipo_contrato: "all",
      empresa_ett: "all",
      estado_empleado: "all",
      disponibilidad: "all",
      incluir_en_planning: "all",
      taquilla_vestuario: "all",
      taquilla_numero: "all",
    });
    setSearchTerm("");
  };

  const exportToCSV = () => {
    const headers = [
      "Código", "Nombre", "DNI", "NUSS", "Email", "Teléfono", "Sexo", "Nacionalidad", 
      "Fecha Nacimiento", "Edad", "Formación", "Departamento", "Puesto", "Categoría",
      "Tipo Jornada", "Horas Jornada", "Tipo Turno", "Equipo", "Tipo Contrato", 
      "Fecha Alta", "Estado", "Disponibilidad", "Vestuario", "Taquilla"
    ];

    const rows = filteredEmployees.map(emp => {
      const edad = emp.fecha_nacimiento ? 
        differenceInYears(new Date(), new Date(emp.fecha_nacimiento)) : "";
      
      return [
        emp.codigo_empleado || "",
        emp.nombre || "",
        emp.dni || "",
        emp.nuss || "",
        emp.email || "",
        emp.telefono_movil || "",
        emp.sexo || "",
        emp.nacionalidad || "",
        emp.fecha_nacimiento ? format(new Date(emp.fecha_nacimiento), "dd/MM/yyyy") : "",
        edad,
        emp.formacion || "",
        emp.departamento || "",
        emp.puesto || "",
        emp.categoria || "",
        emp.tipo_jornada || "",
        emp.num_horas_jornada || "",
        emp.tipo_turno || "",
        emp.equipo || "",
        emp.tipo_contrato || "",
        emp.fecha_alta ? format(new Date(emp.fecha_alta), "dd/MM/yyyy") : "",
        emp.estado_empleado || "Alta",
        emp.disponibilidad || "",
        emp.taquilla_vestuario || "",
        emp.taquilla_numero || ""
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `empleados_${format(new Date(), "yyyyMMdd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "all" && value !== "") count++;
    });
    return count;
  }, [searchTerm, filters]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Base de Datos Maestra de Empleados
            </h1>
            <p className="text-slate-600 mt-1">
              Gestión centralizada con todos los campos y filtros - {filteredEmployees.length} empleados
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Empleado
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                Filtros Avanzados
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
                    Limpiar Filtros
                  </Button>
                )}
                <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm">
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showFilters ? "Ocultar" : "Mostrar"}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {showFilters && (
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Búsqueda General */}
                <div>
                  <Label>Búsqueda General</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Buscar por nombre, DNI, NUSS, email, teléfono, código..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Datos Personales */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Datos Personales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Sexo</Label>
                      <Select value={filters.sexo} onValueChange={(value) => setFilters({...filters, sexo: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {filterOptions.sexo.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nacionalidad</Label>
                      <Select value={filters.nacionalidad} onValueChange={(value) => setFilters({...filters, nacionalidad: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {filterOptions.nacionalidad.map(n => (
                            <SelectItem key={n} value={n}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Edad Mínima</Label>
                      <Input
                        type="number"
                        placeholder="Ej: 18"
                        value={filters.edad_min}
                        onChange={(e) => setFilters({...filters, edad_min: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Edad Máxima</Label>
                      <Input
                        type="number"
                        placeholder="Ej: 65"
                        value={filters.edad_max}
                        onChange={(e) => setFilters({...filters, edad_max: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Datos Organizacionales */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Datos Organizacionales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Departamento</Label>
                      <Select value={filters.departamento} onValueChange={(value) => setFilters({...filters, departamento: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {filterOptions.departamento.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Puesto</Label>
                      <Select value={filters.puesto} onValueChange={(value) => setFilters({...filters, puesto: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {filterOptions.puesto.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select value={filters.categoria} onValueChange={(value) => setFilters({...filters, categoria: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {filterOptions.categoria.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Equipo</Label>
                      <Select value={filters.equipo} onValueChange={(value) => setFilters({...filters, equipo: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {filterOptions.equipo.map(e => (
                            <SelectItem key={e} value={e}>{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Datos de Jornada */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Datos de Jornada</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo Jornada</Label>
                      <Select value={filters.tipo_jornada} onValueChange={(value) => setFilters({...filters, tipo_jornada: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {filterOptions.tipo_jornada.map(tj => (
                            <SelectItem key={tj} value={tj}>{tj}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo Turno</Label>
                      <Select value={filters.tipo_turno} onValueChange={(value) => setFilters({...filters, tipo_turno: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {filterOptions.tipo_turno.map(tt => (
                            <SelectItem key={tt} value={tt}>{tt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Horas Mínimas</Label>
                      <Input
                        type="number"
                        placeholder="Ej: 20"
                        value={filters.num_horas_min}
                        onChange={(e) => setFilters({...filters, num_horas_min: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Horas Máximas</Label>
                      <Input
                        type="number"
                        placeholder="Ej: 40"
                        value={filters.num_horas_max}
                        onChange={(e) => setFilters({...filters, num_horas_max: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Datos Contractuales y Estado */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Datos Contractuales y Estado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo Contrato</Label>
                      <Select value={filters.tipo_contrato} onValueChange={(value) => setFilters({...filters, tipo_contrato: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {filterOptions.tipo_contrato.map(tc => (
                            <SelectItem key={tc} value={tc}>{tc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Empresa ETT</Label>
                      <Select value={filters.empresa_ett} onValueChange={(value) => setFilters({...filters, empresa_ett: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {filterOptions.empresa_ett.map(e => (
                            <SelectItem key={e} value={e}>{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select value={filters.estado_empleado} onValueChange={(value) => setFilters({...filters, estado_empleado: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="Alta">Alta</SelectItem>
                          <SelectItem value="Baja">Baja</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Disponibilidad</Label>
                      <Select value={filters.disponibilidad} onValueChange={(value) => setFilters({...filters, disponibilidad: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="Disponible">Disponible</SelectItem>
                          <SelectItem value="Ausente">Ausente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Planning y Taquilla */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Planning y Taquilla</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Incluir en Planning</Label>
                      <Select value={filters.incluir_en_planning} onValueChange={(value) => setFilters({...filters, incluir_en_planning: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="si">Sí</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Vestuario</Label>
                      <Select value={filters.taquilla_vestuario} onValueChange={(value) => setFilters({...filters, taquilla_vestuario: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {filterOptions.taquilla_vestuario.map(v => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nº Taquilla</Label>
                      <Input
                        placeholder="Buscar número..."
                        value={filters.taquilla_numero}
                        onChange={(e) => setFilters({...filters, taquilla_numero: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b">
            <CardTitle>Empleados ({filteredEmployees.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando empleados...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No se encontraron empleados con estos filtros
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Disponibilidad</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-sm">
                          {employee.codigo_empleado || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{employee.nombre}</div>
                          {employee.email && (
                            <div className="text-xs text-slate-500">{employee.email}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {employee.dni || "-"}
                        </TableCell>
                        <TableCell>{employee.departamento || "-"}</TableCell>
                        <TableCell>{employee.puesto || "-"}</TableCell>
                        <TableCell>
                          {employee.equipo ? (
                            <Badge variant="outline">{employee.equipo}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            (employee.estado_empleado || "Alta") === "Baja" 
                              ? "bg-red-600" 
                              : "bg-green-600"
                          }>
                            {employee.estado_empleado || "Alta"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            employee.disponibilidad === "Ausente"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }>
                            {employee.disponibilidad || "Disponible"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(employee)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(employee.id)}
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
        <EmployeeForm
          employee={editingEmployee}
          machines={machines}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}