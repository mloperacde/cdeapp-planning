import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, AlertTriangle, Search, Plus, Calendar, User, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EmployeeSelect from "../components/common/EmployeeSelect";

export default function QualityControlPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingInspection, setEditingInspection] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResult, setFilterResult] = useState("all");
  
  const queryClient = useQueryClient();

  const { data: inspections = [] } = useQuery({
    queryKey: ['qualityInspections'],
    queryFn: () => base44.entities.QualityInspection.list('-inspection_date'),
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.QualityInspection.create(data);
      
      // Si es rechazado, crear notificación/alerta
      if (data.result === "Rechazado" && data.rework_required) {
        try {
          await base44.functions.invoke('sendNotification', {
            user_emails: data.rework_assigned_to ? [employees.find(e => e.id === data.rework_assigned_to)?.email] : [],
            tipo: 'Tarea Asignada',
            prioridad: 'Alta',
            titulo: '🔧 Retrabajo Requerido - Control de Calidad',
            mensaje: `La orden ${data.work_order_id} fue rechazada en inspección. Se requiere retrabajo urgente.`,
            enlace: '/QualityControl',
            check_preferences: false
          });
        } catch (e) {
          console.error('Error sending notification:', e);
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityInspections'] });
      toast.success("Inspección registrada correctamente");
      setShowForm(false);
      setEditingInspection(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QualityInspection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityInspections'] });
      toast.success("Inspección actualizada");
      setShowForm(false);
      setEditingInspection(null);
    },
  });

  const filteredInspections = inspections.filter(i => {
    const matchesSearch = !searchTerm || 
      i.work_order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.product_article_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesResult = filterResult === "all" || i.result === filterResult;
    
    return matchesSearch && matchesResult;
  });

  const handleNew = () => {
    setEditingInspection(null);
    setShowForm(true);
  };

  const handleEdit = (inspection) => {
    setEditingInspection(inspection);
    setShowForm(true);
  };

  const getResultBadge = (result) => {
    const config = {
      "Aprobado": { color: "bg-green-500", icon: CheckCircle2 },
      "Rechazado": { color: "bg-red-500", icon: XCircle },
      "Aprobado con Observaciones": { color: "bg-yellow-500", icon: AlertTriangle }
    };
    const { color, icon: Icon } = config[result] || config["Aprobado"];
    return (
      <Badge className={`${color} text-white flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {result}
      </Badge>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
            Control de Calidad
          </h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">
            Registro e inspección de órdenes de trabajo
          </p>
        </div>
        <Button onClick={handleNew} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Inspección
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Inspecciones</p>
                <p className="text-2xl font-bold">{inspections.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Aprobadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {inspections.filter(i => i.result === "Aprobado").length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Rechazadas</p>
                <p className="text-2xl font-bold text-red-600">
                  {inspections.filter(i => i.result === "Rechazado").length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Retrabajo Pendiente</p>
                <p className="text-2xl font-bold text-orange-600">
                  {inspections.filter(i => i.rework_required && !i.rework_completed).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por orden, producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="min-w-[180px]">
            <Label>Resultado</Label>
            <Select value={filterResult} onValueChange={setFilterResult}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Aprobado">Aprobado</SelectItem>
                <SelectItem value="Rechazado">Rechazado</SelectItem>
                <SelectItem value="Aprobado con Observaciones">Con Observaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inspections Table */}
      <Card className="dark:bg-card/80">
        <CardHeader>
          <CardTitle className="dark:text-slate-100">Historial de Inspecciones</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[800px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Orden Trabajo</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Retrabajo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInspections.map(inspection => (
                <TableRow key={inspection.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {format(parseISO(inspection.inspection_date), 'dd MMM yyyy HH:mm', { locale: es })}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{inspection.work_order_id || '-'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{inspection.product_name || '-'}</div>
                      <div className="text-slate-500 text-xs">{inspection.product_article_code}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-slate-400" />
                      {inspection.inspector_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="text-green-600">{inspection.quantity_approved || 0} ✓</div>
                      {inspection.quantity_rejected > 0 && (
                        <div className="text-red-600">{inspection.quantity_rejected} ✗</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getResultBadge(inspection.result)}</TableCell>
                  <TableCell>
                    {inspection.rework_required && (
                      <Badge variant={inspection.rework_completed ? "outline" : "destructive"}>
                        {inspection.rework_completed ? "Completado" : "Pendiente"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(inspection)}>
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <InspectionFormDialog
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingInspection(null);
        }}
        inspection={editingInspection}
        workOrders={workOrders}
        employees={employees}
        machines={machines}
        teams={teams}
        currentUser={currentUser}
        onSubmit={(data) => {
          if (editingInspection) {
            updateMutation.mutate({ id: editingInspection.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}

function InspectionFormDialog({ open, onClose, inspection, workOrders, employees, machines, teams, currentUser, onSubmit }) {
  const [formData, setFormData] = useState({
    work_order_id: "",
    product_article_code: "",
    product_name: "",
    inspection_date: new Date().toISOString(),
    inspector_id: "",
    inspector_name: "",
    result: "Aprobado",
    quantity_inspected: 0,
    quantity_approved: 0,
    quantity_rejected: 0,
    comments: "",
    rework_required: false,
    rework_assigned_to: "",
    severity: "Media",
    defects_found: [],
    machine_id: "",
    machine_name: "",
    team_key: "",
    responsable_linea: "",
    responsable_linea_name: "",
    segunda_linea: "",
    segunda_linea_name: "",
    operarios: [],
    images: []
  });

  const [uploadingImages, setUploadingImages] = useState(false);

  React.useEffect(() => {
    if (inspection) {
      setFormData({
        ...inspection,
        operarios: inspection.operarios || [],
        images: inspection.images || []
      });
    } else {
      const emp = employees.find(e => e.email === currentUser?.email);
      setFormData({
        work_order_id: "",
        product_article_code: "",
        product_name: "",
        inspection_date: new Date().toISOString(),
        inspector_id: emp?.id || "",
        inspector_name: emp?.nombre || currentUser?.full_name || "",
        result: "Aprobado",
        quantity_inspected: 0,
        quantity_approved: 0,
        quantity_rejected: 0,
        comments: "",
        rework_required: false,
        rework_assigned_to: "",
        severity: "Media",
        defects_found: [],
        machine_id: "",
        machine_name: "",
        team_key: "",
        responsable_linea: "",
        responsable_linea_name: "",
        segunda_linea: "",
        segunda_linea_name: "",
        operarios: [],
        images: []
      });
    }
  }, [inspection, employees, currentUser, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingImages(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { data } = await base44.integrations.Core.UploadFile({ file });
        return data.file_url;
      });
      const urls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...urls]
      }));
      toast.success(`${files.length} imagen(es) subida(s)`);
    } catch (error) {
      toast.error("Error al subir imágenes");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addOperario = () => {
    setFormData(prev => ({
      ...prev,
      operarios: [...(prev.operarios || []), { id: "", name: "" }]
    }));
  };

  const removeOperario = (index) => {
    setFormData(prev => ({
      ...prev,
      operarios: prev.operarios.filter((_, i) => i !== index)
    }));
  };

  const updateOperario = (index, empId) => {
    const emp = employees.find(e => e.id === empId);
    setFormData(prev => ({
      ...prev,
      operarios: prev.operarios.map((op, i) => 
        i === index ? { id: empId, name: emp?.nombre || "" } : op
      )
    }));
  };

  const selectedOrder = workOrders.find(wo => wo.id === formData.work_order_id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>{inspection ? "Detalles de Inspección" : "Nueva Inspección de Calidad"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Orden de Trabajo</Label>
              <Select 
                value={formData.work_order_id} 
                onValueChange={(val) => {
                  const wo = workOrders.find(w => w.id === val);
                  setFormData({
                    ...formData, 
                    work_order_id: val,
                    product_name: wo?.product_name || "",
                    product_article_code: wo?.product_article_code || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar orden" />
                </SelectTrigger>
                <SelectContent>
                  {workOrders.map(wo => {
                    const machine = machines.find(m => m.id === wo.machine_id);
                    return (
                      <SelectItem key={wo.id} value={wo.id}>
                        {wo.order_number} - {wo.product_name || wo.product_article_code} {machine ? `(${machine.nombre})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha y Hora Inspección *</Label>
              <Input 
                type="datetime-local"
                value={formData.inspection_date?.substring(0, 16)}
                onChange={(e) => setFormData({...formData, inspection_date: new Date(e.target.value).toISOString()})}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Máquina</Label>
              <Select 
                value={formData.machine_id} 
                onValueChange={(val) => {
                  const machine = machines.find(m => m.id === val);
                  setFormData({
                    ...formData, 
                    machine_id: val,
                    machine_name: machine?.nombre || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar máquina" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Equipo</Label>
              <Select 
                value={formData.team_key} 
                onValueChange={(val) => setFormData({...formData, team_key: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar equipo" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(t => (
                    <SelectItem key={t.team_key} value={t.team_key}>{t.team_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inspector *</Label>
              <EmployeeSelect 
                employees={employees}
                value={formData.inspector_id}
                onValueChange={(val) => {
                  const emp = employees.find(e => e.id === val);
                  setFormData({...formData, inspector_id: val, inspector_name: emp?.nombre || ""});
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Resultado *</Label>
              <Select value={formData.result} onValueChange={(val) => setFormData({...formData, result: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aprobado">✓ Aprobado</SelectItem>
                  <SelectItem value="Aprobado con Observaciones">⚠ Aprobado con Observaciones</SelectItem>
                  <SelectItem value="Rechazado">✗ Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Personal de Línea</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsable de Línea</Label>
                <EmployeeSelect 
                  employees={employees}
                  value={formData.responsable_linea}
                  onValueChange={(val) => {
                    const emp = employees.find(e => e.id === val);
                    setFormData({
                      ...formData, 
                      responsable_linea: val,
                      responsable_linea_name: emp?.nombre || ""
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Segunda de Línea</Label>
                <EmployeeSelect 
                  employees={employees}
                  value={formData.segunda_linea}
                  onValueChange={(val) => {
                    const emp = employees.find(e => e.id === val);
                    setFormData({
                      ...formData, 
                      segunda_linea: val,
                      segunda_linea_name: emp?.nombre || ""
                    });
                  }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <Label>Operarios de Línea</Label>
                <Button type="button" size="sm" variant="outline" onClick={addOperario}>
                  + Añadir Operario
                </Button>
              </div>
              {formData.operarios && formData.operarios.length > 0 && (
                <div className="space-y-2">
                  {formData.operarios.map((op, idx) => (
                    <div key={idx} className="flex gap-2">
                      <EmployeeSelect 
                        employees={employees}
                        value={op.id}
                        onValueChange={(val) => updateOperario(idx, val)}
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => removeOperario(idx)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cantidad Inspeccionada</Label>
              <Input 
                type="number"
                value={formData.quantity_inspected}
                onChange={(e) => setFormData({...formData, quantity_inspected: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label>Cantidad Aprobada</Label>
              <Input 
                type="number"
                value={formData.quantity_approved}
                onChange={(e) => setFormData({...formData, quantity_approved: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label>Cantidad Rechazada</Label>
              <Input 
                type="number"
                value={formData.quantity_rejected}
                onChange={(e) => setFormData({...formData, quantity_rejected: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          {formData.result === "Rechazado" && (
            <>
              <div className="space-y-2">
                <Label>Severidad</Label>
                <Select value={formData.severity} onValueChange={(val) => setFormData({...formData, severity: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baja">Baja</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Crítica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <input
                  type="checkbox"
                  checked={formData.rework_required}
                  onChange={(e) => setFormData({...formData, rework_required: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label className="text-orange-900 font-semibold">Requiere Retrabajo</Label>
              </div>

              {formData.rework_required && (
                <div className="space-y-2">
                  <Label>Asignar Retrabajo a</Label>
                  <EmployeeSelect 
                    employees={employees}
                    value={formData.rework_assigned_to}
                    onValueChange={(val) => setFormData({...formData, rework_assigned_to: val})}
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>Comentarios y Observaciones</Label>
            <Textarea
              value={formData.comments}
              onChange={(e) => setFormData({...formData, comments: e.target.value})}
              rows={4}
              placeholder="Detalles de la inspección, defectos encontrados, observaciones..."
            />
          </div>

          <div className="space-y-2">
            <Label>Imágenes de la Inspección</Label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImages}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {uploadingImages && <p className="text-xs text-blue-600">Subiendo imágenes...</p>}
            {formData.images && formData.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {formData.images.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={url} 
                      alt={`Inspección ${idx + 1}`} 
                      className="w-full h-24 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={() => removeImage(idx)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              {inspection ? "Actualizar" : "Registrar Inspección"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}