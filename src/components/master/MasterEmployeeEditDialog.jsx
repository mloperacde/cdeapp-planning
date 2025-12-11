import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Briefcase, Clock, Home, FileText, Calendar, Wrench, AlertCircle, TrendingDown } from "lucide-react";
import { toast } from "sonner";

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

  // Cargar datos del empleado cuando cambie la prop
  useEffect(() => {
    if (employee) {
      setFormData(employee);
    } else {
      setFormData({
        nombre: "",
        codigo_empleado: "",
        estado_empleado: "Alta",
        disponibilidad: "Disponible",
        incluir_en_planning: true,
      });
    }
  }, [employee, open]);

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: allMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: [],
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userRoleAssignments = [] } = useQuery({
    queryKey: ['userRoleAssignments', currentUser?.email],
    queryFn: () => base44.entities.UserRoleAssignment.filter({ user_email: currentUser?.email }),
    enabled: !!currentUser?.email && !propPermissions,
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    enabled: !propPermissions,
  });

  const permissions = React.useMemo(() => {
    // Default permissions structure
    const defaultPerms = {
      contrato: { ver: false, editar: false },
      campos: { editar_sensible: false, editar_contacto: false, ver_salario: false, ver_dni: false },
      tabs: {
        personal: true,
        organizacion: true,
        horarios: true,
        taquilla: true,
        contrato: false,
        absentismo: false,
        maquinas: true,
        disponibilidad: true
      }
    };

    if (propPermissions) {
      // Safely merge propPermissions with defaults to ensure all keys exist
      return {
        ...defaultPerms,
        ...propPermissions,
        tabs: { ...defaultPerms.tabs, ...(propPermissions.tabs || {}) },
        contrato: { ...defaultPerms.contrato, ...(propPermissions.contrato || {}) },
        campos: { ...defaultPerms.campos, ...(propPermissions.campos || {}) }
      };
    }

    if (!currentUser) return defaultPerms;

    if (currentUser.role === 'admin') return {
      contrato: { ver: true, editar: true },
      campos: { editar_sensible: true, editar_contacto: true, ver_salario: true, ver_dni: true },
      tabs: {
        personal: true, organizacion: true, horarios: true, taquilla: true, 
        contrato: true, absentismo: true, maquinas: true, disponibilidad: true
      }
    };

    let perms = { 
      ...defaultPerms,
      tabs: { ...defaultPerms.tabs },
      contrato: { ...defaultPerms.contrato },
      campos: { ...defaultPerms.campos }
    };

    // Apply role-based permissions
    const relevantRoles = userRoleAssignments
      .map(assignment => userRoles.find(r => r.id === assignment.role_id))
      .filter(Boolean);

    relevantRoles.forEach(role => {
      // Merge Tabs Permissions (OR logic: if one role allows, it's allowed)
      if (role.permissions?.empleados_detalle?.pestanas) {
        Object.keys(perms.tabs).forEach(tab => {
          if (role.permissions.empleados_detalle.pestanas[tab]) {
            perms.tabs[tab] = true;
          }
        });
      }

      // Merge Contract Permissions
      if (role.permissions?.contrato?.ver) perms.contrato.ver = true;
      if (role.permissions?.contrato?.editar) perms.contrato.editar = true;

      // Merge Field Permissions
      if (role.permissions?.campos_empleado) {
        if (role.permissions.campos_empleado.editar_sensible) perms.campos.editar_sensible = true;
        if (role.permissions.campos_empleado.editar_contacto) perms.campos.editar_contacto = true;
        if (role.permissions.campos_empleado.ver_salario) perms.campos.ver_salario = true;
        if (role.permissions.campos_empleado.ver_dni) perms.campos.ver_dni = true;
      }
    });

    return perms;
  }, [propPermissions, currentUser, userRoleAssignments, userRoles]);

  // Ensure active tab is allowed
  useEffect(() => {
    if (open && permissions?.tabs) {
      // Only check if activeTab is explicitly disallowed (false) or undefined in tabs config
      const isAllowed = permissions.tabs[activeTab];
      
      if (!isAllowed) {
        // Current tab not allowed, find first allowed
        const allowed = Object.keys(permissions.tabs).find(key => permissions.tabs[key]);
        if (allowed && allowed !== activeTab) {
          setActiveTab(allowed);
        }
      }
    }
  }, [open, permissions, activeTab]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Audit Logging
      const actionType = employee?.id ? 'update' : 'create';
      const details = employee?.id ? { changes: 'updated_record' } : { changes: 'created_record' };
      
      await base44.entities.EmployeeAuditLog.create({
        action_type: actionType,
        user_email: currentUser?.email,
        target_employee_id: employee?.id || 'new',
        target_employee_name: data.nombre,
        details: JSON.stringify(details),
        timestamp: new Date().toISOString()
      });

      if (employee?.id) {
        return base44.entities.EmployeeMasterDatabase.update(employee.id, data);
      } else {
        return base44.entities.EmployeeMasterDatabase.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Empleado guardado correctamente");
      onClose();
    },
  });

  const isBaja = formData.estado_empleado === "Baja";
  const isTurnoFijo = formData.tipo_turno === "Fijo Mañana" || formData.tipo_turno === "Fijo Tarde";

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee?.id ? `Editar Empleado - ${employee.nombre}` : 'Nueva Alta de Empleado en Base Maestra'}</DialogTitle>
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

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-semibold text-blue-900">Datos Bancarios (Nóminas)</Label>
                </div>

                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    placeholder="ES00 0000 0000 0000 0000 0000"
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
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FABRICACION">FABRICACION</SelectItem>
                      <SelectItem value="MANTENIMIENTO">MANTENIMIENTO</SelectItem>
                      <SelectItem value="ALMACEN">ALMACEN</SelectItem>
                      <SelectItem value="CALIDAD">CALIDAD</SelectItem>
                      <SelectItem value="OFICINA">OFICINA</SelectItem>
                      <SelectItem value="PLANIFICACION">PLANIFICACION</SelectItem>
                      <SelectItem value="LIMPIEZA">LIMPIEZA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Puesto</Label>
                  <Select
                    value={formData.puesto || ""}
                    onValueChange={(value) => setFormData({ ...formData, puesto: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar puesto" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.departamento === "FABRICACION" && (
                        <>
                          <SelectItem value="OPERARIA DE LINEA">OPERARIA DE LINEA</SelectItem>
                          <SelectItem value="RESPONSABLE DE LINEA">RESPONSABLE DE LINEA</SelectItem>
                          <SelectItem value="SEGUNDA DE LINEA">SEGUNDA DE LINEA</SelectItem>
                          <SelectItem value="JEFE DE TURNO">JEFE DE TURNO</SelectItem>
                          <SelectItem value="OPERARIO FABRICACION">OPERARIO FABRICACION</SelectItem>
                          <SelectItem value="RESPONSABLE FABRICACION">RESPONSABLE FABRICACION</SelectItem>
                        </>
                      )}
                      {formData.departamento === "MANTENIMIENTO" && (
                        <>
                          <SelectItem value="MECANICO">MECANICO</SelectItem>
                          <SelectItem value="MANT. DE INSTALACIONES">MANT. DE INSTALACIONES</SelectItem>
                          <SelectItem value="OPERARIO MANTENIMIENTO">OPERARIO MANTENIMIENTO</SelectItem>
                          <SelectItem value="RESP. TURNO MECANICOS">RESP. TURNO MECANICOS</SelectItem>
                          <SelectItem value="RESPONSABLE DE MANTENIMIENTO">RESPONSABLE DE MANTENIMIENTO</SelectItem>
                        </>
                      )}
                      {formData.departamento === "ALMACEN" && (
                        <>
                          <SelectItem value="CARRETILLERO">CARRETILLERO</SelectItem>
                          <SelectItem value="RESPONSABLE DE ALMACEN">RESPONSABLE DE ALMACEN</SelectItem>
                          <SelectItem value="TECNICO DE CALIDAD ALMACEN">TECNICO DE CALIDAD ALMACEN</SelectItem>
                        </>
                      )}
                      {formData.departamento === "CALIDAD" && (
                        <SelectItem value="TECNICO DE CALIDAD">TECNICO DE CALIDAD</SelectItem>
                      )}
                      {(formData.departamento === "OFICINA" || formData.departamento === "PLANIFICACION") && (
                        <>
                          <SelectItem value="AUX. ADMINISTRATIVO">AUX. ADMINISTRATIVO</SelectItem>
                          <SelectItem value="AYUDANTE DE PLANIFICACION">AYUDANTE DE PLANIFICACION</SelectItem>
                          <SelectItem value="DIR. PROJECT MANAGER/COMPRAS">DIR. PROJECT MANAGER/COMPRAS</SelectItem>
                          <SelectItem value="DIRECCION PLANIFICACION">DIRECCION PLANIFICACION</SelectItem>
                          <SelectItem value="OPERACIONES">OPERACIONES</SelectItem>
                          <SelectItem value="RESPONSABLE COMERCIAL">RESPONSABLE COMERCIAL</SelectItem>
                          <SelectItem value="RESPONSABLE COMPRAS">RESPONSABLE COMPRAS</SelectItem>
                          <SelectItem value="RESPONSABLE PACKAGING">RESPONSABLE PACKAGING</SelectItem>
                          <SelectItem value="RR.HH">RR.HH</SelectItem>
                          <SelectItem value="TECNICO DE PLANIFICACION">TECNICO DE PLANIFICACION</SelectItem>
                        </>
                      )}
                      {formData.departamento === "LIMPIEZA" && (
                        <SelectItem value="OPERARIA LIMPIEZA">OPERARIA LIMPIEZA</SelectItem>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                  <div key={num} className="space-y-2">
                    <Label>Máquina Prioridad {num}</Label>
                    <Select
                      value={formData[`maquina_${num}`] || ""}
                      onValueChange={(value) => setFormData({ ...formData, [`maquina_${num}`]: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Sin asignar</SelectItem>
                        {allMachines.map((machine) => (
                          <SelectItem key={machine.id} value={machine.id}>
                            {machine.nombre} ({machine.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
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
          </Tabs>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : (employee?.id ? "Guardar Cambios" : "Crear Empleado")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}