import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  Save,
  Upload,
  Send,
  PenTool,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import DocumentSignature from "./DocumentSignature";
import TrainingAssignment from "./TrainingAssignment";
import TrainingModuleManager from "./TrainingModuleManager";

export default function OnboardingWizard({ onboarding, onClose }) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(onboarding?.paso_actual || 1);
  const [uploading, setUploading] = useState(false);
  const [signingDocument, setSigningDocument] = useState(null);
  const [showTrainingManager, setShowTrainingManager] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: "",
    estado: "Pendiente",
    fecha_inicio: "",
    fecha_completado: "",
    paso_actual: 1,
    pasos_completados: {
      paso_1_bienvenida: false,
      paso_2_datos_personales: false,
      paso_3_documentos: false,
      paso_4_configuracion_cuenta: false,
      paso_5_asignacion_recursos: false,
      paso_6_formacion_inicial: false,
    },
    documentos_pendientes: [
      { nombre: "Contrato firmado", requerido: true, recibido: false, archivo_url: null, requiere_firma: true },
      { nombre: "DNI/NIE", requerido: true, recibido: false, archivo_url: null, requiere_firma: false },
      { nombre: "Número Seguridad Social", requerido: true, recibido: false, archivo_url: null, requiere_firma: false },
      { nombre: "Título académico", requerido: false, recibido: false, archivo_url: null, requiere_firma: false },
      { nombre: "Certificado delitos sexuales", requerido: false, recibido: false, archivo_url: null, requiere_firma: false },
    ],
    recursos_asignados: {
      taquilla_asignada: false,
      equipo_asignado: false,
      accesos_sistemas: false,
      formacion_seguridad: false,
    },
    notificaciones_enviadas: [],
    responsable_onboarding: "",
    notas: "",
    porcentaje_completado: 0,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    initialData: [],
  });

  const { data: lockerAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    initialData: [],
  });

  useEffect(() => {
    if (onboarding) {
      setFormData({
        ...onboarding,
        documentos_pendientes: onboarding.documentos_pendientes || formData.documentos_pendientes,
        recursos_asignados: onboarding.recursos_asignados || formData.recursos_asignados,
        pasos_completados: onboarding.pasos_completados || formData.pasos_completados,
      });
      setCurrentStep(onboarding.paso_actual || 1);
    }
  }, [onboarding]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (onboarding?.id) {
        return base44.entities.EmployeeOnboarding.update(onboarding.id, data);
      }
      return base44.entities.EmployeeOnboarding.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeOnboardings'] });
      toast.success("Onboarding guardado correctamente");
      onClose();
    },
  });

  const calculateProgress = () => {
    const steps = Object.values(formData.pasos_completados);
    const completed = steps.filter(Boolean).length;
    return Math.round((completed / steps.length) * 100);
  };

  const handleStepComplete = (stepKey) => {
    setFormData({
      ...formData,
      pasos_completados: {
        ...formData.pasos_completados,
        [stepKey]: true,
      },
      porcentaje_completado: calculateProgress(),
    });
  };

  const handleDocumentUpload = async (docIndex, file) => {
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const newDocs = [...formData.documentos_pendientes];
      newDocs[docIndex] = {
        ...newDocs[docIndex],
        recibido: true,
        archivo_url: result.file_url,
        fecha_recepcion: new Date().toISOString(),
      };
      setFormData({ ...formData, documentos_pendientes: newDocs });
      toast.success("Documento subido correctamente");
    } catch {
      toast.error("Error al subir documento");
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentSigned = (docIndex, signedDocument) => {
    const newDocs = [...formData.documentos_pendientes];
    newDocs[docIndex] = signedDocument;
    setFormData({ ...formData, documentos_pendientes: newDocs });
    setSigningDocument(null);
  };

  const handleAssignLocker = async () => {
    if (!formData.employee_id) return;

    try {
      const existing = lockerAssignments.find(la => la.employee_id === formData.employee_id);
      
      if (existing && existing.numero_taquilla_actual) {
        toast.info("Este empleado ya tiene una taquilla asignada");
        setFormData({
          ...formData,
          recursos_asignados: {
            ...formData.recursos_asignados,
            taquilla_asignada: true,
          },
        });
        return;
      }

      if (!existing) {
        await base44.entities.LockerAssignment.create({
          employee_id: formData.employee_id,
          requiere_taquilla: true,
          fecha_asignacion: new Date().toISOString(),
        });
      }

      setFormData({
        ...formData,
        recursos_asignados: {
          ...formData.recursos_asignados,
          taquilla_asignada: true,
        },
      });
      toast.success("Taquilla asignada correctamente");
    } catch {
      toast.error("Error al asignar taquilla");
    }
  };

  const handleSendNotification = async (tipo) => {
    if (!formData.employee_id) return;

    const employee = employees.find(e => e.id === formData.employee_id);
    if (!employee?.email) {
      toast.error("El empleado no tiene email registrado");
      return;
    }

    try {
      const messages = {
        bienvenida: {
          subject: "¡Bienvenido/a al equipo!",
          body: `Hola ${employee.nombre},\n\n¡Bienvenido/a a nuestra empresa! Estamos encantados de tenerte en el equipo.\n\nEn los próximos días recibirás más información sobre tu incorporación.\n\nSaludos,\nEquipo de RRHH`,
        },
        documentos: {
          subject: "Documentación pendiente para onboarding",
          body: `Hola ${employee.nombre},\n\nPor favor, envíanos los siguientes documentos pendientes para completar tu proceso de incorporación.\n\nSaludos,\nEquipo de RRHH`,
        },
        credenciales: {
          subject: "Credenciales de acceso",
          body: `Hola ${employee.nombre},\n\nAdjunto encontrarás tus credenciales de acceso a los sistemas de la empresa.\n\nSaludos,\nEquipo de RRHH`,
        },
      };

      const msg = messages[tipo];
      await base44.integrations.Core.SendEmail({
        to: employee.email,
        subject: msg.subject,
        body: msg.body,
      });

      const newNotifications = [
        ...(formData.notificaciones_enviadas || []),
        {
          tipo,
          fecha: new Date().toISOString(),
          destinatario: employee.email,
        },
      ];

      setFormData({
        ...formData,
        notificaciones_enviadas: newNotifications,
      });

      toast.success("Notificación enviada correctamente");
    } catch {
      toast.error("Error al enviar notificación");
    }
  };

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      paso_actual: currentStep,
      porcentaje_completado: calculateProgress(),
    };

    const progress = calculateProgress();
    if (progress === 0) {
      dataToSave.estado = "Pendiente";
    } else if (progress === 100) {
      dataToSave.estado = "Completado";
      dataToSave.fecha_completado = new Date().toISOString().split('T')[0];
    } else {
      dataToSave.estado = "En Proceso";
    }

    saveMutation.mutate(dataToSave);
  };

  const steps = [
    { number: 1, name: "Bienvenida", key: "paso_1_bienvenida" },
    { number: 2, name: "Datos Personales", key: "paso_2_datos_personales" },
    { number: 3, name: "Documentos", key: "paso_3_documentos" },
    { number: 4, name: "Configuración Cuenta", key: "paso_4_configuracion_cuenta" },
    { number: 5, name: "Asignación Recursos", key: "paso_5_asignacion_recursos" },
    { number: 6, name: "Formación Inicial", key: "paso_6_formacion_inicial" },
  ];

  const getEmployeeName = () => {
    const emp = employees.find(e => e.id === formData.employee_id);
    return emp?.nombre || "Empleado";
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {onboarding ? "Gestionar Onboarding" : "Nuevo Proceso de Onboarding"}
            </DialogTitle>
            <DialogDescription>
              Complete la información necesaria para el proceso de incorporación del empleado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Progreso del Onboarding</span>
                <span className="text-sm font-bold text-blue-600">{calculateProgress()}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${calculateProgress()}%` }}
                />
              </div>
            </div>

            {/* Step Navigator */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <button
                    onClick={() => setCurrentStep(step.number)}
                    className={`flex flex-col items-center min-w-24 p-2 rounded-lg transition-all ${
                      currentStep === step.number
                        ? "bg-blue-100 border-2 border-blue-500"
                        : "bg-slate-50 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {formData.pasos_completados[step.key] ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400" />
                      )}
                      <span className="text-xs font-semibold">{step.number}</span>
                    </div>
                    <span className="text-xs text-center">{step.name}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step Content */}
            <div className="border border-slate-200 rounded-lg p-6 bg-white">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Paso 1: Bienvenida</h3>
                  
                  <div className="space-y-2">
                    <Label>Seleccionar Empleado *</Label>
                    <Select
                      value={formData.employee_id}
                      onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                      disabled={!!onboarding}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar empleado" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.nombre} - {emp.departamento || "Sin departamento"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha de Inicio *</Label>
                    <Input
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Responsable del Onboarding</Label>
                    <Input
                      placeholder="Email del responsable"
                      value={formData.responsable_onboarding}
                      onChange={(e) => setFormData({ ...formData, responsable_onboarding: e.target.value })}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Email de Bienvenida</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      Envía un email de bienvenida al nuevo empleado
                    </p>
                    <Button
                      onClick={() => handleSendNotification('bienvenida')}
                      disabled={!formData.employee_id}
                      variant="outline"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Email de Bienvenida
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="step1"
                      checked={formData.pasos_completados.paso_1_bienvenida}
                      onCheckedChange={() => handleStepComplete('paso_1_bienvenida')}
                    />
                    <label htmlFor="step1" className="text-sm font-medium">
                      Marcar paso como completado
                    </label>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Paso 2: Datos Personales</h3>
                  <p className="text-sm text-slate-600">
                    Verifica que los datos personales del empleado estén completos en su ficha
                  </p>

                  {formData.employee_id && (() => {
                    const emp = employees.find(e => e.id === formData.employee_id);
                    if (!emp) return null;

                    return (
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                        <div>
                          <p className="text-xs text-slate-500">DNI/NIE</p>
                          <p className="font-medium">{emp.dni || "No registrado"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Email</p>
                          <p className="font-medium">{emp.email || "No registrado"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Teléfono</p>
                          <p className="font-medium">{emp.telefono_movil || "No registrado"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Dirección</p>
                          <p className="font-medium">{emp.direccion || "No registrado"}</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="step2"
                      checked={formData.pasos_completados.paso_2_datos_personales}
                      onCheckedChange={() => handleStepComplete('paso_2_datos_personales')}
                    />
                    <label htmlFor="step2" className="text-sm font-medium">
                      Datos personales verificados y completos
                    </label>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Paso 3: Documentos con Firma Digital</h3>
                  
                  <div className="space-y-3">
                    {formData.documentos_pendientes.map((doc, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {doc.recibido ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="font-medium">{doc.nombre}</span>
                            {doc.requerido && (
                              <Badge variant="outline" className="text-xs">Obligatorio</Badge>
                            )}
                            {doc.requiere_firma && (
                              <Badge className="bg-purple-100 text-purple-800 text-xs">
                                <PenTool className="w-3 h-3 mr-1" />
                                Requiere Firma
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {!doc.recibido ? (
                          <div className="mt-2 flex gap-2">
                            {doc.requiere_firma ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!formData.employee_id}
                                onClick={() => setSigningDocument({ ...doc, index })}
                              >
                                <PenTool className="w-4 h-4 mr-2" />
                                Firmar Digitalmente
                              </Button>
                            ) : (
                              <>
                                <input
                                  type="file"
                                  id={`doc-${index}`}
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) handleDocumentUpload(index, file);
                                  }}
                                />
                                <label htmlFor={`doc-${index}`}>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={uploading}
                                    onClick={() => document.getElementById(`doc-${index}`).click()}
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {uploading ? "Subiendo..." : "Subir Documento"}
                                  </Button>
                                </label>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm">
                            <Badge className="bg-green-600">
                              ✓ Recibido el {new Date(doc.fecha_recepcion).toLocaleDateString()}
                            </Badge>
                            {doc.firma_digital && (
                              <Badge className="bg-purple-600 ml-2">
                                Firmado digitalmente
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <Button
                      onClick={() => handleSendNotification('documentos')}
                      disabled={!formData.employee_id}
                      variant="outline"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Recordar Documentos Pendientes
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="step3"
                      checked={formData.pasos_completados.paso_3_documentos}
                      onCheckedChange={() => handleStepComplete('paso_3_documentos')}
                    />
                    <label htmlFor="step3" className="text-sm font-medium">
                      Documentos recopilados y verificados
                    </label>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Paso 4: Configuración de Cuenta</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium">Email corporativo creado</span>
                      <Checkbox
                        checked={formData.recursos_asignados.accesos_sistemas}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            recursos_asignados: {
                              ...formData.recursos_asignados,
                              accesos_sistemas: checked,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <Button
                      onClick={() => handleSendNotification('credenciales')}
                      disabled={!formData.employee_id}
                      variant="outline"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Credenciales por Email
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="step4"
                      checked={formData.pasos_completados.paso_4_configuracion_cuenta}
                      onCheckedChange={() => handleStepComplete('paso_4_configuracion_cuenta')}
                    />
                    <label htmlFor="step4" className="text-sm font-medium">
                      Cuenta configurada y credenciales enviadas
                    </label>
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Paso 5: Asignación de Recursos</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium">Taquilla asignada</span>
                        <p className="text-xs text-slate-600">Asignar vestuario y taquilla</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!formData.recursos_asignados.taquilla_asignada && (
                          <Button
                            size="sm"
                            onClick={handleAssignLocker}
                            disabled={!formData.employee_id}
                          >
                            Asignar Taquilla
                          </Button>
                        )}
                        <Checkbox
                          checked={formData.recursos_asignados.taquilla_asignada}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              recursos_asignados: {
                                ...formData.recursos_asignados,
                                taquilla_asignada: checked,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium">Equipo de trabajo entregado</span>
                      <Checkbox
                        checked={formData.recursos_asignados.equipo_asignado}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            recursos_asignados: {
                              ...formData.recursos_asignados,
                              equipo_asignado: checked,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="step5"
                      checked={formData.pasos_completados.paso_5_asignacion_recursos}
                      onCheckedChange={() => handleStepComplete('paso_5_asignacion_recursos')}
                    />
                    <label htmlFor="step5" className="text-sm font-medium">
                      Todos los recursos asignados
                    </label>
                  </div>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Paso 6: Formación Inicial</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTrainingManager(true)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Gestionar Módulos
                    </Button>
                  </div>
                  
                  {formData.employee_id ? (
                    <TrainingAssignment
                      employeeId={formData.employee_id}
                      onboardingId={onboarding?.id}
                      onComplete={() => {
                        setFormData({
                          ...formData,
                          recursos_asignados: {
                            ...formData.recursos_asignados,
                            formacion_seguridad: true,
                          },
                        });
                      }}
                    />
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      Selecciona un empleado primero
                    </div>
                  )}

                  <div className="space-y-2 pt-4 border-t">
                    <Label>Notas Adicionales</Label>
                    <Textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      rows={4}
                      placeholder="Añade cualquier observación sobre el proceso de onboarding..."
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="step6"
                      checked={formData.pasos_completados.paso_6_formacion_inicial}
                      onCheckedChange={() => handleStepComplete('paso_6_formacion_inicial')}
                    />
                    <label htmlFor="step6" className="text-sm font-medium">
                      Formación inicial completada
                    </label>
                  </div>

                  {calculateProgress() === 100 && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-900">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold">¡Onboarding Completado!</span>
                      </div>
                      <p className="text-sm text-green-800 mt-1">
                        El proceso de incorporación ha sido completado exitosamente.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={saveMutation.isPending || !formData.employee_id || !formData.fecha_inicio}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? "Guardando..." : "Guardar Progreso"}
                </Button>
              </div>

              <Button
                onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
                disabled={currentStep === 6}
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Signature Dialog */}
      {signingDocument && (
        <DocumentSignature
          document={signingDocument}
          employeeName={getEmployeeName()}
          onSigned={(signedDoc) => handleDocumentSigned(signingDocument.index, signedDoc)}
          onClose={() => setSigningDocument(null)}
        />
      )}

      {/* Training Module Manager */}
      {showTrainingManager && (
        <TrainingModuleManager
          onClose={() => setShowTrainingManager(false)}
        />
      )}
    </>
  );
}
