import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAppData } from "../data/DataProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Briefcase, Clock, Home, FileText, Calendar, Wrench, AlertCircle, TrendingDown, ArrowLeft, Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import { getMachineAlias } from "@/utils/machineAlias";

export default function MasterEmployeeEditDialog({ employee, open, onClose, permissions: propPermissions }) {
  const [activeTab, setActiveTab] = useState("personal");
  const [formData, setFormData] = useState({
    nombre: "",
    codigo_empleado: "",
    estado_empleado: "Alta",
    disponibilidad: "Disponible",
    incluir_en_planning: true,
  });
  const queryClient = useQueryClient();

  // USAR DATAPROVIDER PARA MÁQUINAS Y EQUIPOS - evita duplicación y problemas de timing
  const { teams = [], machines: sharedMachines = [] } = useAppData();

  // Mapear máquinas del DataProvider al formato esperado
  const allMachines = useMemo(() => {
    return sharedMachines.map(m => ({
      id: m.id,
      alias: getMachineAlias(m),
      tipo: m.tipo || '',
      estado: m.estado || 'Disponible',
      orden: m.orden || 999
    })).sort((a, b) => a.orden - b.orden);
  }, [sharedMachines]);

  const { data: employeeSkills = [] } = useQuery({
    queryKey: ['employeeSkills', employee?.id],
    queryFn: async () => {
      if (!employee?.id) return [];
      try {
        const allSkills = await base44.entities.EmployeeMachineSkill.list(undefined, 1000);
        const filtered = allSkills.filter(s => s.employee_id === employee.id);
        console.log(`Skills cargados para ${employee.nombre}:`, filtered.length);
        return filtered;
      } catch (error) {
        console.error('Error cargando skills:', error);
        return [];
      }
    },
    enabled: !!employee?.id && open,
    initialData: [],
    staleTime: 0, // Forzar recarga cada vez
  });

  const { data: departments = [], isLoading: isLoadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: positions = [], isLoading: isLoadingPositions } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
  });

  // Derived state for filtering positions based on selected department
  const filteredPositions = useMemo(() => {
    if (!formData.departamento) return [];
    const selectedDept = departments.find(d => d.name === formData.departamento);
    if (!selectedDept) return [];
    return positions.filter(p => p.department_id === selectedDept.id);
  }, [formData.departamento, departments, positions]);

  // Query para obtener datos frescos del empleado individual al abrir el diálogo
  // Esto asegura que veamos los saldos actualizados aunque la lista padre esté cacheada
  const { data: freshEmployeeData } = useQuery({
    queryKey: ['employeeMasterDatabase', employee?.id],
    queryFn: async () => {
      if (!employee?.id) return null;
      return await base44.entities.EmployeeMasterDatabase.read(employee.id);
    },
    enabled: !!employee?.id && open,
    staleTime: 0,
  });

  const { data: emergencyMembers } = useQuery({
    queryKey: ['emergencyTeamMembers'],
    queryFn: () => base44.entities.EmergencyTeamMember.list(),
    initialData: [],
    staleTime: 0,
    gcTime: 0
  });

  const emergency = (emergencyMembers || []).filter(em => em.employee_id === employee?.id && em.activo);

  // Cargar datos del empleado cuando cambie la prop o llegue data fresca
  useEffect(() => {
    // Preferir datos frescos de la query individual, fallback a la prop
    const sourceData = freshEmployeeData || employee;

    if (sourceData && open) {
      
      // Empezar con datos base del empleado
      const updatedFormData = { ...sourceData };
      
      // PRIORIZAR EmployeeMachineSkill sobre campos legacy maquina_X
      // Esto asegura que siempre mostramos los datos correctos de la tabla normalizada
      if (employeeSkills && employeeSkills.length > 0) {
        
        // Primero limpiar todos los slots legacy
        for (let i = 1; i <= 10; i++) {
          updatedFormData[`maquina_${i}`] = null;
        }
        
        // Luego aplicar skills de EmployeeMachineSkill
        employeeSkills.forEach((skill) => {
          const prioridad = skill.orden_preferencia;
          if (prioridad >= 1 && prioridad <= 10) {
            updatedFormData[`maquina_${prioridad}`] = skill.machine_id;
          }
        });
      }
      
      setFormData(updatedFormData);
    } else if (!employee) {
      setFormData({
        nombre: "",
        codigo_empleado: "",
        estado_empleado: "Alta",
        disponibilidad: "Disponible",
        incluir_en_planning: true,
      });
    }
  }, [employee, freshEmployeeData, employeeSkills, open]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // RBAC queries removed

  // Simplificación radical: Usar los props directamente o defaults
  // Eliminamos TODA la lógica de cálculo interno que causaba loops
  // El componente padre es responsable de pasar los permisos correctos
  const permissions = propPermissions || {
    contrato: { ver: true, editar: true },
    campos: { editar_sensible: true, editar_contacto: true, ver_salario: true, ver_dni: true },
    tabs: {
      personal: true,
      organizacion: true,
      horarios: true,
      taquilla: true,
      contrato: true,
      absentismo: true,
      maquinas: true,
      disponibilidad: true,
      emergencias: true
    }
  };

  // Ensure active tab is allowed
  // Using stringified permissions to prevent infinite loops from reference instability
  const tabsPermissionsStr = JSON.stringify(permissions?.tabs);
  
  useEffect(() => {
    if (open && permissions?.tabs) {
      // Only check if activeTab is explicitly disallowed (false) or undefined in tabs config
      const isAllowed = permissions.tabs[activeTab];
      
      if (!isAllowed) {
        // Current tab not allowed, find first allowed
        const allowed = Object.keys(permissions.tabs).find(key => permissions.tabs[key]);
        // Only update if allowed is different and strictly defined to avoid loops
        if (allowed && allowed !== activeTab) {
          setActiveTab(allowed);
        }
      } 
    }
    // Removed redundant check that could cause double updates
  }, [open, tabsPermissionsStr, activeTab]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Clean data before sending (remove system fields that might cause issues if present)
      const { id, created_date, updated_date, created_by, ...cleanData } = data;

      // Audit Logging - Wrapped in try/catch to prevent blocking save
      try {
        if (currentUser?.email) {
            const actionType = employee?.id ? 'update' : 'create';
            const details = employee?.id ? { changes: 'updated_record' } : { changes: 'created_record' };
            
            await base44.entities.EmployeeAuditLog.create({
                action_type: actionType,
                user_email: currentUser.email,
                target_employee_id: employee?.id || 'new',
                target_employee_name: data.nombre,
                details: JSON.stringify(details),
                timestamp: new Date().toISOString()
            });
        }
      } catch (auditError) {
        console.warn("Audit log failed, proceeding with save:", auditError);
      }

      let savedEmployee;
      if (employee?.id) {
        savedEmployee = await base44.entities.EmployeeMasterDatabase.update(employee.id, cleanData);
      } else {
        savedEmployee = await base44.entities.EmployeeMasterDatabase.create(cleanData);
      }

      // Sincronizar EmployeeMachineSkill con campos legacy maquina_1...maquina_10
      if (savedEmployee?.id || employee?.id) {
        const empId = savedEmployee?.id || employee?.id;
        
        // Obtener skills existentes
        const existingSkills = employeeSkills || [];
        
        // Procesar cada prioridad (1-10)
        for (let i = 1; i <= 10; i++) {
          const machineId = cleanData[`maquina_${i}`];
          const existingSkill = existingSkills.find(s => s.orden_preferencia === i);
          
          if (machineId && !existingSkill) {
            // Crear nuevo skill
            await base44.entities.EmployeeMachineSkill.create({
              employee_id: empId,
              machine_id: machineId,
              orden_preferencia: i,
              nivel_habilidad: 'Intermedio'
            });
          } else if (!machineId && existingSkill) {
            // Eliminar skill
            await base44.entities.EmployeeMachineSkill.delete(existingSkill.id);
          } else if (machineId && existingSkill && existingSkill.machine_id !== machineId) {
            // Actualizar skill
            await base44.entities.EmployeeMachineSkill.update(existingSkill.id, {
              machine_id: machineId
            });
          }
        }
      }

      return savedEmployee;
    },
    onSuccess: () => {
      // Invalidación automática mediante el hook
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['allEmployeesMaster'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['employeeSkills'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMachineSkills'] });
      queryClient.invalidateQueries({ queryKey: ['machineAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['shiftAssignments'] });
      toast.success("Empleado guardado correctamente. Cambios aplicados en todos los módulos.");
      onClose();
    },
    onError: (error) => {
        console.error("Error saving employee:", error);
        toast.error(`Error al guardar los cambios: ${error.message || "Error desconocido"}`);
    }
  });

  const isBaja = formData.estado_empleado === "Baja";
  const isTurnoFijo = formData.tipo_turno === "Fijo Mañana" || formData.tipo_turno === "Fijo Tarde";

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="employee-edit-description">
        <DialogHeader>
          <DialogTitle>{employee?.id ? `Editar Empleado - ${employee.nombre}` : 'Nueva Alta de Empleado en Base Maestra'}</DialogTitle>
          <p id="employee-edit-description" className="sr-only">
            Formulario para {employee?.id ? 'editar' : 'crear'} información de empleado
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-wrap w-full">
              {permissions.tabs.personal && (
                <TabsTrigger value="personal" className="flex-1">
                  <User className="w-4 h-4 mr-1" />
                  Personal
                </TabsTrigger>
              )}
              {permissions.tabs.organizacion && (
                <TabsTrigger value="organizacion" className="flex-1">
                  <Briefcase className="w-4 h-4 mr-1" />
                  Org.
                </TabsTrigger>
              )}
              {permissions.tabs.horarios && (
                <TabsTrigger value="horarios" className="flex-1">
                  <Clock className="w-4 h-4 mr-1" />
                  Horarios
                </TabsTrigger>
              )}
              {permissions.tabs.taquilla && (
                <TabsTrigger value="taquilla" className="flex-1">
                  <Home className="w-4 h-4 mr-1" />
                  Taquilla
                </TabsTrigger>
              )}
              {(permissions.tabs.contrato || permissions.contrato?.ver) && (
                <TabsTrigger value="contrato" className="flex-1">
                  <FileText className="w-4 h-4 mr-1" />
                  Contrato
                </TabsTrigger>
              )}
              {permissions.tabs.absentismo && (
                <TabsTrigger value="absentismo" className="flex-1">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  Absencias
                </TabsTrigger>
              )}
              {permissions.tabs.maquinas && (
                <TabsTrigger value="maquinas" className="flex-1">
                  <Wrench className="w-4 h-4 mr-1" />
                  Máquinas
                </TabsTrigger>
              )}
              {permissions.tabs.disponibilidad && (
                <TabsTrigger value="disponibilidad" className="flex-1">
                  <Calendar className="w-4 h-4 mr-1" />
                  Disp.
                </TabsTrigger>
              )}
              {permissions.tabs.emergencias && (
                <TabsTrigger value="emergencias" className="flex-1">
                  <Flame className="w-4 h-4 mr-1" />
                  Emergencias
                </TabsTrigger>
              )}
            </TabsList>

            {permissions.tabs.personal && (
            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código Empleado</Label>
                  <Input
                    value={formData.codigo_empleado || ""}
                    onChange={(e) => setFormData({ ...formData, codigo_empleado: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nombre Completo *</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={formData.estado_empleado || "Alta"}
                    onValueChange={(value) => setFormData({ ...formData, estado_empleado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isBaja && (
                  <>
                    <div className="space-y-2">
                      <Label>Fecha de Baja</Label>
                      <Input
                        type="date"
                        value={formData.fecha_baja || ""}
                        onChange={(e) => setFormData({ ...formData, fecha_baja: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Motivo de Baja</Label>
                      <Input
                        value={formData.motivo_baja || ""}
                        onChange={(e) => setFormData({ ...formData, motivo_baja: e.target.value })}
                        placeholder="Especifica el motivo de la baja..."
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Fecha Nacimiento</Label>
                  <Input
                    type="date"
                    value={formData.fecha_nacimiento || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                  />
                </div>

                {permissions.campos.ver_dni && (
                  <>
                    <div className="space-y-2">
                      <Label>DNI/NIE</Label>
                      <Input
                        value={formData.dni || ""}
                        onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>NUSS</Label>
                      <Input
                        value={formData.nuss || ""}
                        onChange={(e) => setFormData({ ...formData, nuss: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select
                    value={formData.sexo || ""}
                    onValueChange={(value) => setFormData({ ...formData, sexo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nacionalidad</Label>
                  <Select
                    value={formData.nacionalidad || ""}
                    onValueChange={(value) => setFormData({ ...formData, nacionalidad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar nacionalidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESPAÑOLA">ESPAÑOLA</SelectItem>
                      <SelectItem value="RUMANA">RUMANA</SelectItem>
                      <SelectItem value="VENEZOLANA">VENEZOLANA</SelectItem>
                      <SelectItem value="COLOMBIANA">COLOMBIANA</SelectItem>
                      <SelectItem value="BULGARA">BÚLGARA</SelectItem>
                      <SelectItem value="CUBANA">CUBANA</SelectItem>
                      <SelectItem value="ARGENTINA">ARGENTINA</SelectItem>
                      <SelectItem value="SALVADOREÑA">SALVADOREÑA</SelectItem>
                      <SelectItem value="BRASILEÑA">BRASILEÑA</SelectItem>
                      <SelectItem value="POLACA">POLACA</SelectItem>
                      <SelectItem value="PORTUGUESA">PORTUGUESA</SelectItem>
                      <SelectItem value="UCRANIANA">UCRANIANA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Dirección</Label>
                  <Input
                    value={formData.direccion || ""}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    disabled={!permissions.campos.editar_contacto}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!permissions.campos.editar_contacto}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Teléfono Móvil</Label>
                  <Input
                    value={formData.telefono_movil || ""}
                    onChange={(e) => setFormData({ ...formData, telefono_movil: e.target.value })}
                    disabled={!permissions.campos.editar_contacto}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contacto Emergencia</Label>
                  <Input
                    placeholder="Nombre"
                    value={formData.contacto_emergencia_nombre || ""}
                    onChange={(e) => setFormData({ ...formData, contacto_emergencia_nombre: e.target.value })}
                    disabled={!permissions.campos.editar_contacto}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Teléfono Emergencia</Label>
                  <Input
                    value={formData.contacto_emergencia_telefono || ""}
                    onChange={(e) => setFormData({ ...formData, contacto_emergencia_telefono: e.target.value })}
                    disabled={!permissions.campos.editar_contacto}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Relación</Label>
                  <Input
                    placeholder="Ej: Padre, Madre, Cónyuge"
                    value={formData.contacto_emergencia_relacion || ""}
                    onChange={(e) => setFormData({ ...formData, contacto_emergencia_relacion: e.target.value })}
                  />
                </div>

                {permissions.campos.ver_bancarios && (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-semibold text-blue-900">Datos Bancarios (Nóminas)</Label>
                    </div>

                    <div className="space-y-2">
                      <Label>IBAN</Label>
                      <Input
                        placeholder="ES00 0000 0000 0000 0000 0000 0000"
                        value={formData.iban || ""}
                        onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>SWIFT/BIC</Label>
                      <Input
                        placeholder="BBVAESMM"
                        value={formData.swift_bic || ""}
                        onChange={(e) => setFormData({ ...formData, swift_bic: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Nombre del Banco</Label>
                      <Input
                        placeholder="Ej: Banco Santander"
                        value={formData.banco_nombre || ""}
                        onChange={(e) => setFormData({ ...formData, banco_nombre: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
            )}

            {permissions.tabs.organizacion && (
            <TabsContent value="organizacion" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select
                    value={formData.departamento || ""}
                    onValueChange={(value) => setFormData({ ...formData, departamento: value, puesto: "" })}
                    disabled={isLoadingDepts}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingDepts ? "Cargando departamentos..." : "Seleccionar departamento"} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingDepts ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : departments.length > 0 ? (
                        departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.name}>
                            {dept.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground">No hay departamentos creados</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Puesto</Label>
                  <Select
                    value={formData.puesto || ""}
                    onValueChange={(value) => setFormData({ ...formData, puesto: value })}
                    disabled={!formData.departamento || isLoadingPositions}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingPositions ? "Cargando puestos..." : "Seleccionar puesto"} />
                    </SelectTrigger>
                    <SelectContent>
                       {isLoadingPositions ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                       ) : filteredPositions.length > 0 ? (
                        filteredPositions.map((pos) => (
                          <SelectItem key={pos.id} value={pos.name}>
                            {pos.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground">
                           {formData.departamento 
                             ? "No hay puestos en este departamento" 
                             : "Selecciona un departamento"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Input
                    value={formData.categoria || ""}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="Ej: Categoría 1, S/C"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Equipo {isTurnoFijo && "(No aplica para turnos fijos)"}</Label>
                  <Select
                    value={formData.equipo || ""}
                    onValueChange={(value) => setFormData({ ...formData, equipo: value })}
                    disabled={isTurnoFijo}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isTurnoFijo ? "Turnos fijos sin equipo" : "Seleccionar equipo"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sin equipo</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.team_name}>
                          {team.team_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Formación</Label>
                  <Textarea
                    value={formData.formacion || ""}
                    onChange={(e) => setFormData({ ...formData, formacion: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>
            )}

            {permissions.tabs.horarios && (
            <TabsContent value="horarios" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo Jornada</Label>
                  <Select
                    value={formData.tipo_jornada || ""}
                    onValueChange={(value) => setFormData({ ...formData, tipo_jornada: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar jornada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Jornada Completa">Jornada Completa</SelectItem>
                      <SelectItem value="Jornada Parcial">Jornada Parcial</SelectItem>
                      <SelectItem value="Reduccion de Jornada">Reducción de Jornada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Horas Jornada</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.num_horas_jornada || ""}
                    onChange={(e) => setFormData({ ...formData, num_horas_jornada: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo Turno</Label>
                  <Select
                    value={formData.tipo_turno || ""}
                    onValueChange={(value) => setFormData({ ...formData, tipo_turno: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rotativo">Rotativo</SelectItem>
                      <SelectItem value="Fijo Mañana">Fijo Mañana</SelectItem>
                      <SelectItem value="Fijo Tarde">Fijo Tarde</SelectItem>
                      <SelectItem value="Turno Partido">Turno Partido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Incluir en Planning</Label>
                  <Select
                    value={formData.incluir_en_planning !== false ? "true" : "false"}
                    onValueChange={(value) => setFormData({ ...formData, incluir_en_planning: value === "true" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí - Contar en planning</SelectItem>
                      <SelectItem value="false">No - Excluir de planning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Horario Mañana Inicio</Label>
                  <Input
                    type="time"
                    value={formData.horario_manana_inicio || ""}
                    onChange={(e) => setFormData({ ...formData, horario_manana_inicio: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horario Mañana Fin</Label>
                  <Input
                    type="time"
                    value={formData.horario_manana_fin || ""}
                    onChange={(e) => setFormData({ ...formData, horario_manana_fin: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horario Tarde Inicio</Label>
                  <Input
                    type="time"
                    value={formData.horario_tarde_inicio || ""}
                    onChange={(e) => setFormData({ ...formData, horario_tarde_inicio: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horario Tarde Fin</Label>
                  <Input
                    type="time"
                    value={formData.horario_tarde_fin || ""}
                    onChange={(e) => setFormData({ ...formData, horario_tarde_fin: e.target.value })}
                  />
                </div>

                {formData.tipo_turno === "Turno Partido" && (
                  <div className="md:col-span-2 space-y-4 p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                    <h4 className="font-semibold text-purple-900">Configuración de Turno Partido</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Entrada 1</Label>
                        <Input
                          type="time"
                          value={formData.turno_partido_entrada1 || ""}
                          onChange={(e) => setFormData({ ...formData, turno_partido_entrada1: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Salida 1</Label>
                        <Input
                          type="time"
                          value={formData.turno_partido_salida1 || ""}
                          onChange={(e) => setFormData({ ...formData, turno_partido_salida1: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Entrada 2</Label>
                        <Input
                          type="time"
                          value={formData.turno_partido_entrada2 || ""}
                          onChange={(e) => setFormData({ ...formData, turno_partido_entrada2: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Salida 2</Label>
                        <Input
                          type="time"
                          value={formData.turno_partido_salida2 || ""}
                          onChange={(e) => setFormData({ ...formData, turno_partido_salida2: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            )}

            {permissions.tabs.taquilla && (
            <TabsContent value="taquilla" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vestuario</Label>
                  <Select
                    value={formData.taquilla_vestuario || ""}
                    onValueChange={(value) => setFormData({ ...formData, taquilla_vestuario: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vestuario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vestuario Femenino Planta Baja">Vestuario Femenino Planta Baja</SelectItem>
                      <SelectItem value="Vestuario Femenino Planta Alta">Vestuario Femenino Planta Alta</SelectItem>
                      <SelectItem value="Vestuario Masculino Planta Baja">Vestuario Masculino Planta Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Número Taquilla</Label>
                  <Input
                    value={formData.taquilla_numero || ""}
                    onChange={(e) => setFormData({ ...formData, taquilla_numero: e.target.value })}
                    placeholder="Ej: 101, A-15, etc."
                  />
                </div>
              </div>
            </TabsContent>
            )}

            {(permissions.tabs.contrato || permissions.contrato?.ver) && (
              <TabsContent value="contrato" className="space-y-4 mt-4">
                {!permissions.contrato?.editar && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    Solo lectura - No tienes permisos para editar contratos
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha Alta</Label>
                    <Input
                      type="date"
                      value={formData.fecha_alta || ""}
                      onChange={(e) => setFormData({ ...formData, fecha_alta: e.target.value })}
                      disabled={!permissions.contrato?.editar}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo Contrato</Label>
                    <Select
                      value={formData.tipo_contrato || ""}
                      onValueChange={(value) => setFormData({ ...formData, tipo_contrato: value })}
                      disabled={!permissions.contrato?.editar}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INDEFINIDO">INDEFINIDO</SelectItem>
                        <SelectItem value="TEMPORAL">TEMPORAL</SelectItem>
                        <SelectItem value="ETT">ETT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Código Contrato</Label>
                    <Input
                      value={formData.codigo_contrato || ""}
                      onChange={(e) => setFormData({ ...formData, codigo_contrato: e.target.value })}
                      disabled={!permissions.contrato?.editar}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha Fin Contrato</Label>
                    <Input
                      type="date"
                      value={formData.fecha_fin_contrato || ""}
                      onChange={(e) => setFormData({ ...formData, fecha_fin_contrato: e.target.value })}
                      disabled={!permissions.contrato?.editar}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Empresa ETT</Label>
                    <Input
                      value={formData.empresa_ett || ""}
                      onChange={(e) => setFormData({ ...formData, empresa_ett: e.target.value })}
                      disabled={!permissions.contrato?.editar || formData.tipo_contrato !== "ETT"}
                      className={formData.tipo_contrato !== "ETT" ? "bg-slate-50" : ""}
                      placeholder={formData.tipo_contrato === "ETT" ? "Nombre de la empresa ETT" : ""}
                    />
                  </div>

                  {permissions.campos.ver_salario && (
                    <div className="space-y-2">
                      <Label>Salario Anual (€)</Label>
                      <Input
                        type="number"
                        value={formData.salario_anual || ""}
                        onChange={(e) => setFormData({ ...formData, salario_anual: parseFloat(e.target.value) })}
                        disabled={!permissions.contrato?.editar}
                      />
                    </div>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <Label>Evaluación de Responsable</Label>
                    <Input
                      value={formData.evaluacion_responsable || ""}
                      onChange={(e) => setFormData({ ...formData, evaluacion_responsable: e.target.value })}
                      placeholder="Evaluación del desempeño..."
                      disabled={!permissions.contrato?.editar}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Propuesta Cambio Categoría</Label>
                    <Select
                      value={formData.propuesta_cambio_categoria || ""}
                      onValueChange={(value) => setFormData({ ...formData, propuesta_cambio_categoria: value })}
                      disabled={!permissions.contrato?.editar}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Sin propuesta</SelectItem>
                        <SelectItem value="1">Categoría 1</SelectItem>
                        <SelectItem value="2">Categoría 2</SelectItem>
                        <SelectItem value="3">Categoría 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Propuesto Por</Label>
                    <Input
                      value={formData.propuesta_cambio_quien || ""}
                      onChange={(e) => setFormData({ ...formData, propuesta_cambio_quien: e.target.value })}
                      placeholder="Nombre de quien propone el cambio"
                      disabled={!permissions.contrato?.editar}
                    />
                  </div>
                </div>
              </TabsContent>
            )}

            {permissions.tabs.absentismo && (
            <TabsContent value="absentismo" className="space-y-4 mt-4">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
                <AlertCircle className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm text-blue-800">
                  <strong>Información:</strong> Las tasas de absentismo se calculan automáticamente desde el módulo de Gestión de Ausencias. 
                  Los campos de Horas Causa Mayor son editables manualmente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tasa Absentismo (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.tasa_absentismo || 0}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Calculado automáticamente</p>
                </div>

                <div className="space-y-2">
                  <Label>Última Actualización</Label>
                  <Input
                    type="date"
                    value={formData.ultima_actualizacion_absentismo || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horas No Trabajadas</Label>
                  <Input
                    type="number"
                    value={formData.horas_no_trabajadas || 0}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Suma de ausencias</p>
                </div>

                <div className="space-y-2">
                  <Label>Horas Deberían Trabajarse</Label>
                  <Input
                    type="number"
                    value={formData.horas_deberian_trabajarse || 0}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Según jornada</p>
                </div>

                <div className="space-y-2">
                  <Label>Horas Causa Mayor Consumidas</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.horas_causa_mayor_consumidas || 0}
                    onChange={(e) => setFormData({ ...formData, horas_causa_mayor_consumidas: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horas Causa Mayor Límite</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.horas_causa_mayor_limite || 0}
                    onChange={(e) => setFormData({ ...formData, horas_causa_mayor_limite: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Días Vacaciones Protección (Pendientes)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={formData.dias_vacaciones_proteccion || 0}
                    readOnly
                    className="bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Este campo se calcula automáticamente desde el panel de ausencias. No es editable manualmente para evitar desincronización.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Último Reset Causa Mayor</Label>
                  <Input
                    type="date"
                    value={formData.ultimo_reset_causa_mayor || ""}
                    onChange={(e) => setFormData({ ...formData, ultimo_reset_causa_mayor: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Se resetea anualmente</p>
                </div>
              </div>
            </TabsContent>
            )}

            {permissions.tabs.maquinas && (
            <TabsContent value="maquinas" className="space-y-4 mt-4">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Experiencia en Máquinas por Prioridad
                </h4>
                <p className="text-sm text-blue-800">
                  Configure hasta 10 máquinas ordenadas por nivel de experiencia del empleado (1 = mayor experiencia)
                </p>
              </div>

              <div className="space-y-2 mb-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600">
                  📊 Cargados: {employeeSkills.length} registros de máquinas | {allMachines.length} máquinas disponibles
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
                  // CRITICAL: Obtener valor actual del formData (ya procesado en useEffect)
                  const currentValue = formData[`maquina_${num}`];
                  
                  // Buscar la máquina seleccionada en allMachines
                  const selectedMachine = currentValue ? allMachines.find(m => m.id === currentValue) : null;

                  return (
                    <div key={num} className="space-y-2">
                      <Label>Máquina Prioridad {num}</Label>
                      <Select
                        value={currentValue || "none"}
                        onValueChange={(value) => {
                          setFormData({ ...formData, [`maquina_${num}`]: value === "none" ? null : value });
                        }}
                      >
                       <SelectTrigger>
                         <SelectValue placeholder="Sin asignar">
                           <span className="truncate text-slate-900 dark:text-slate-100">
                             {selectedMachine ? selectedMachine.alias : "Sin asignar"}
                           </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar</SelectItem>
                        {allMachines.map((machine) => (
                          <SelectItem key={machine.id} value={machine.id}>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-900 dark:text-slate-100">{machine.alias}</span>
                            </div>
                          </SelectItem>
                        ))}
                       </SelectContent>
                     </Select>
                   </div>
                 );
               })}
              </div>
            </TabsContent>
            )}

            {permissions.tabs.disponibilidad && (
            <TabsContent value="disponibilidad" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Disponibilidad Actual</Label>
                  <Select
                    value={formData.disponibilidad || "Disponible"}
                    onValueChange={(value) => setFormData({ ...formData, disponibilidad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Disponible">Disponible</SelectItem>
                      <SelectItem value="Ausente">Ausente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.disponibilidad === "Ausente" && (
                  <div className="p-4 border-2 border-amber-200 rounded-lg bg-amber-50 space-y-4">
                    <h4 className="font-semibold text-amber-900">Datos de Ausencia</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fecha Inicio Ausencia</Label>
                        <Input
                          type="datetime-local"
                          value={formData.ausencia_inicio || ""}
                          onChange={(e) => setFormData({ ...formData, ausencia_inicio: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha Fin Ausencia</Label>
                        <Input
                          type="datetime-local"
                          value={formData.ausencia_fin || ""}
                          onChange={(e) => setFormData({ ...formData, ausencia_fin: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Motivo de Ausencia</Label>
                        <Input
                          value={formData.ausencia_motivo || ""}
                          onChange={(e) => setFormData({ ...formData, ausencia_motivo: e.target.value })}
                          placeholder="Describe el motivo de la ausencia..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> Para gestión completa de ausencias (solicitudes, aprobaciones, tipos), 
                    utiliza el módulo de "Gestión de Ausencias" que sincronizará automáticamente con este campo.
                  </p>
                </div>
              </div>
            </TabsContent>
            )}

            {permissions.tabs.emergencias && (
            <TabsContent value="emergencias" className="space-y-4 mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-slate-900">
                  Equipo de Emergencia ({emergency.length})
                </h3>

                {emergency.length === 0 ? (
                  <Card className="bg-slate-50">
                    <CardContent className="p-8 text-center">
                      <Flame className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No participa en equipos de emergencia</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {emergency.map((em) => (
                      <Card key={em.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge className="bg-red-600 mb-2">{em.rol_emergencia}</Badge>
                              {em.es_suplente && (
                                <Badge variant="outline" className="ml-2">Suplente</Badge>
                              )}
                              <p className="text-xs text-slate-500 mt-2">
                                Desde: {em.fecha_nombramiento ? format(new Date(em.fecha_nombramiento), "dd/MM/yyyy", { locale: es }) : "-"}
                              </p>
                              {em.zona_asignada && (
                                <p className="text-xs text-slate-600 mt-1">
                                  Zona: {em.zona_asignada}
                                </p>
                              )}
                              {em.formacion_recibida && em.formacion_recibida.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-slate-700">Formaciones:</p>
                                  {em.formacion_recibida.map((f, idx) => (
                                    <Badge key={idx} variant="outline" className="mr-1 mt-1 text-xs">
                                      {f.nombre_curso}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> La gestión de los equipos de emergencia (asignación de roles, altas y bajas) se realiza desde el módulo "Comités y PRL".
                  </p>
                </div>
              </div>
            </TabsContent>
            )}
          </Tabs>

          <div className="flex justify-between items-center mt-6 pt-6 border-t">
            <Button type="button" variant="ghost" onClick={onClose}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver sin guardar
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Guardando..." : (employee?.id ? "Guardar Cambios" : "Crear Empleado")}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}