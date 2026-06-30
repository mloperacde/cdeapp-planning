import React, { useState, useMemo, useEffect, useRef, Suspense, lazy } from "react";
import { base44 } from "@/api/base44Client";
import { getMachineAlias } from "@/utils/machineAlias";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { differenceInDays, differenceInMonths, differenceInYears, format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";

const NACIONALIDADES = [
  "Española","Alemana","Francesa","Italiana","Portuguesa","Rumana","Marroquí","Ecuatoriana",
  "Colombiana","Boliviana","Peruana","Venezolana","Dominicana","Argentina","Brasileña",
  "Chilena","Mexicana","Hondureña","Salvadoreña","Guatemalteca","Paraguaya","Uruguaya",
  "Cubana","Estadounidense","China","Paquistaní","Senegalesa","Nigeriana","Ghanesa",
  "Ucraniana","Polaca","Búlgara","Lituana","Letona","Eslovaca","Húngara","Checa",
  "Belga","Neerlandesa","Suiza","Austriaca","Inglesa","Irlandesa","Danesa","Sueca","Finlandesa",
  "Noruega","Griega","Turca","Siria","Argelina","Tunecina","Filipina","Bangladesí","India",
];

function NacionalidadCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Si el valor actual no está en la lista predefinida, arrancar en modo custom
  useEffect(() => {
    if (value && !NACIONALIDADES.includes(value)) setCustomMode(true);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = NACIONALIDADES.filter(n =>
    n.toLowerCase().includes(search.toLowerCase())
  );

  if (customMode) {
    return (
      <div className="flex gap-2">
        <Input
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder="Escribe la nacionalidad..."
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setCustomMode(false); onChange(""); }}
          title="Volver a la lista"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(""); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || "Seleccionar o escribir..."}
        </span>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <Input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nacionalidad..."
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(n => (
              <button
                key={n}
                type="button"
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground ${value === n ? "bg-accent font-medium" : ""}`}
                onClick={() => { onChange(n); setOpen(false); setSearch(""); }}
              >
                {n}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No encontrada</p>
            )}
          </div>
          <div className="p-2 border-t">
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm text-blue-600 hover:bg-accent rounded"
              onClick={() => { setCustomMode(true); onChange(search); setOpen(false); }}
            >
              ✏️ Escribir manualmente{search ? `: "${search}"` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const LockerAssignmentPanel = lazy(() => import("./LockerAssignmentPanel"));
const AbsenteeismCard = lazy(() => import("./AbsenteeismCard"));

export default function EmployeeForm({ employee, machines, onClose }) {
  // Define initial state for new employees, including all possible machine fields
  const initialNewEmployeeFormData = {
    codigo_empleado: "",
    nombre: "",
    estado_empleado: "Alta", // New field
    fecha_baja: "", // New field
    motivo_baja: "", // New field
    fecha_nacimiento: "",
    dni: "",
    nuss: "",
    sexo: "",
    nacionalidad: "",
    direccion: "",
    formacion: "",
    email: "",
    telefono_movil: "",
    contacto_emergencia_nombre: "",
    contacto_emergencia_telefono: "",
    departamento: "", // Crucial for conditional logic
    puesto: "",
    categoria: "",
    tipo_jornada: "Jornada Completa",
    num_horas_jornada: 8,
    tipo_turno: "Rotativo",
    equipo: "",
    disponibilidad: "Disponible",
    horario_manana_inicio: "07:00",
    horario_manana_fin: "15:00",
    horario_tarde_inicio: "14:00",
    horario_tarde_fin: "22:00",
    turno_partido_entrada1: "",
    turno_partido_salida1: "",
    turno_partido_entrada2: "",
    turno_partido_salida2: "",
    pin: "",
    numero_tarjeta: "",
    fecha_alta: "",
    tipo_contrato: "",
    empresa_ett: "", // Added ETT field
    codigo_contrato: "",
    fecha_fin_contrato: "",
    salario_anual: 0,
    evaluacion_responsable: "",
    propuesta_cambio_categoria: "",
    propuesta_cambio_quien: "",
    objetivos: {
      periodo: "",
      importe_incentivo: 0,
      objetivo_1: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_2: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_3: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_4: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_5: { descripcion: "", peso: 0, resultado: 0 },
      objetivo_6: { descripcion: "", peso: 0, resultado: 0 },
    },
  };

  // Dynamically add manufacturing machine fields
  for (let i = 1; i <= 10; i++) {
    initialNewEmployeeFormData[`maquina_${i}`] = null;
  }
  // Dynamically add maintenance machine fields and their priorities
  for (let i = 1; i <= 20; i++) {
    initialNewEmployeeFormData[`maquina_mantenimiento_${i}`] = null;
    initialNewEmployeeFormData[`prioridad_mantenimiento_${i}`] = null;
  }

  const [formData, setFormData] = useState(initialNewEmployeeFormData);
  const [activeTab, setActiveTab] = useState("datos");

  const queryClient = useQueryClient();

  const { data: employeeMachineSkills = [] } = useQuery({
    queryKey: ['employeeMachineSkills'],
    queryFn: () => base44.entities.EmployeeMachineSkill.list(undefined, 1000),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (employee) {
      const loadedData = { ...employee };

      if (employee.id) {
        const skills = employeeMachineSkills.filter(s => s.employee_id === employee.id);
        skills.forEach(skill => {
          if (skill.orden_preferencia >= 1 && skill.orden_preferencia <= 10) {
            loadedData[`maquina_${skill.orden_preferencia}`] = skill.machine_id;
          }
        });
      }

      setFormData(loadedData);
    } else {
      setFormData(initialNewEmployeeFormData);
      
      // Auto-generate employee code for new entries
      const generateCode = async () => {
        try {
            // Get all employees to find max code
            // This is a client-side heuristic. For production, a backend function is safer for concurrency.
            // But user asked for this logic "we can assume that function".
            const allEmps = await base44.entities.EmployeeMasterDatabase.list(undefined, 2000);
            
            let maxCode = 0;
            allEmps.forEach(e => {
                const code = parseInt(e.codigo_empleado);
                if (!isNaN(code) && code > maxCode) {
                    maxCode = code;
                }
            });
            
            const nextCode = String(maxCode + 1);
            setFormData(prev => ({ ...prev, codigo_empleado: nextCode }));
        } catch (err) {
            console.error("Error auto-generating employee code:", err);
        }
      };
      generateCode();
    }
  }, [employee, employeeMachineSkills]);

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    staleTime: 15 * 60 * 1000,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list('name', 200),
    staleTime: 15 * 60 * 1000,
  });

  const { data: allMachines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      return data.map(m => ({
        id: m.id,
        nombre: m.nombre,
        codigo_maquina: m.codigo_maquina,
        ubicacion: m.ubicacion,
        room_name: m.room_name,
        orden: m.orden_visualizacion || 999
      })).sort((a, b) => a.orden - b.orden);
    },
    staleTime: 15 * 60 * 1000,
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-fecha_inicio', 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: masterMachines = [] } = useQuery({
    queryKey: ['machinesMaster'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      return (Array.isArray(data) ? data : []).sort(
        (a, b) => (a.orden_visualizacion ?? 999) - (b.orden_visualizacion ?? 999)
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const edad = useMemo(() => {
    if (!formData.fecha_nacimiento) return null;
    
    const birthDate = new Date(formData.fecha_nacimiento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }, [formData.fecha_nacimiento]);

  const antiguedad = useMemo(() => {
    if (!formData.fecha_alta) return null;
    
    const fechaAlta = new Date(formData.fecha_alta);
    const hoy = new Date();
    
    const years = differenceInYears(hoy, fechaAlta);
    const months = differenceInMonths(hoy, fechaAlta) % 12;
    const days = differenceInDays(hoy, new Date(hoy.getFullYear(), hoy.getMonth() - months, fechaAlta.getDate()));
    
    let result = [];
    if (years > 0) result.push(`${years} año${years !== 1 ? 's' : ''}`);
    if (months > 0) result.push(`${months} mes${months !== 1 ? 'es' : ''}`);
    if (days > 0 && years === 0) result.push(`${days} día${days !== 1 ? 's' : ''}`);
    
    return result.length > 0 ? result.join(', ') : '0 días';
  }, [formData.fecha_alta]);

  const handleTipoJornadaChange = (value) => {
    const newData = { ...formData, tipo_jornada: value };
    
    if (value === "Jornada Completa") {
      newData.num_horas_jornada = 8;
      newData.horario_manana_inicio = "07:00";
      newData.horario_manana_fin = "15:00";
      newData.horario_tarde_inicio = "14:00";
      newData.horario_tarde_fin = "22:00";
    } else if (value === "Jornada Parcial") {
      if (formData.tipo_turno === "Rotativo") {
        newData.num_horas_jornada = 7.5;
        newData.horario_manana_inicio = "07:00";
        newData.horario_manana_fin = "15:00";
        newData.horario_tarde_inicio = "15:00";
        newData.horario_tarde_fin = "22:00";
      } else if (formData.tipo_turno === "Fijo Tarde") {
        newData.num_horas_jornada = 7;
        newData.horario_tarde_inicio = "15:00";
        newData.horario_tarde_fin = "22:00";
      }
    }
    
    setFormData(newData);
  };

  const handleTipoTurnoChange = (value) => {
    const newData = { ...formData, tipo_turno: value };
    
    if (formData.tipo_jornada === "Jornada Parcial") {
      if (value === "Rotativo") {
        newData.num_horas_jornada = 7.5;
        newData.horario_manana_inicio = "07:00";
        newData.horario_manana_fin = "15:00";
        newData.horario_tarde_inicio = "15:00";
        newData.horario_tarde_fin = "22:00";
      } else if (value === "Fijo Tarde") {
        newData.num_horas_jornada = 7;
        newData.horario_tarde_inicio = "15:00";
        newData.horario_tarde_fin = "22:00";
      } else if (value === "Fijo Mañana") {
        newData.horario_manana_inicio = "07:00";
        newData.horario_manana_fin = "15:00";
      }
    }
    
    setFormData(newData);
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Si es turno fijo, no debe tener equipo asignado
      const finalData = { ...data };

      // Enforce Uppercase for critical fields
      if (finalData.nombre) finalData.nombre = finalData.nombre.toUpperCase();
      if (finalData.departamento) finalData.departamento = finalData.departamento.toUpperCase();
      // Ensure department_id is preserved on save
      if (!finalData.department_id && finalData.departamento) {
        // Try to auto-match by name
        // (departments not in scope here, but field will be set via Select)
      }
      if (finalData.puesto) finalData.puesto = finalData.puesto.toUpperCase();

      if (data.tipo_turno === "Fijo Mañana" || data.tipo_turno === "Fijo Tarde") {
        finalData.equipo = "";
        finalData.team_id = "";
        finalData.team_key = "";
      }
      
      let savedEmployee;
      if (employee?.id) {
        savedEmployee = await base44.entities.EmployeeMasterDatabase.update(employee.id, finalData);
      } else {
        savedEmployee = await base44.entities.EmployeeMasterDatabase.create(finalData);
      }

      // Sincronizar máquinas en EmployeeMachineSkill
      const employeeId = savedEmployee?.id || employee?.id;
      if (employeeId) {
        const currentSkills = employeeMachineSkills.filter(s => s.employee_id === employeeId);
        
        for (let i = 1; i <= 10; i++) {
          const machineId = data[`maquina_${i}`];
          const existingSkill = currentSkills.find(s => s.orden_preferencia === i);
          
          if (machineId && !existingSkill) {
            // Crear nuevo registro
            await base44.entities.EmployeeMachineSkill.create({
              employee_id: employeeId,
              machine_id: machineId,
              orden_preferencia: i,
              nivel_competencia: 'Intermedio'
            });
          } else if (machineId && existingSkill && existingSkill.machine_id !== machineId) {
            // Actualizar existente
            await base44.entities.EmployeeMachineSkill.update(existingSkill.id, {
              machine_id: machineId
            });
          } else if (!machineId && existingSkill) {
            // Eliminar registro
            await base44.entities.EmployeeMachineSkill.delete(existingSkill.id);
          }
        }
      }
      
      return savedEmployee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['employeeMachineSkills'] });
      toast.success("Empleado guardado correctamente");
      onClose();
    },
    onError: (error) => {
      toast.error(`Error al guardar: ${error.message}`);
    }
  });

  const [validationErrors, setValidationErrors] = useState([]);

  const isAbsent = formData.disponibilidad === "Ausente";
  const hasAbsenceData = formData.ausencia_inicio && formData.ausencia_fin;
  const isTurnoFijo = formData.tipo_turno === "Fijo Mañana" || formData.tipo_turno === "Fijo Tarde";
  const isMaintenanceDepartment = formData.departamento === "MANTENIMIENTO";
  const isETT = formData.tipo_contrato?.toUpperCase().includes("ETT");
  const isBaja = formData.estado_empleado === "Baja";

  const validateRequired = () => {
    if (employee) return []; // Solo validar en creación

    const errors = [];
    if (!formData.nombre?.trim()) errors.push("Nombre completo");
    if (!formData.codigo_empleado?.trim()) errors.push("Código de empleado");
    if (!formData.dni?.trim()) errors.push("DNI/NIE");
    if (!formData.telefono_movil?.trim()) errors.push("Teléfono móvil");
    if (!formData.contacto_emergencia_nombre?.trim()) errors.push("Contacto de emergencia");
    if (!formData.contacto_emergencia_telefono?.trim()) errors.push("Teléfono de emergencia");
    if (!formData.department_id && !formData.departamento?.trim()) errors.push("Departamento");
    if (!formData.puesto?.trim()) errors.push("Puesto");
    if (!isTurnoFijo && !formData.team_id && !formData.equipo?.trim()) errors.push("Equipo");
    if (!formData.pin?.trim()) errors.push("PIN");
    if (!formData.numero_tarjeta?.trim()) errors.push("Número de tarjeta Cuco360");
    if (!formData.tipo_jornada?.trim()) errors.push("Tipo de jornada");
    if (!formData.num_horas_jornada) errors.push("Horas de jornada");
    if (!formData.tipo_turno?.trim()) errors.push("Tipo de turno");
    if (!formData.fecha_alta?.trim()) errors.push("Fecha de alta (pestaña Contrato)");
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateRequired();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    saveMutation.mutate(formData);
  };

  const machineFields = Array.from({ length: 10 }, (_, i) => i + 1);
  const maintenanceMachineFields = Array.from({ length: 20 }, (_, i) => i + 1);

  const updateObjective = (objNum, field, value) => {
    setFormData({
      ...formData,
      objetivos: {
        ...formData.objetivos,
        [`objetivo_${objNum}`]: {
          ...formData.objetivos[`objetivo_${objNum}`],
          [field]: value
        }
      }
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="datos">Datos</TabsTrigger>
              <TabsTrigger value="schedule">Horarios</TabsTrigger>
              <TabsTrigger value="taquilla">Taquilla</TabsTrigger>
              <TabsTrigger value="machines">
                Máquinas {isMaintenanceDepartment && "(Mant.)"}
              </TabsTrigger>
              <TabsTrigger value="availability">Disponibilidad</TabsTrigger>
              <TabsTrigger value="contract">Contrato</TabsTrigger>
              <TabsTrigger value="absentismo">Absentismo</TabsTrigger>
              <TabsTrigger value="rrhh">RRHH</TabsTrigger>
            </TabsList>

            <TabsContent value="datos" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo_empleado">Código de Empleado {!employee && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="codigo_empleado"
                    value={formData.codigo_empleado || ""}
                    onChange={(e) => setFormData({ ...formData, codigo_empleado: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre Completo {!employee && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                {/* New Estado del Empleado and related fields */}
                <div className="space-y-2">
                  <Label htmlFor="estado_empleado">Estado del Empleado</Label>
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
                      <Label htmlFor="fecha_baja">Fecha de Baja</Label>
                      <Input
                        id="fecha_baja"
                        type="date"
                        value={formData.fecha_baja || ""}
                        onChange={(e) => setFormData({ ...formData, fecha_baja: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="motivo_baja">Motivo de Baja</Label>
                      <Textarea
                        id="motivo_baja"
                        value={formData.motivo_baja || ""}
                        onChange={(e) => setFormData({ ...formData, motivo_baja: e.target.value })}
                        rows={2}
                        placeholder="Especifica el motivo de la baja..."
                      />
                    </div>
                  </>
                )}
                {/* End New fields */}

                <div className="space-y-2">
                  <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                  <Input
                    id="fecha_nacimiento"
                    type="date"
                    value={formData.fecha_nacimiento || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Edad</Label>
                  <Input 
                    value={edad !== null ? `${edad} años` : "Sin fecha de nacimiento"} 
                    disabled 
                    className="bg-slate-50" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dni">DNI/NIE {!employee && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="dni"
                    value={formData.dni || ""}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nuss">NUSS (Nº Seguridad Social)</Label>
                  <Input
                    id="nuss"
                    value={formData.nuss || ""}
                    onChange={(e) => setFormData({ ...formData, nuss: e.target.value })}
                    placeholder="XX-XXXXXXXXXX-XX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo</Label>
                  <Select
                    value={formData.sexo || ""}
                    onValueChange={(value) => setFormData({ ...formData, sexo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
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
                  <NacionalidadCombobox
                    value={formData.nacionalidad || ""}
                    onChange={(val) => setFormData({ ...formData, nacionalidad: val })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion || ""}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Calle, número, piso, ciudad, código postal"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="formacion">Formación</Label>
                  <Input
                    id="formacion"
                    value={formData.formacion || ""}
                    onChange={(e) => setFormData({ ...formData, formacion: e.target.value })}
                    placeholder="Estudios, titulaciones, certificados"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono_movil">Teléfono Móvil {!employee && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="telefono_movil"
                    value={formData.telefono_movil || ""}
                    onChange={(e) => setFormData({ ...formData, telefono_movil: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contacto_emergencia_nombre">Contacto de Emergencia {!employee && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="contacto_emergencia_nombre"
                    placeholder="Nombre"
                    value={formData.contacto_emergencia_nombre || ""}
                    onChange={(e) => setFormData({ ...formData, contacto_emergencia_nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contacto_emergencia_telefono">Teléfono de Emergencia {!employee && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="contacto_emergencia_telefono"
                    placeholder="Teléfono"
                    value={formData.contacto_emergencia_telefono || ""}
                    onChange={(e) => setFormData({ ...formData, contacto_emergencia_telefono: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pin">PIN {!employee && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="pin"
                    value={formData.pin || ""}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="PIN del empleado"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_tarjeta">Número Tarjeta Cuco360 {!employee && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="numero_tarjeta"
                    value={formData.numero_tarjeta || ""}
                    onChange={(e) => setFormData({ ...formData, numero_tarjeta: e.target.value })}
                    placeholder="Número de tarjeta"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento {!employee && <span className="text-red-500">*</span>}</Label>
                  <Select
                    value={formData.department_id || ""}
                    onValueChange={(value) => {
                      const dept = departments.find(d => d.id === value);
                      setFormData({
                        ...formData,
                        department_id: value,
                        departamento: dept ? dept.name.toUpperCase() : formData.departamento
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.departamento && !formData.department_id && (
                    <p className="text-xs text-amber-600">Valor actual: {formData.departamento} (sin vincular)</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="puesto">Puesto {!employee && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="puesto"
                    value={formData.puesto || ""}
                    onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria || ""}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipo">Equipo {!employee && !isTurnoFijo && <span className="text-red-500">*</span>} {isTurnoFijo && <span className="text-slate-400 text-xs">(No aplica para turnos fijos)</span>}</Label>
                  <Select
                    value={formData.team_id || ""}
                    onValueChange={(value) => {
                      const team = teams.find(t => t.id === value);
                      setFormData({
                        ...formData,
                        team_id: value,
                        team_key: team?.team_key || "",
                        equipo: team?.team_name || "",
                      });
                    }}
                    disabled={isTurnoFijo}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isTurnoFijo ? "Turnos fijos sin equipo" : "Seleccionar equipo"} />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.team_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.equipo && !formData.team_id && (
                    <p className="text-xs text-amber-600">Valor actual: {formData.equipo} (sin vincular)</p>
                  )}
                  {isTurnoFijo && (
                    <p className="text-xs text-blue-600">
                      Los empleados con turno fijo están disponibles para cualquier equipo en su horario
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="taquilla" className="space-y-4 mt-4">
              {employee?.id ? (
                <Suspense fallback={<div className="p-4 text-center">Cargando panel de taquilla...</div>}>
                  <LockerAssignmentPanel employee={employee} />
                </Suspense>
              ) : (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <p className="text-sm text-blue-800">
                    La asignación de taquilla estará disponible después de crear el empleado
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_jornada">Tipo de Jornada *</Label>
                  <Select
                    value={formData.tipo_jornada}
                    onValueChange={handleTipoJornadaChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Jornada Completa">Jornada Completa</SelectItem>
                      <SelectItem value="Jornada Parcial">Jornada Parcial</SelectItem>
                      <SelectItem value="Jornada Reducida">Jornada Reducida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="num_horas">Nº Horas Jornada *</Label>
                  <Input
                    id="num_horas"
                    type="number"
                    step="0.5"
                    min="1"
                    max="40"
                    value={formData.num_horas_jornada || 0}
                    onChange={(e) => setFormData({ ...formData, num_horas_jornada: parseFloat(e.target.value) })}
                    disabled={formData.tipo_jornada === "Jornada Completa"}
                    className={formData.tipo_jornada === "Jornada Completa" ? "bg-slate-100" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_turno">Tipo de Turno *</Label>
                  <Select
                    value={formData.tipo_turno}
                    onValueChange={handleTipoTurnoChange}
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
              </div>

              {/* Jornada Reducida + Fijo Mañana */}
              {formData.tipo_jornada === "Jornada Reducida" && formData.tipo_turno === "Fijo Mañana" && (
                <div className="p-4 border-2 border-amber-200 rounded-lg bg-amber-50 space-y-4">
                  <h4 className="font-semibold text-amber-900">Configuración Turno Fijo Mañana - Jornada Reducida</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hora de Entrada</Label>
                      <Input
                        type="time"
                        value={formData.horario_manana_inicio || ""}
                        onChange={(e) => setFormData({ ...formData, horario_manana_inicio: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora de Salida</Label>
                      <Input
                        type="time"
                        value={formData.horario_manana_fin || ""}
                        onChange={(e) => setFormData({ ...formData, horario_manana_fin: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Jornada Reducida + Fijo Tarde */}
              {formData.tipo_jornada === "Jornada Reducida" && formData.tipo_turno === "Fijo Tarde" && (
                <div className="p-4 border-2 border-indigo-200 rounded-lg bg-indigo-50 space-y-4">
                  <h4 className="font-semibold text-indigo-900">Configuración Turno Fijo Tarde - Jornada Reducida</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hora de Entrada</Label>
                      <Input
                        type="time"
                        value={formData.horario_tarde_inicio || ""}
                        onChange={(e) => setFormData({ ...formData, horario_tarde_inicio: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora de Salida</Label>
                      <Input
                        type="time"
                        value={formData.horario_tarde_fin || ""}
                        onChange={(e) => setFormData({ ...formData, horario_tarde_fin: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Configuración de horarios para Jornada Reducida con Rotativo */}
              {formData.tipo_jornada === "Jornada Reducida" && formData.tipo_turno === "Rotativo" && (
                <div className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50 space-y-4">
                  <h4 className="font-semibold text-orange-900">Configuración de Horario Especial - Jornada Reducida</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Horario Inicio Mañana</Label>
                      <Input
                        type="time"
                        value={formData.horario_manana_inicio || ""}
                        onChange={(e) => setFormData({ ...formData, horario_manana_inicio: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Horario Fin Mañana</Label>
                      <Input
                        type="time"
                        value={formData.horario_manana_fin || ""}
                        onChange={(e) => setFormData({ ...formData, horario_manana_fin: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Horario Inicio Tarde</Label>
                      <Input
                        type="time"
                        value={formData.horario_tarde_inicio || ""}
                        onChange={(e) => setFormData({ ...formData, horario_tarde_inicio: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Horario Fin Tarde</Label>
                      <Input
                        type="time"
                        value={formData.horario_tarde_fin || ""}
                        onChange={(e) => setFormData({ ...formData, horario_tarde_fin: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Jornada Parcial con horarios específicos */}
              {formData.tipo_jornada === "Jornada Parcial" && (
                <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50 space-y-4">
                  <h4 className="font-semibold text-blue-900">Horarios Específicos (Opcional)</h4>
                  <p className="text-sm text-blue-700">
                    Si no se configura, se usarán horarios estándar: Mañana 7:00-15:00, Tarde 15:00-22:00
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Horario Inicio Mañana</Label>
                      <Input
                        type="time"
                        value={formData.horario_manana_inicio || ""}
                        onChange={(e) => setFormData({ ...formData, horario_manana_inicio: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Horario Fin Mañana</Label>
                      <Input
                        type="time"
                        value={formData.horario_manana_fin || ""}
                        onChange={(e) => setFormData({ ...formData, horario_manana_fin: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Horario Inicio Tarde</Label>
                      <Input
                        type="time"
                        value={formData.horario_tarde_inicio || ""}
                        onChange={(e) => setFormData({ ...formData, horario_tarde_inicio: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Horario Fin Tarde</Label>
                      <Input
                        type="time"
                        value={formData.horario_tarde_fin || ""}
                        onChange={(e) => setFormData({ ...formData, horario_tarde_fin: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.tipo_turno === "Turno Partido" && (
                <div className="md:col-span-2 space-y-4 p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                  <h4 className="font-semibold text-purple-900">Configuración de Turno Partido</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="entrada1">Horario Entrada 1</Label>
                      <Input
                        id="entrada1"
                        type="time"
                        value={formData.turno_partido_entrada1 || ""}
                        onChange={(e) => setFormData({ ...formData, turno_partido_entrada1: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="salida1">Horario Salida 1</Label>
                      <Input
                        id="salida1"
                        type="time"
                        value={formData.turno_partido_salida1 || ""}
                        onChange={(e) => setFormData({ ...formData, turno_partido_salida1: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="entrada2">Horario Entrada 2</Label>
                      <Input
                        id="entrada2"
                        type="time"
                        value={formData.turno_partido_entrada2 || ""}
                        onChange={(e) => setFormData({ ...formData, turno_partido_entrada2: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="salida2">Horario Salida 2</Label>
                      <Input
                        id="salida2"
                        type="time"
                        value={formData.turno_partido_salida2 || ""}
                        onChange={(e) => setFormData({ ...formData, turno_partido_salida2: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Información de Horarios Estándar */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h5 className="font-semibold text-slate-900 mb-2">Horarios Estándar por Jornada</h5>
                <div className="text-sm text-slate-700 space-y-1">
                  <p><strong>Jornada Completa (8h):</strong> Mañana 7:00-15:00, Tarde 14:00-22:00</p>
                  <p><strong>Jornada Parcial Rotativo (7.5h):</strong> Mañana 7:00-15:00, Tarde 15:00-22:00</p>
                  <p><strong>Jornada Parcial Fijo Tarde (7h):</strong> Tarde 15:00-22:00</p>
                  <p><strong>Jornada Reducida y Fijo Mañana:</strong> Horario configurable manualmente</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="machines" className="space-y-4 mt-4">
              {isMaintenanceDepartment ? (
                <>
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-orange-900 mb-2">
                      Configuración de Máquinas - Departamento de Mantenimiento
                    </h4>
                    <p className="text-sm text-orange-800">
                      Configure hasta 20 máquinas con sus respectivas prioridades (1-10, siendo 10 la máxima prioridad)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {maintenanceMachineFields.map((num) => (
                      <div key={num} className="grid grid-cols-3 gap-3 items-end p-3 bg-slate-50 rounded-lg border">
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor={`maquina_mant_${num}`}>Máquina {num}</Label>
                          <Select
                            value={formData[`maquina_mantenimiento_${num}`] || ""}
                            onValueChange={(value) => setFormData({ 
                              ...formData, 
                              [`maquina_mantenimiento_${num}`]: value 
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sin asignar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>Sin asignar</SelectItem>
                              {allMachines.map((machine) => (
                                 <SelectItem key={machine.id} value={machine.id}>
                                   {getMachineAlias(machine)}
                                 </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`prioridad_mant_${num}`}>Prioridad</Label>
                          <Input
                            id={`prioridad_mant_${num}`}
                            type="number"
                            min="1"
                            max="10"
                            placeholder="1-10"
                            value={formData[`prioridad_mantenimiento_${num}`] || ""}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              [`prioridad_mantenimiento_${num}`]: e.target.value ? parseInt(e.target.value) : null 
                            })}
                            disabled={!formData[`maquina_mantenimiento_${num}`]}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Configuración de Máquinas - Departamento de Fabricación
                    </h4>
                    <p className="text-sm text-blue-800">
                      Configure hasta 10 máquinas para empleados de fabricación
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {machineFields.map((num) => (
                      <div key={num} className="space-y-2">
                        <Label htmlFor={`maquina_${num}`}>Máquina {num}</Label>
                        <Select
                          value={formData[`maquina_${num}`] || ""}
                          onValueChange={(value) => setFormData({ ...formData, [`maquina_${num}`]: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                          <SelectContent>
                           <SelectItem value={null}>Sin asignar</SelectItem>
                           {masterMachines.map((machine) => (
                             <SelectItem key={machine.id} value={machine.id}>
                               {getMachineAlias(machine)}
                             </SelectItem>
                           ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="availability" className="space-y-4 mt-4">
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 mb-1">
                      Gestión de Ausencias Centralizada
                    </p>
                    <p className="text-sm text-amber-800">
                      Para gestionar ausencias de forma centralizada, utiliza la página "Gestión de Ausencias" 
                      que sincronizará automáticamente los datos con esta pestaña.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Estado de Disponibilidad</Label>
                  <div className="p-4 border-2 rounded-lg bg-slate-50">
                    {isAbsent ? (
                      <div className="space-y-3">
                        <Badge variant="destructive" className="text-base px-3 py-1">
                          Ausente
                        </Badge>
                        
                        {hasAbsenceData && (
                          <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="font-semibold text-slate-700">Fecha Inicio:</span>
                                <p className="text-slate-600">
                                  {format(new Date(formData.ausencia_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                                </p>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-700">Fecha Fin:</span>
                                <p className="text-slate-600">
                                  {format(new Date(formData.ausencia_fin), "dd/MM/yyyy HH:mm", { locale: es })}
                                </p>
                              </div>
                            </div>
                            {formData.ausencia_motivo && (
                              <div>
                                <span className="font-semibold text-slate-700">Motivo:</span>
                                <p className="text-slate-600">{formData.ausencia_motivo}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {!hasAbsenceData && (
                           <p className="text-sm text-slate-600 mt-2">
                              No hay datos de ausencia específicos registrados aquí. Gestione las ausencias desde la página de gestión de ausencias.
                           </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Badge className="bg-green-100 text-green-800 text-base px-3 py-1">
                          Disponible
                        </Badge>
                        <p className="text-sm text-slate-600 mt-2">
                          El empleado está disponible para trabajar
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contract" className="space-y-4 mt-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                <h4 className="font-semibold text-slate-900 mb-2">Gestión de Contrato</h4>
                <p className="text-sm text-slate-600">
                  Configure el tipo de contrato y vigencia. Los contratos indefinidos no aparecerán en la lista de temporales.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_contrato">Tipo de Contrato</Label>
                  <Select
                    value={formData.tipo_contrato || ""}
                    onValueChange={(value) => setFormData({ ...formData, tipo_contrato: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indefinido">Indefinido</SelectItem>
                      <SelectItem value="Temporal">Temporal</SelectItem>
                      <SelectItem value="ETT">ETT</SelectItem>
                      <SelectItem value="Obra y Servicio">Obra y Servicio</SelectItem>
                      <SelectItem value="Interinidad">Interinidad</SelectItem>
                      <SelectItem value="Prácticas">Prácticas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.tipo_contrato === "Indefinido" && (
                   <div className="col-span-2 bg-blue-50 text-blue-800 p-3 rounded-md text-sm flex items-center gap-2 border border-blue-200">
                     <AlertCircle className="w-4 h-4" />
                     Al guardar como Indefinido, este empleado dejará de aparecer en la lista de ETT/Temporales.
                   </div>
                )}

                {(formData.tipo_contrato === "ETT" || formData.tipo_contrato?.includes("ETT")) && (
                  <div className="space-y-2">
                    <Label htmlFor="empresa_ett">Empresa ETT</Label>
                    <Input
                      id="empresa_ett"
                      value={formData.empresa_ett || ""}
                      onChange={(e) => setFormData({ ...formData, empresa_ett: e.target.value })}
                      placeholder="Ej: Adecco, Randstad..."
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fecha_alta">Fecha Inicio / Alta {!employee && <span className="text-red-500">*</span>}</Label>
                  <Input
                    id="fecha_alta"
                    type="date"
                    value={formData.fecha_alta || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_alta: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_fin_contrato">Fecha Fin Contrato</Label>
                  <Input
                    id="fecha_fin_contrato"
                    type="date"
                    value={formData.fecha_fin_contrato || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_fin_contrato: e.target.value })}
                  />
                </div>

                 <div className="space-y-2">
                  <Label htmlFor="codigo_contrato">Código de Contrato</Label>
                  <Input
                    id="codigo_contrato"
                    value={formData.codigo_contrato || ""}
                    onChange={(e) => setFormData({ ...formData, codigo_contrato: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="absentismo" className="space-y-4">
              {employee?.id ? (
                <Suspense fallback={<div className="p-4 text-center">Cargando datos de absentismo...</div>}>
                  <AbsenteeismCard employee={employee} />
                </Suspense>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-slate-500">Guarda el empleado primero para ver estadísticas de absentismo</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="rrhh" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Antigüedad</Label>
                  <Input value={antiguedad || "Sin fecha de alta"} disabled className="bg-slate-50" />
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Input value={formData.categoria || ""} disabled className="bg-slate-50" />
                  <p className="text-xs text-slate-500">Desde pestaña Datos</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salario_anual">Salario Anual (€)</Label>
                  <Input
                    id="salario_anual"
                    type="number"
                    value={formData.salario_anual || 0}
                    onChange={(e) => setFormData({ ...formData, salario_anual: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Jornada</Label>
                  <Input value={formData.tipo_jornada || ""} disabled className="bg-slate-50" />
                  <p className="text-xs text-slate-500">Desde pestaña Horarios</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="evaluacion_responsable">Evaluación de Responsable</Label>
                  <Textarea
                    id="evaluacion_responsable"
                    value={formData.evaluacion_responsable || ""}
                    onChange={(e) => setFormData({ ...formData, evaluacion_responsable: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propuesta_cambio_categoria">Propuesta Cambio Categoría</Label>
                  <Select
                    value={formData.propuesta_cambio_categoria || ""}
                    onValueChange={(value) => setFormData({ ...formData, propuesta_cambio_categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Categoría 1</SelectItem>
                      <SelectItem value="2">Categoría 2</SelectItem>
                      <SelectItem value="3">Categoría 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propuesta_cambio_quien">Propuesto Por</Label>
                  <Input
                    id="propuesta_cambio_quien"
                    placeholder="Nombre de quien propone"
                    value={formData.propuesta_cambio_quien || ""}
                    onChange={(e) => setFormData({ ...formData, propuesta_cambio_quien: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-lg mb-4">Sistema de Objetivos</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="periodo">Período de Objetivos</Label>
                    <Select
                      value={formData.objetivos?.periodo || ""}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        objetivos: { ...formData.objetivos, periodo: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mensual">Mensual</SelectItem>
                        <SelectItem value="Bimensual">Bimensual</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Cuatrimestral">Cuatrimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="importe_incentivo">Importe Incentivo (€)</Label>
                    <Input
                      id="importe_incentivo"
                      type="number"
                      value={formData.objetivos?.importe_incentivo || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        objetivos: { ...formData.objetivos, importe_incentivo: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <div key={num} className="border rounded-lg p-4 bg-slate-50">
                      <h5 className="font-semibold mb-3 text-slate-700">Objetivo {num}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2 md:col-span-3">
                          <Label>Descripción</Label>
                          <Input
                            placeholder="Descripción del objetivo"
                            value={formData.objetivos?.[`objetivo_${num}`]?.descripcion || ""}
                            onChange={(e) => updateObjective(num, 'descripcion', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Peso (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.objetivos?.[`objetivo_${num}`]?.peso || 0}
                            onChange={(e) => updateObjective(num, 'peso', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Resultado (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.objetivos?.[`objetivo_${num}`]?.resultado || 0}
                            onChange={(e) => updateObjective(num, 'resultado', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {validationErrors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800 mb-1">Campos obligatorios incompletos:</p>
                  <ul className="text-sm text-red-700 list-disc list-inside space-y-0.5">
                    {validationErrors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 mt-2">Los campos marcados con <span className="font-bold">*</span> son obligatorios para crear un nuevo empleado. Los campos de horarios y equipo se encuentran en las pestañas "Horarios" y "Datos".</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}