
import { useState, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Plus, 
  Edit, 
  Trash2,
  Target,
  FileText,
  AlertCircle,
  CheckCircle2,
  Award,
  Search,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
 
import { Link } from "react-router-dom";
import { createPageUrl, getEmployeeName } from "@/utils";

export default function PerformanceManagementPage() {
  const [activeTab, setActiveTab] = useState("reviews");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showPIPForm, setShowPIPForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [editingPIP, setEditingPIP] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const [reviewFormData, setReviewFormData] = useState({
    employee_id: "",
    periodo: "",
    fecha_revision: "",
    evaluador: "",
    puntuacion_general: 0,
    objetivos: {
      objetivo_1: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_2: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_3: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_4: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_5: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_6: { descripcion: "", peso: 0, resultado: 0 },
    },
    fortalezas: "",
    areas_mejora: "",
    comentarios_evaluador: "",
    comentarios_empleado: "",
    plan_desarrollo: "",
    estado: "Borrador",
  });

  const [pipFormData, setPIPFormData] = useState({
    employee_id: "",
    titulo: "",
    fecha_inicio: "",
    fecha_fin_prevista: "",
    problema_identificado: "",
    objetivos_mejora: [],
    acciones_requeridas: "",
    soporte_necesario: "",
    estado: "Activo",
    resultado_final: "Pendiente",
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    initialData: [],
  });

  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ['performanceReviews'],
    queryFn: () => base44.entities.PerformanceReview.list('-fecha_revision'),
    initialData: [],
  });

  const { data: pips, isLoading: loadingPIPs } = useQuery({
    queryKey: ['performanceImprovementPlans'],
    queryFn: () => base44.entities.PerformanceImprovementPlan.list('-fecha_inicio'),
    initialData: [],
  });

  const saveReviewMutation = useMutation({
    mutationFn: (data) => {
      if (editingReview?.id) {
        return base44.entities.PerformanceReview.update(editingReview.id, data);
      }
      return base44.entities.PerformanceReview.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performanceReviews'] });
      handleCloseReviewForm();
    },
  });

  const savePIPMutation = useMutation({
    mutationFn: (data) => {
      if (editingPIP?.id) {
        return base44.entities.PerformanceImprovementPlan.update(editingPIP.id, data);
      }
      return base44.entities.PerformanceImprovementPlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performanceImprovementPlans'] });
      handleClosePIPForm();
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (id) => base44.entities.PerformanceReview.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performanceReviews'] });
    },
  });

  const deletePIPMutation = useMutation({
    mutationFn: (id) => base44.entities.PerformanceImprovementPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performanceImprovementPlans'] });
    },
  });

  const handleEditReview = (review) => {
    setEditingReview(review);
    setReviewFormData(review);
    setShowReviewForm(true);
  };

  const handleCloseReviewForm = () => {
    setShowReviewForm(false);
    setEditingReview(null);
    setReviewFormData({
      employee_id: "",
      periodo: "",
      fecha_revision: "",
      evaluador: "",
      puntuacion_general: 0,
      objetivos: {
        objetivo_1: { descripcion: "", peso: 0, resultado: 0 },
        objetivo_2: { descripcion: "", peso: 0, resultado: 0 },
        objetivo_3: { descripcion: "", peso: 0, resultado: 0 },
        objetivo_4: { descripcion: "", peso: 0, resultado: 0 },
        objetivo_5: { descripcion: "", peso: 0, resultado: 0 },
        objetivo_6: { descripcion: "", peso: 0, resultado: 0 },
      },
      fortalezas: "",
      areas_mejora: "",
      comentarios_evaluador: "",
      comentarios_empleado: "",
      plan_desarrollo: "",
      estado: "Borrador",
    });
  };

  const handleEditPIP = (pip) => {
    setEditingPIP(pip);
    setPIPFormData(pip);
    setShowPIPForm(true);
  };

  const handleClosePIPForm = () => {
    setShowPIPForm(false);
    setEditingPIP(null);
    setPIPFormData({
      employee_id: "",
      titulo: "",
      fecha_inicio: "",
      fecha_fin_prevista: "",
      problema_identificado: "",
      objetivos_mejora: [],
      acciones_requeridas: "",
      soporte_necesario: "",
      estado: "Activo",
      resultado_final: "Pendiente",
    });
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    saveReviewMutation.mutate(reviewFormData);
  };

  const handleSubmitPIP = (e) => {
    e.preventDefault();
    savePIPMutation.mutate(pipFormData);
  };

  const updateReviewObjective = (objNum, field, value) => {
    setReviewFormData({
      ...reviewFormData,
      objetivos: {
        ...reviewFormData.objetivos,
        [`objetivo_${objNum}`]: {
          ...reviewFormData.objetivos[`objetivo_${objNum}`],
          [field]: value
        }
      }
    });
  };

  const addPIPObjective = () => {
    setPIPFormData({
      ...pipFormData,
      objetivos_mejora: [...pipFormData.objetivos_mejora, { descripcion: "", completado: false }]
    });
  };

  const updatePIPObjective = (index, field, value) => {
    const newObjectives = [...pipFormData.objetivos_mejora];
    newObjectives[index][field] = value;
    setPIPFormData({ ...pipFormData, objetivos_mejora: newObjectives });
  };

  const removePIPObjective = (index) => {
    setPIPFormData({
      ...pipFormData,
      objetivos_mejora: pipFormData.objetivos_mejora.filter((_, i) => i !== index)
    });
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Empleado desconocido";
  };

  

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => 
      getEmployeeName(r.employee_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.periodo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reviews, searchTerm, employees]);

  const filteredPIPs = useMemo(() => {
    return pips.filter(p => 
      getEmployeeName(p.employee_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.titulo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pips, searchTerm, employees]);

  const stats = useMemo(() => {
    return {
      totalReviews: reviews.length,
      reviewsCompleted: reviews.filter(r => r.estado === "Completada" || r.estado === "Firmada").length,
      activePIPs: pips.filter(p => p.estado === "Activo").length,
      completedPIPs: pips.filter(p => p.estado === "Completado").length,
      avgScore: reviews.length > 0 
        ? Math.round(reviews.reduce((sum, r) => sum + (r.puntuacion_general || 0), 0) / reviews.length)
        : 0,
    };
  }, [reviews, pips]);

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header Estándar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Gestión del Desempeño
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Evaluaciones de desempeño y planes de mejora
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={createPageUrl("Employees")}>
            <Button variant="ghost" size="sm" className="h-8 gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver a Empleados</span>
            </Button>
          </Link>
        </div>
      </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Evaluaciones</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalReviews}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Completadas</p>
                  <p className="text-2xl font-bold text-green-900">{stats.reviewsCompleted}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">PIPs Activos</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.activePIPs}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium">PIPs Completados</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.completedPIPs}</p>
                </div>
                <Target className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Puntuación Media</p>
                  <p className="text-2xl font-bold text-amber-900">{stats.avgScore}%</p>
                </div>
                <Award className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList className="grid w-96 grid-cols-2">
              <TabsTrigger value="reviews">Evaluaciones</TabsTrigger>
              <TabsTrigger value="pips">Planes de Mejora</TabsTrigger>
            </TabsList>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <TabsContent value="reviews">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <CardTitle>Evaluaciones de Rendimiento</CardTitle>
                  <Button onClick={() => setShowReviewForm(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Evaluación
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingReviews ? (
                  <div className="p-12 text-center text-slate-500">Cargando...</div>
                ) : filteredReviews.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay evaluaciones registradas
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Empleado</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Puntuación</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReviews.map((review) => (
                          <TableRow key={review.id} className="hover:bg-slate-50">
                            <TableCell>
                              <span className="font-semibold text-slate-900">
                                {getEmployeeName(review.employee_id)}
                              </span>
                            </TableCell>
                            <TableCell>{review.periodo}</TableCell>
                            <TableCell>
                              {review.fecha_revision 
                                ? format(new Date(review.fecha_revision), "dd/MM/yyyy", { locale: es })
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                review.puntuacion_general >= 80 ? "bg-green-100 text-green-800" :
                                review.puntuacion_general >= 60 ? "bg-blue-100 text-blue-800" :
                                review.puntuacion_general >= 40 ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              }>
                                {review.puntuacion_general}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{review.estado}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditReview(review)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (window.confirm('¿Eliminar esta evaluación?')) {
                                      deleteReviewMutation.mutate(review.id);
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
          </TabsContent>

          <TabsContent value="pips">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <CardTitle>Planes de Mejora del Rendimiento</CardTitle>
                  <Button onClick={() => setShowPIPForm(true)} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingPIPs ? (
                  <div className="p-12 text-center text-slate-500">Cargando...</div>
                ) : filteredPIPs.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay planes de mejora registrados
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Empleado</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Fecha Inicio</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Resultado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPIPs.map((pip) => (
                          <TableRow key={pip.id} className="hover:bg-slate-50">
                            <TableCell>
                              <span className="font-semibold text-slate-900">
                                {getEmployeeName(pip.employee_id)}
                              </span>
                            </TableCell>
                            <TableCell>{pip.titulo}</TableCell>
                            <TableCell>
                              {pip.fecha_inicio 
                                ? format(new Date(pip.fecha_inicio), "dd/MM/yyyy", { locale: es })
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                pip.estado === "Activo" ? "bg-blue-100 text-blue-800" :
                                pip.estado === "Completado" ? "bg-green-100 text-green-800" :
                                "bg-slate-100 text-slate-600"
                              }>
                                {pip.estado}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{pip.resultado_final}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditPIP(pip)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (window.confirm('¿Eliminar este plan?')) {
                                      deletePIPMutation.mutate(pip.id);
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Formulario de Evaluación */}
      {showReviewForm && (
        <Dialog open={true} onOpenChange={handleCloseReviewForm}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingReview ? 'Editar Evaluación' : 'Nueva Evaluación'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Empleado *</Label>
                  <Select
                    value={reviewFormData.employee_id}
                    onValueChange={(value) => setReviewFormData({ ...reviewFormData, employee_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Período *</Label>
                  <Input
                    value={reviewFormData.periodo}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, periodo: e.target.value })}
                    placeholder="ej: Q1 2024"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Revisión *</Label>
                  <Input
                    type="date"
                    value={reviewFormData.fecha_revision}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, fecha_revision: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Evaluador</Label>
                  <Input
                    value={reviewFormData.evaluador}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, evaluador: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={reviewFormData.estado}
                    onValueChange={(value) => setReviewFormData({ ...reviewFormData, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Borrador">Borrador</SelectItem>
                      <SelectItem value="Completada">Completada</SelectItem>
                      <SelectItem value="Firmada">Firmada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Puntuación General</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={reviewFormData.puntuacion_general}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, puntuacion_general: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-lg mb-4">Objetivos</h4>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <div key={num} className="border rounded-lg p-4 bg-slate-50">
                      <h5 className="font-semibold mb-3 text-slate-700">Objetivo {num}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2 md:col-span-3">
                          <Label>Descripción</Label>
                          <Input
                            placeholder="Descripción del objetivo"
                            value={reviewFormData.objetivos?.[`objetivo_${num}`]?.descripcion || ""}
                            onChange={(e) => updateReviewObjective(num, 'descripcion', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Peso (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={reviewFormData.objetivos?.[`objetivo_${num}`]?.peso || 0}
                            onChange={(e) => updateReviewObjective(num, 'peso', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Resultado (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={reviewFormData.objetivos?.[`objetivo_${num}`]?.resultado || 0}
                            onChange={(e) => updateReviewObjective(num, 'resultado', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fortalezas</Label>
                  <Textarea
                    value={reviewFormData.fortalezas}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, fortalezas: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Áreas de Mejora</Label>
                  <Textarea
                    value={reviewFormData.areas_mejora}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, areas_mejora: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Comentarios del Evaluador</Label>
                  <Textarea
                    value={reviewFormData.comentarios_evaluador}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, comentarios_evaluador: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Comentarios del Empleado</Label>
                  <Textarea
                    value={reviewFormData.comentarios_empleado}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, comentarios_empleado: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Plan de Desarrollo</Label>
                <Textarea
                  value={reviewFormData.plan_desarrollo}
                  onChange={(e) => setReviewFormData({ ...reviewFormData, plan_desarrollo: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseReviewForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveReviewMutation.isPending}>
                  {saveReviewMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Formulario de Plan de Mejora */}
      {showPIPForm && (
        <Dialog open={true} onOpenChange={handleClosePIPForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPIP ? 'Editar Plan de Mejora' : 'Nuevo Plan de Mejora'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmitPIP} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Empleado *</Label>
                  <Select
                    value={pipFormData.employee_id}
                    onValueChange={(value) => setPIPFormData({ ...pipFormData, employee_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={pipFormData.titulo}
                    onChange={(e) => setPIPFormData({ ...pipFormData, titulo: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha Inicio *</Label>
                  <Input
                    type="date"
                    value={pipFormData.fecha_inicio}
                    onChange={(e) => setPIPFormData({ ...pipFormData, fecha_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha Fin Prevista</Label>
                  <Input
                    type="date"
                    value={pipFormData.fecha_fin_prevista}
                    onChange={(e) => setPIPFormData({ ...pipFormData, fecha_fin_prevista: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={pipFormData.estado}
                    onValueChange={(value) => setPIPFormData({ ...pipFormData, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="Completado">Completado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Resultado Final</Label>
                  <Select
                    value={pipFormData.resultado_final}
                    onValueChange={(value) => setPIPFormData({ ...pipFormData, resultado_final: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendiente">Pendiente</SelectItem>
                      <SelectItem value="Exitoso">Exitoso</SelectItem>
                      <SelectItem value="Parcialmente Exitoso">Parcialmente Exitoso</SelectItem>
                      <SelectItem value="No Exitoso">No Exitoso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Problema Identificado *</Label>
                <Textarea
                  value={pipFormData.problema_identificado}
                  onChange={(e) => setPIPFormData({ ...pipFormData, problema_identificado: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Objetivos de Mejora</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPIPObjective}>
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Objetivo
                  </Button>
                </div>
                {pipFormData.objetivos_mejora?.map((obj, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      value={obj.descripcion}
                      onChange={(e) => updatePIPObjective(index, 'descripcion', e.target.value)}
                      placeholder="Descripción del objetivo"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePIPObjective(index)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Acciones Requeridas</Label>
                <Textarea
                  value={pipFormData.acciones_requeridas}
                  onChange={(e) => setPIPFormData({ ...pipFormData, acciones_requeridas: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Soporte Necesario</Label>
                <Textarea
                  value={pipFormData.soporte_necesario}
                  onChange={(e) => setPIPFormData({ ...pipFormData, soporte_necesario: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClosePIPForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={savePIPMutation.isPending}>
                  {savePIPMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
