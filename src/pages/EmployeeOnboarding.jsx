import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Send, 
  KeyRound,
  Settings,
  GraduationCap,
  AlertCircle,
  Upload,
  Eye,
  Users
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

export default function EmployeeOnboardingPage() {
  const [showNewOnboarding, setShowNewOnboarding] = useState(false);
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const queryClient = useQueryClient();

  const [newOnboardingData, setNewOnboardingData] = useState({
    employee_id: "",
    responsable_onboarding: "",
    fecha_inicio: format(new Date(), 'yyyy-MM-dd')
  });

  const { data: onboardings } = useQuery({
    queryKey: ['employeeOnboardings'],
    queryFn: () => base44.entities.EmployeeOnboarding.list('-created_date'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: lockerAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    initialData: [],
  });

  const createOnboardingMutation = useMutation({
    mutationFn: async (data) => {
      const onboardingData = {
        ...data,
        estado: "En Proceso",
        paso_actual: 1,
        porcentaje_completado: 0,
        pasos_completados: {
          paso_1_bienvenida: false,
          paso_2_datos_personales: false,
          paso_3_documentos: false,
          paso_4_configuracion_cuenta: false,
          paso_5_asignacion_recursos: false,
          paso_6_formacion_inicial: false
        },
        documentos_pendientes: [
          { nombre: "DNI/NIE", requerido: true, recibido: false },
          { nombre: "Número de Seguridad Social", requerido: true, recibido: false },
          { nombre: "Datos Bancarios", requerido: true, recibido: false },
          { nombre: "Certificado de Estudios", requerido: false, recibido: false },
          { nombre: "Certificado Médico", requerido: false, recibido: false }
        ],
        recursos_asignados: {
          taquilla_asignada: false,
          equipo_asignado: false,
          accesos_sistemas: false,
          formacion_seguridad: false
        },
        notificaciones_enviadas: []
      };

      const result = await base44.entities.EmployeeOnboarding.create(onboardingData);

      // Enviar email de bienvenida
      const employee = employees.find(e => e.id === data.employee_id);
      if (employee && employee.email) {
        await base44.integrations.Core.SendEmail({
          to: employee.email,
          subject: "¡Bienvenido/a al equipo!",
          body: `Hola ${employee.nombre},

¡Bienvenido/a a la empresa! Estamos muy contentos de que formes parte de nuestro equipo.

Hemos iniciado tu proceso de onboarding para facilitarte la incorporación. En los próximos días completaremos juntos los siguientes pasos:

1. ✅ Bienvenida e introducción
2. 📝 Recopilación de datos personales
3. 📄 Entrega de documentación
4. 🔑 Configuración de cuenta y accesos
5. 🎯 Asignación de recursos (taquilla, equipo)
6. 🎓 Formación inicial

Tu responsable de onboarding es: ${data.responsable_onboarding}

Si tienes alguna pregunta, no dudes en contactar con nosotros.

¡Bienvenido/a de nuevo!

Equipo de RRHH`
        });

        // Registrar notificación
        await base44.entities.EmployeeOnboarding.update(result.id, {
          notificaciones_enviadas: [{
            tipo: "Email de Bienvenida",
            fecha: new Date().toISOString(),
            destinatario: employee.email
          }]
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeOnboardings'] });
      setShowNewOnboarding(false);
      setNewOnboardingData({
        employee_id: "",
        responsable_onboarding: "",
        fecha_inicio: format(new Date(), 'yyyy-MM-dd')
      });
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ onboardingId, stepKey, completed }) => {
      const onboarding = onboardings.find(o => o.id === onboardingId);
      const updatedSteps = { ...onboarding.pasos_completados, [stepKey]: completed };
      
      // Calcular porcentaje
      const totalSteps = Object.keys(updatedSteps).length;
      const completedSteps = Object.values(updatedSteps).filter(v => v === true).length;
      const percentage = Math.round((completedSteps / totalSteps) * 100);
      
      // Determinar paso actual
      let currentStep = 1;
      for (let i = 1; i <= totalSteps; i++) {
        if (!updatedSteps[`paso_${i}_${Object.keys(updatedSteps)[i-1].split('_').slice(2).join('_')}`]) {
          currentStep = i;
          break;
        }
      }
      if (completedSteps === totalSteps) {
        currentStep = totalSteps;
      }

      const updateData = {
        pasos_completados: updatedSteps,
        porcentaje_completado: percentage,
        paso_actual: currentStep,
        estado: percentage === 100 ? "Completado" : "En Proceso",
        fecha_completado: percentage === 100 ? new Date().toISOString() : null
      };

      return base44.entities.EmployeeOnboarding.update(onboardingId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeOnboardings'] });
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ onboardingId, docIndex, file }) => {
      const onboarding = onboardings.find(o => o.id === onboardingId);
      const docs = [...onboarding.documentos_pendientes];
      
      if (file) {
        const uploadResult = await base44.integrations.Core.UploadPrivateFile({ file });
        docs[docIndex] = {
          ...docs[docIndex],
          recibido: true,
          fecha_recepcion: new Date().toISOString(),
          archivo_url: uploadResult.file_uri
        };
      } else {
        docs[docIndex] = {
          ...docs[docIndex],
          recibido: !docs[docIndex].recibido,
          fecha_recepcion: docs[docIndex].recibido ? null : new Date().toISOString()
        };
      }

      return base44.entities.EmployeeOnboarding.update(onboardingId, {
        documentos_pendientes: docs
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeOnboardings'] });
      setUploadingDoc(null);
    },
  });

  const updateResourceMutation = useMutation({
    mutationFn: async ({ onboardingId, resourceKey, assigned }) => {
      const onboarding = onboardings.find(o => o.id === onboardingId);
      const updatedResources = { ...onboarding.recursos_asignados, [resourceKey]: assigned };

      return base44.entities.EmployeeOnboarding.update(onboardingId, {
        recursos_asignados: updatedResources
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeOnboardings'] });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (onboardingId) => {
      const onboarding = onboardings.find(o => o.id === onboardingId);
      const employee = employees.find(e => e.id === onboarding.employee_id);
      
      if (!employee || !employee.email) return;

      const pendingDocs = onboarding.documentos_pendientes.filter(d => d.requerido && !d.recibido);
      const pendingSteps = Object.entries(onboarding.pasos_completados)
        .filter(([key, value]) => !value)
        .map(([key]) => key.split('_').slice(2).join(' '));

      await base44.integrations.Core.SendEmail({
        to: employee.email,
        subject: "Recordatorio - Proceso de Onboarding",
        body: `Hola ${employee.nombre},

Este es un recordatorio amable sobre tu proceso de onboarding.

Estado actual: ${onboarding.porcentaje_completado}% completado

${pendingDocs.length > 0 ? `\nDocumentos pendientes:\n${pendingDocs.map(d => `- ${d.nombre}`).join('\n')}` : ''}

${pendingSteps.length > 0 ? `\nPasos pendientes:\n${pendingSteps.map(s => `- ${s}`).join('\n')}` : ''}

Por favor, ponte en contacto con tu responsable de onboarding (${onboarding.responsable_onboarding}) para completar estos pasos.

Gracias,
Equipo de RRHH`
      });

      const notifications = [...(onboarding.notificaciones_enviadas || [])];
      notifications.push({
        tipo: "Recordatorio",
        fecha: new Date().toISOString(),
        destinatario: employee.email
      });

      return base44.entities.EmployeeOnboarding.update(onboardingId, {
        notificaciones_enviadas: notifications
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeOnboardings'] });
    },
  });

  const handleNewOnboarding = () => {
    createOnboardingMutation.mutate(newOnboardingData);
  };

  const handleViewDetails = (onboarding) => {
    setSelectedOnboarding(onboarding);
    setShowDetails(true);
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Empleado desconocido";
  };

  const getEmployeeEmail = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.email || "";
  };

  const hasLockerAssignment = (employeeId) => {
    const assignment = lockerAssignments.find(la => la.employee_id === employeeId);
    return assignment && assignment.numero_taquilla_actual;
  };

  const stats = useMemo(() => {
    return {
      total: onboardings.length,
      enProceso: onboardings.filter(o => o.estado === "En Proceso").length,
      completados: onboardings.filter(o => o.estado === "Completado").length,
      promedioCompletado: onboardings.length > 0 
        ? Math.round(onboardings.reduce((acc, o) => acc + (o.porcentaje_completado || 0), 0) / onboardings.length)
        : 0
    };
  }, [onboardings]);

  const employeesWithoutOnboarding = useMemo(() => {
    return employees.filter(emp => 
      !onboardings.some(ob => ob.employee_id === emp.id)
    );
  }, [employees, onboardings]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-blue-600" />
              Onboarding de Empleados
            </h1>
            <p className="text-slate-600 mt-1">
              Gestiona el proceso de incorporación de nuevos empleados
            </p>
          </div>
          <Button
            onClick={() => setShowNewOnboarding(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Iniciar Onboarding
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Procesos</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">En Proceso</p>
                  <p className="text-2xl font-bold text-amber-900">{stats.enProceso}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Completados</p>
                  <p className="text-2xl font-bold text-green-900">{stats.completados}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium">Promedio Completado</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.promedioCompletado}%</p>
                </div>
                <GraduationCap className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Onboardings */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Procesos de Onboarding Activos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {onboardings.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay procesos de onboarding iniciados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Empleado</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Paso Actual</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {onboardings.map((onboarding) => (
                      <TableRow key={onboarding.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="font-semibold text-slate-900">
                            {getEmployeeName(onboarding.employee_id)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {getEmployeeEmail(onboarding.employee_id)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            onboarding.estado === "Completado" 
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }>
                            {onboarding.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={onboarding.porcentaje_completado || 0} className="h-2" />
                            <span className="text-xs text-slate-600">
                              {onboarding.porcentaje_completado || 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            Paso {onboarding.paso_actual || 1} de 6
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {onboarding.responsable_onboarding}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {onboarding.fecha_inicio && format(new Date(onboarding.fecha_inicio), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(onboarding)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>
                            {onboarding.estado !== "Completado" && (
                              <Button
                                size="sm"
                                onClick={() => sendReminderMutation.mutate(onboarding.id)}
                                disabled={sendReminderMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Recordar
                              </Button>
                            )}
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

        {/* Empleados sin onboarding */}
        {employeesWithoutOnboarding.length > 0 && (
          <Card className="mt-6 bg-amber-50 border-2 border-amber-300">
            <CardHeader className="border-b border-amber-200">
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <AlertCircle className="w-5 h-5" />
                Empleados sin Proceso de Onboarding ({employeesWithoutOnboarding.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {employeesWithoutOnboarding.slice(0, 9).map(emp => (
                  <div key={emp.id} className="p-2 bg-white rounded border border-amber-200 text-sm">
                    <span className="font-semibold text-slate-900">{emp.nombre}</span>
                    <span className="text-xs text-slate-600 block">{emp.departamento}</span>
                  </div>
                ))}
              </div>
              {employeesWithoutOnboarding.length > 9 && (
                <p className="text-xs text-amber-800 mt-2">
                  ... y {employeesWithoutOnboarding.length - 9} más
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog: Nuevo Onboarding */}
      {showNewOnboarding && (
        <Dialog open={true} onOpenChange={setShowNewOnboarding}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Iniciar Proceso de Onboarding</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Empleado *</Label>
                <Select
                  value={newOnboardingData.employee_id}
                  onValueChange={(value) => setNewOnboardingData({...newOnboardingData, employee_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesWithoutOnboarding.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.nombre} - {emp.departamento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsable de Onboarding *</Label>
                <Input
                  value={newOnboardingData.responsable_onboarding}
                  onChange={(e) => setNewOnboardingData({...newOnboardingData, responsable_onboarding: e.target.value})}
                  placeholder="Nombre del responsable"
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha de Inicio</Label>
                <Input
                  type="date"
                  value={newOnboardingData.fecha_inicio}
                  onChange={(e) => setNewOnboardingData({...newOnboardingData, fecha_inicio: e.target.value})}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Proceso Automatizado</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Se enviará un email de bienvenida automáticamente</li>
                  <li>Se creará un seguimiento paso a paso</li>
                  <li>Se configurarán documentos pendientes</li>
                  <li>Se habilitará el seguimiento de recursos asignados</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowNewOnboarding(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleNewOnboarding}
                  disabled={!newOnboardingData.employee_id || !newOnboardingData.responsable_onboarding || createOnboardingMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createOnboardingMutation.isPending ? "Creando..." : "Iniciar Onboarding"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Detalles del Onboarding */}
      {showDetails && selectedOnboarding && (
        <Dialog open={true} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Onboarding - {getEmployeeName(selectedOnboarding.employee_id)}
                <Badge className={
                  selectedOnboarding.estado === "Completado"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }>
                  {selectedOnboarding.estado}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="pasos" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pasos">Pasos del Proceso</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
                <TabsTrigger value="recursos">Recursos</TabsTrigger>
              </TabsList>

              <TabsContent value="pasos" className="space-y-4">
                <div className="mb-4">
                  <Progress value={selectedOnboarding.porcentaje_completado || 0} className="h-3" />
                  <p className="text-sm text-slate-600 mt-2">
                    Progreso general: {selectedOnboarding.porcentaje_completado || 0}%
                  </p>
                </div>

                {Object.entries(selectedOnboarding.pasos_completados || {}).map(([key, completed], index) => {
                  const stepName = key.split('_').slice(2).join(' ').replace(/_/g, ' ');
                  const icons = [CheckCircle2, FileText, FileText, Settings, KeyRound, GraduationCap];
                  const Icon = icons[index] || CheckCircle2;

                  return (
                    <div key={key} className="flex items-center gap-3 p-4 border rounded-lg bg-white">
                      <Checkbox
                        checked={completed}
                        onCheckedChange={(checked) => updateStepMutation.mutate({
                          onboardingId: selectedOnboarding.id,
                          stepKey: key,
                          completed: checked
                        })}
                      />
                      <Icon className={`w-5 h-5 ${completed ? 'text-green-600' : 'text-slate-400'}`} />
                      <div className="flex-1">
                        <p className={`font-semibold ${completed ? 'text-slate-900' : 'text-slate-600'}`}>
                          Paso {index + 1}: {stepName}
                        </p>
                      </div>
                      <Badge variant={completed ? "default" : "outline"} className={completed ? "bg-green-600" : ""}>
                        {completed ? "Completado" : "Pendiente"}
                      </Badge>
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="documentos" className="space-y-4">
                {selectedOnboarding.documentos_pendientes?.map((doc, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-5 h-5 ${doc.recibido ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className="font-semibold text-slate-900">{doc.nombre}</span>
                        {doc.requerido && (
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            Requerido
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={doc.recibido}
                          onCheckedChange={() => updateDocumentMutation.mutate({
                            onboardingId: selectedOnboarding.id,
                            docIndex: index,
                            file: null
                          })}
                        />
                        <input
                          type="file"
                          id={`doc-${index}`}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              updateDocumentMutation.mutate({
                                onboardingId: selectedOnboarding.id,
                                docIndex: index,
                                file: file
                              });
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById(`doc-${index}`).click()}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Subir
                        </Button>
                      </div>
                    </div>
                    {doc.fecha_recepcion && (
                      <p className="text-xs text-slate-500">
                        Recibido: {format(new Date(doc.fecha_recepcion), "dd/MM/yyyy HH:mm", { locale: es })}
                      </p>
                    )}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="recursos" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className={`w-5 h-5 ${selectedOnboarding.recursos_asignados?.taquilla_asignada ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className="font-semibold text-slate-900">Taquilla Asignada</span>
                      </div>
                      <Checkbox
                        checked={selectedOnboarding.recursos_asignados?.taquilla_asignada || false}
                        onCheckedChange={(checked) => updateResourceMutation.mutate({
                          onboardingId: selectedOnboarding.id,
                          resourceKey: 'taquilla_asignada',
                          assigned: checked
                        })}
                      />
                    </div>
                    {hasLockerAssignment(selectedOnboarding.employee_id) && (
                      <p className="text-xs text-green-600 mt-2">✓ Taquilla configurada en el sistema</p>
                    )}
                  </div>

                  <div className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className={`w-5 h-5 ${selectedOnboarding.recursos_asignados?.equipo_asignado ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className="font-semibold text-slate-900">Equipo Asignado</span>
                      </div>
                      <Checkbox
                        checked={selectedOnboarding.recursos_asignados?.equipo_asignado || false}
                        onCheckedChange={(checked) => updateResourceMutation.mutate({
                          onboardingId: selectedOnboarding.id,
                          resourceKey: 'equipo_asignado',
                          assigned: checked
                        })}
                      />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className={`w-5 h-5 ${selectedOnboarding.recursos_asignados?.accesos_sistemas ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className="font-semibold text-slate-900">Accesos a Sistemas</span>
                      </div>
                      <Checkbox
                        checked={selectedOnboarding.recursos_asignados?.accesos_sistemas || false}
                        onCheckedChange={(checked) => updateResourceMutation.mutate({
                          onboardingId: selectedOnboarding.id,
                          resourceKey: 'accesos_sistemas',
                          assigned: checked
                        })}
                      />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className={`w-5 h-5 ${selectedOnboarding.recursos_asignados?.formacion_seguridad ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className="font-semibold text-slate-900">Formación en Seguridad</span>
                      </div>
                      <Checkbox
                        checked={selectedOnboarding.recursos_asignados?.formacion_seguridad || false}
                        onCheckedChange={(checked) => updateResourceMutation.mutate({
                          onboardingId: selectedOnboarding.id,
                          resourceKey: 'formacion_seguridad',
                          assigned: checked
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Notificaciones Enviadas ({selectedOnboarding.notificaciones_enviadas?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {selectedOnboarding.notificaciones_enviadas?.map((notif, i) => (
                      <div key={i} className="text-sm text-blue-800">
                        • {notif.tipo} - {format(new Date(notif.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}