import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, AlertTriangle, Shield } from "lucide-react";
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

  const { data: emergencyMembers = [], error, isError } = useQuery({
    queryKey: ['emergencyTeamMembers'],
    queryFn: async () => {
      console.log("Fetching EmergencyTeamMembers...");
      try {
        const data = await base44.entities.EmergencyTeamMember.list();
        console.log("EmergencyTeamMembers fetched:", data);
        return data;
      } catch (err) {
        console.error("Error fetching EmergencyTeamMembers:", err);
        throw err;
      }
    },
    initialData: [],
    staleTime: 10 * 60 * 1000, // Cache por 10 minutos
    retry: 1, // Solo 1 reintento
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
        
        // Comparación flexible: coincidencia exacta normalizada O inclusión
        const roleMatch = dbRole === configRole || 
                         (dbRole.includes("jefe de emergencias") && configRole.includes("jefe de emergencias")) ||
                         (dbRole.includes("jefe de intervencion") && configRole.includes("jefe de intervencion"));
        
        // Si activo es undefined o null, asumimos true para no ocultar datos por error de migración
        const isActive = m.activo !== false; 
        return roleMatch && isActive;
      });
    });
    return grouped;
  }, [emergencyMembers]);

  const getEmployeeName = (employeeId) => {
    if (!employees || !Array.isArray(employees)) return "Desconocido";
    // Comparación robusta de IDs (String vs Number)
    const emp = employees.find(e => String(e.id) === String(employeeId));
    return emp?.nombre || "Desconocido";
  };

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

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 dark:bg-blue-950/20 dark:border-blue-900">
        <h3 className="font-semibold text-blue-900 mb-2 dark:text-blue-200">
          📋 Composición Legal del Equipo de Emergencia
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Para empresas de menos de 500 trabajadores según normativa vigente. 
          Se recomienda tener suplentes para cada rol crítico.
        </p>
      </div>

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
                          <span className="text-xs dark:text-slate-300">{getEmployeeName(member.employee_id)}</span>
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
            <p className="mb-2 font-semibold">Total registros encontrados: {emergencyMembers.length}</p>
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