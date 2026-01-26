import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, AlertTriangle, Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import EmergencyTeamMemberForm from "./EmergencyTeamMemberForm";

const rolesEmergencia = [
  {
    rol: "Jefe de Emergencias",
    descripcion: "Coordina todas las actuaciones en caso de emergencia",
    requerido: 1,
    icon: Shield,
    color: "red"
  },
  {
    rol: "Jefe de Intervención",
    descripcion: "Dirige las operaciones de intervención directa",
    requerido: 1,
    icon: AlertTriangle,
    color: "orange"
  },
  {
    rol: "Equipo Primera Intervención (EPI)",
    descripcion: "Primeros en actuar ante conatos de incendio",
    requerido: 3,
    icon: Users,
    color: "blue"
  },
  {
    rol: "Equipo Segunda Intervención (ESI)",
    descripcion: "Actúa cuando el EPI no puede controlar la situación",
    requerido: 3,
    icon: Users,
    color: "purple"
  },
  {
    rol: "Equipo Primeros Auxilios (EPA)",
    descripcion: "Atiende a heridos y lesionados",
    requerido: 2,
    icon: Users,
    color: "green"
  },
  {
    rol: "Equipo Alarma y Evacuación (EAE)",
    descripcion: "Gestiona la alarma y coordina la evacuación",
    requerido: 3,
    icon: Users,
    color: "yellow"
  }
];

