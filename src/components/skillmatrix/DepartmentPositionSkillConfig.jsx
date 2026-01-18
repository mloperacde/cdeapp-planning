import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, Plus, Edit, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function DepartmentPositionSkillConfig() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterPuesto, setFilterPuesto] = useState("all");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    departamento: "",
    puesto: "",
    skill_id: "",
    importancia: "Media",
    nivel_minimo_requerido: "Básico",
    nivel_deseable: "",
    obligatorio: true,
    descripcion: "",
    activo: true
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: () => base44.entities.Skill.list('nombre'),
    initialData: [],
  });

  const { data: deptPositionSkills } = useQuery({
    queryKey: ['departmentPositionSkills'],
    queryFn: () => base44.entities.DepartmentPositionSkill.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingItem?.id) {
        return base44.entities.DepartmentPositionSkill.update(editingItem.id, data);
      }
      return base44.entities.DepartmentPositionSkill.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departmentPositionSkills'] });
      handleClose();
      toast.success("Configuración guardada");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DepartmentPositionSkill.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departmentPositionSkills'] });
      toast.success("Requisito eliminado");
    },
  });

  const departments = useMemo(() => 
    [...new Set(employees.map(e => e.departamento).filter(Boolean))], 
    [employees]
  );

  const puestos = useMemo(() => 
    [...new Set(employees.map(e => e.puesto).filter(Boolean))], 
    [employees]
  );

  const filteredConfigs = useMemo(() => {
    return deptPositionSkills.filter(config => {
      const matchesDept = filterDepartment === "all" || config.departamento === filterDepartment;
      const matchesPuesto = filterPuesto === "all" || config.puesto === filterPuesto;
      return matchesDept && matchesPuesto;
    });
  }, [deptPositionSkills, filterDepartment, filterPuesto]);

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      departamento: item.departamento,
      puesto: item.puesto,
      skill_id: item.skill_id,
      importancia: item.importancia,
      nivel_minimo_requerido: item.nivel_minimo_requerido,
      nivel_deseable: item.nivel_deseable || "",
      obligatorio: item.obligatorio ?? true,
      descripcion: item.descripcion || "",
      activo: item.activo ?? true
    });
    setShowDialog(true);
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingItem(null);
    setFormData({
      departamento: "",
      puesto: "",
      skill_id: "",
      importancia: "Media",
      nivel_minimo_requerido: "Básico",
      nivel_deseable: "",
      obligatorio: true,
      descripcion: "",
      activo: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.departamento || !formData.puesto || !formData.skill_id) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    saveMutation.mutate(formData);
  };

  const getSkillName = (skillId) => skills.find(s => s.id === skillId)?.nombre || "Desconocida";

  const getImportanceBadge = (importancia) => {
    switch (importancia) {
      case "Crítica":
        return <Badge className="bg-red-600">Crítica</Badge>;
      case "Requerida":
        return <Badge className="bg-orange-600">Requerida</Badge>;
      case "Media":
        return <Badge className="bg-blue-600">Media</Badge>;
      default:
        return <Badge>{importancia}</Badge>;
    }
  };

  const getComplianceStats = () => {
    const stats = {
      total: deptPositionSkills.length,
      criticas: deptPositionSkills.filter(c => c.importancia === "Crítica").length,
      requeridas: deptPositionSkills.filter(c => c.importancia === "Requerida").length,
      medias: deptPositionSkills.filter(c => c.importancia === "Media").length,
    };
    return stats;
  };

  const stats = getComplianceStats();

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-medium">Total Configuraciones</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 font-medium">Habilidades Críticas</p>
                <p className="text-2xl font-bold text-red-900">{stats.criticas}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-700 font-medium">Habilidades Requeridas</p>
                <p className="text-2xl font-bold text-orange-900">{stats.requeridas}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-medium">Importancia Media</p>
                <p className="text-2xl font-bold text-green-900">{stats.medias}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Habilidades por Departamento y Puesto
            </CardTitle>
            <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Configuración
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Filtrar por Departamento</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filtrar por Puesto</Label>
              <Select value={filterPuesto} onValueChange={setFilterPuesto}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {puestos.map(puesto => (
                    <SelectItem key={puesto} value={puesto}>{puesto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabla */}
          {filteredConfigs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>No hay configuraciones que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Departamento</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Habilidad</TableHead>
                    <TableHead>Importancia</TableHead>
                    <TableHead>Nivel Mínimo</TableHead>
                    <TableHead>Nivel Deseable</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConfigs.map((config) => (
                    <TableRow key={config.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{config.departamento}</TableCell>
                      <TableCell>{config.puesto}</TableCell>
                      <TableCell>{getSkillName(config.skill_id)}</TableCell>
                      <TableCell>{getImportanceBadge(config.importancia)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{config.nivel_minimo_requerido}</Badge>
                      </TableCell>
                      <TableCell>
                        {config.nivel_deseable ? (
                          <Badge className="bg-green-100 text-green-800">{config.nivel_deseable}</Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.activo ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}>
                          {config.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(config)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm('¿Eliminar esta configuración?')) {
                                deleteMutation.mutate(config.id);
                              }
                            }}
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

      {/* Dialog */}
      {showDialog && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Configuración' : 'Nueva Configuración de Habilidad'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departamento *</Label>
                  <Select value={formData.departamento} onValueChange={(value) => setFormData({ ...formData, departamento: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Puesto *</Label>
                  <Select value={formData.puesto} onValueChange={(value) => setFormData({ ...formData, puesto: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {puestos.map(puesto => (
                        <SelectItem key={puesto} value={puesto}>{puesto}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Habilidad *</Label>
                <Select value={formData.skill_id} onValueChange={(value) => setFormData({ ...formData, skill_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar habilidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {skills.filter(s => s.activo).map(skill => (
                      <SelectItem key={skill.id} value={skill.id}>{skill.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Importancia *</Label>
                  <Select value={formData.importancia} onValueChange={(value) => setFormData({ ...formData, importancia: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Media">Media</SelectItem>
                      <SelectItem value="Requerida">Requerida</SelectItem>
                      <SelectItem value="Crítica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nivel Mínimo *</Label>
                  <Select value={formData.nivel_minimo_requerido} onValueChange={(value) => setFormData({ ...formData, nivel_minimo_requerido: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Básico">Básico</SelectItem>
                      <SelectItem value="Intermedio">Intermedio</SelectItem>
                      <SelectItem value="Avanzado">Avanzado</SelectItem>
                      <SelectItem value="Experto">Experto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nivel Deseable</Label>
                  <Select value={formData.nivel_deseable} onValueChange={(value) => setFormData({ ...formData, nivel_deseable: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Ninguno</SelectItem>
                      <SelectItem value="Intermedio">Intermedio</SelectItem>
                      <SelectItem value="Avanzado">Avanzado</SelectItem>
                      <SelectItem value="Experto">Experto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción/Justificación</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Explica por qué esta habilidad es necesaria para este puesto..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
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