export default function EmergencyTeamManager({ employees = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const queryClient = useQueryClient();

  const { data: emergencyMembers = [], error, isError, refetch } = useQuery({
    queryKey: ['emergencyTeamMembers'],
    queryFn: async () => {
      console.log("Fetching EmergencyTeamMembers (QueryFn)...");
      try {
        const data = await base44.entities.EmergencyTeamMember.list();
        console.log("EmergencyTeamMembers fetched RAW:", data);
        
        // Handle various response structures
        let rawArray = [];
        if (Array.isArray(data)) {
          rawArray = data;
        } else if (data && Array.isArray(data.data)) {
          rawArray = data.data;
        } else if (data && Array.isArray(data.items)) {
          rawArray = data.items;
        } else if (typeof data === 'object' && data !== null) {
           rawArray = Object.values(data).filter(item => typeof item === 'object');
        }
        
        console.log("EmergencyTeamMembers Normalized:", rawArray);
        return rawArray;
      } catch (err) {
        console.error("Error fetching EmergencyTeamMembers:", err);
        throw err;
      }
    },
    initialData: [],
    staleTime: 0, // No cachear para asegurar datos frescos
    refetchOnMount: 'always', // Forzar recarga al montar
    refetchOnWindowFocus: true
  });

  const testCreateMutation = useMutation({
    mutationFn: async () => {
        const testMember = {
            employee_id: employees[0]?.id, // Use first employee if available
            rol_emergencia: "Equipo Alarma y Evacuación (EAE)",
            activo: true,
            zona_asignada: "TEST ZONE",
            es_suplente: false,
            fecha_nombramiento: new Date().toISOString()
        };
        return await base44.entities.EmergencyTeamMember.create(testMember);
    },
    onSuccess: () => {
        toast.success("Registro de prueba creado. ¡Escritura funciona!");
        refetch();
    },
    onError: (err) => {
        toast.error(`Error creando registro: ${err.message}`);
    }
  });

  if (isError) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
        <h3 className="font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Error cargando datos
        </h3>
        <p className="text-sm mt-1">{error.message}</p>
        <p className="text-xs mt-2 text-slate-500 font-mono">
          Verifica que la entidad 'EmergencyTeamMember' exista en Base44 y tengas permisos de lectura.
        </p>
      </div>
    );
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmergencyTeamMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergencyTeamMembers'] });
      toast.success("Miembro eliminado del equipo de emergencia");
    },
  });

  const membersByRole = useMemo(() => {
    const grouped = {};
    rolesEmergencia.forEach(role => {
      grouped[role.rol] = emergencyMembers.filter(m => {
        // Normalización y validación robusta (Case insensitive, trim y eliminación de acentos básicos)
        const normalize = (str) => (str || "")
          .trim()
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Eliminar acentos
        
        const dbRole = normalize(m.rol_emergencia);
        const configRole = normalize(role.rol);
        
        // Comparación flexible usando palabras clave específicas para cada rol
        let isMatch = false;

        if (configRole.includes("jefe de emergencias")) {
            isMatch = dbRole.includes("jefe de emergencias") || dbRole.includes("emergencias");
        } else if (configRole.includes("jefe de intervencion")) {
            isMatch = dbRole.includes("jefe de intervencion") || dbRole.includes("intervencion");
        } else if (configRole.includes("primera intervencion") || configRole.includes("(epi)")) {
            isMatch = dbRole.includes("primera intervencion") || dbRole.includes("epi");
        } else if (configRole.includes("segunda intervencion") || configRole.includes("(esi)")) {
            isMatch = dbRole.includes("segunda intervencion") || dbRole.includes("esi");
        } else if (configRole.includes("primeros auxilios") || configRole.includes("(epa)")) {
            isMatch = dbRole.includes("primeros auxilios") || dbRole.includes("epa") || dbRole.includes("sanitario");
        } else if (configRole.includes("alarma") || configRole.includes("evacuacion") || configRole.includes("(eae)")) {
            isMatch = dbRole.includes("alarma") || dbRole.includes("evacuacion") || dbRole.includes("eae");
        } else {
            // Fallback a coincidencia exacta normalizada
            isMatch = dbRole === configRole;
        }
        
        // Si activo es undefined o null, asumimos true para no ocultar datos por error de migración
        const isActive = m.activo !== false; 
        return isMatch && isActive;
      });
    });
    return grouped;
  }, [emergencyMembers]);

  const getEmployeeName = (employeeId) => {
    if (!employees || !Array.isArray(employees)) return `Desconocido (ID: ${employeeId})`;

    const target = String(employeeId);

    const emp = employees.find((e) => {
      const idMatch = String(e.id) === target;
      const codeMatch = e.codigo_empleado && String(e.codigo_empleado) === target;
      const emailMatch = e.email && e.email === target;
      return idMatch || codeMatch || emailMatch;
    });

    if (!emp) return `Desconocido (ID: ${employeeId})`;
    return emp.nombre || emp.full_name || `Sin nombre (ID: ${employeeId})`;
  };

  const orphanedIds = useMemo(() => {
    if (!emergencyMembers.length || !employees.length) return [];
    const uniqueIds = [...new Set(emergencyMembers.map(m => m.employee_id))];
    return uniqueIds.filter(id => {
        const target = String(id);
        return !employees.find(e => 
            String(e.id) === target || 
            (e.codigo_empleado && String(e.codigo_empleado) === target) ||
            (e.email && e.email === target)
        );
    });
  }, [emergencyMembers, employees]);

  // Diagnostic Info Component
  const DiagnosticInfo = () => (
    <div className="mt-4 p-4 bg-slate-100 rounded text-xs font-mono text-slate-600">
      <p><strong>Diagnóstico de Empleados:</strong></p>
      <p>Total Empleados Cargados: {employees.length}</p>
      <p className={orphanedIds.length > 0 ? "text-red-600 font-bold" : "text-green-600"}>
        IDs sin coincidencia en empleados: {orphanedIds.length}
      </p>
      {orphanedIds.length > 0 && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <p className="font-bold mb-1">IDs Huérfanos (Ejemplos):</p>
            <ul className="list-disc pl-4">
                {orphanedIds.slice(0, 10).map(id => (
                    <li key={id}>{id}</li>
                ))}
            </ul>
            <p className="mt-2 italic">Use el botón "Reasignar" (rojo) en la lista para corregir estos registros.</p>
        </div>
      )}
      {employees.length > 0 && (
        <p className="mt-2">Ejemplo Empleado [0]: ID="{employees[0].id}" Nombre="{employees[0].nombre || employees[0].name}"</p>
      )}
    </div>
  );

  const handleAdd = (role) => {
    setSelectedRole(role);
    setShowForm(true);
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setSelectedRole(member.rol_emergencia);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este miembro del equipo de emergencia?')) {
      deleteMutation.mutate(id);
    }
  };

  const colorClasses = {
    red: "from-red-500 to-red-600",
    orange: "from-orange-500 to-orange-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
    yellow: "from-amber-500 to-amber-600"
  };

  const unassignedMembers = useMemo(() => {
    const assignedIds = new Set();
    Object.values(membersByRole).forEach(list => list.forEach(m => assignedIds.add(m.id)));
    return emergencyMembers.filter(m => !assignedIds.has(m.id));
  }, [emergencyMembers, membersByRole]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" />
            Equipo de Emergencia
            </h2>
            <p className="text-sm text-slate-500">Gestión de roles y asignaciones de emergencia</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} title="Recargar datos">
                <RefreshCw className="w-4 h-4 mr-2" />
                Recargar
            </Button>
            {emergencyMembers.length === 0 && (
                <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => testCreateMutation.mutate()} 
                    disabled={testCreateMutation.isPending}
                >
                    {testCreateMutation.isPending ? "Creando..." : "Crear Registro Test"}
                </Button>
            )}
            <Button onClick={() => {
            setEditingMember(null);
            setShowForm(true);
            }}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir Miembro
            </Button>
        </div>
      </div>
      
      {/* Warning for unassigned members */}
      {unassignedMembers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
          <h4 className="font-bold text-amber-800 flex items-center gap-2">
             <AlertTriangle className="w-5 h-5" />
             Miembros con Rol Desconocido ({unassignedMembers.length})
          </h4>
          <p className="text-sm text-amber-700 mb-2">
            Estos miembros existen en la base de datos pero su rol no coincide con la configuración actual.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {unassignedMembers.map(m => {
                 const normalize = (str) => (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                 const normalizedRole = normalize(m.rol_emergencia);
                 return (
               <div key={m.id} className="bg-white p-2 rounded border border-amber-200 text-xs">
                 <p><strong>ID:</strong> {m.id}</p>
                 <p><strong>Rol en BD:</strong> "{m.rol_emergencia || 'NULL'}"</p>
                 <p><strong>Norm:</strong> "{normalizedRole}"</p>
                 <p><strong>Empleado:</strong> {getEmployeeName(m.employee_id)}</p>
                 <div className="mt-1 flex justify-end gap-1">
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleEdit(m)}>Editar</Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => handleDelete(m.id)}><Trash2 className="w-3 h-3"/></Button>
                 </div>
               </div>
               );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rolesEmergencia.map((roleInfo) => {
          const Icon = roleInfo.icon;
          const members = membersByRole[roleInfo.rol] || [];
          const titulares = members.filter(m => !m.es_suplente);
          const suplentes = members.filter(m => m.es_suplente);
          const cumpleRequisito = titulares.length >= roleInfo.requerido;

          return (
            <Card 
              key={roleInfo.rol}
              className={`border-2 ${
                cumpleRequisito 
                  ? 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/10' 
                  : 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[roleInfo.color]} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <Badge className={cumpleRequisito ? "bg-green-600" : "bg-red-600"}>
                    {titulares.length}/{roleInfo.requerido}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2 dark:text-slate-100">{roleInfo.rol}</CardTitle>
                <p className="text-xs text-slate-600 dark:text-slate-400">{roleInfo.descripcion}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-3">
                  {titulares.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1 dark:text-slate-300">Titulares:</p>
                      {titulares.map(member => (
                        <div key={member.id} className="flex items-center justify-between bg-white p-2 rounded border mb-1 dark:bg-slate-800 dark:border-slate-700">
                          <span className="text-xs font-medium dark:text-slate-200">{getEmployeeName(member.employee_id)}</span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(member)}
                              className="h-6 w-6 p-0 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(member.id)}
                              className="h-6 w-6 p-0 hover:text-red-600 dark:hover:text-red-400 dark:text-slate-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {suplentes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1 dark:text-slate-300">Suplentes:</p>
                      {suplentes.map(member => (
                        <div key={member.id} className="flex items-center justify-between bg-slate-100 p-2 rounded border mb-1 dark:bg-slate-800/50 dark:border-slate-700">
                          <div className="flex flex-col">
                             <span className={`text-xs ${getEmployeeName(member.employee_id).startsWith("Desconocido") ? "text-red-500 font-bold" : "dark:text-slate-300"}`}>
                                {getEmployeeName(member.employee_id)}
                             </span>
                             {member.zona_asignada && (
                                <span className="text-[10px] text-slate-500">{member.zona_asignada}</span>
                             )}
                          </div>
                          <div className="flex gap-1">
                            {getEmployeeName(member.employee_id).startsWith("Desconocido") && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleEdit(member)}
                                  className="h-6 text-[10px] px-2"
                                  title="Reasignar empleado"
                                >
                                  Reasignar
                                </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(member)}
                              className="h-6 w-6 p-0 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(member.id)}
                              className="h-6 w-6 p-0 hover:text-red-600 dark:hover:text-red-400 dark:text-slate-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => handleAdd(roleInfo.rol)}
                  className="w-full dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:border-slate-700"
                  variant="outline"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Añadir Miembro
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <EmergencyTeamMemberForm
          member={editingMember}
          selectedRole={selectedRole}
          employees={employees}
          onClose={() => {
            setShowForm(false);
            setEditingMember(null);
            setSelectedRole(null);
          }}
        />
      )}

      {/* Sección de Diagnóstico de Datos */}
      <div className="mt-8 border-t pt-4">
        <details className="text-sm text-slate-500">
          <summary className="cursor-pointer font-medium mb-2 hover:text-slate-700">
            Ver datos crudos de EmergencyTeamMember (Diagnóstico)
          </summary>
          <div className="bg-slate-100 p-4 rounded-md overflow-auto max-h-60">
            <DiagnosticInfo />
            <p className="mb-2 font-semibold mt-4">Total registros encontrados: {emergencyMembers.length}</p>
            {emergencyMembers.length > 0 ? (
              <pre>{JSON.stringify(emergencyMembers, null, 2)}</pre>
            ) : (
              <p>No se encontraron registros en base44.entities.EmergencyTeamMember</p>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
