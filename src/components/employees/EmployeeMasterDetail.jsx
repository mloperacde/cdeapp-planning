import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, Briefcase, Clock, KeyRound, Award, Shield, 
  Flame, FileText, ArrowLeft, Edit, Calendar, TrendingUp
} from "lucide-react";
import { format, differenceInYears, differenceInMonths, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import LockerAssignmentPanel from "./LockerAssignmentPanel";
import CommitteeMemberForm from "../committee/CommitteeMemberForm";
import EmergencyTeamMemberForm from "../committee/EmergencyTeamMemberForm";

export default function EmployeeMasterDetail({ employee, onClose, onEdit }) {
  const [activeTab, setActiveTab] = useState("general");
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: lockerAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    initialData: [],
  });

  const { data: committeeMembers } = useQuery({
    queryKey: ['committeeMembers'],
    queryFn: () => base44.entities.CommitteeMember.list(),
    initialData: [],
  });

  const { data: emergencyMembers } = useQuery({
    queryKey: ['emergencyTeamMembers'],
    queryFn: () => base44.entities.EmergencyTeamMember.list(),
    initialData: [],
  });

  const { data: employeeSkills } = useQuery({
    queryKey: ['employeeSkills'],
    queryFn: () => base44.entities.EmployeeSkill.list(),
    initialData: [],
  });

  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: () => base44.entities.Skill.list(),
    initialData: [],
  });

  const { data: absences } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const { data: trainingRecords } = useQuery({
    queryKey: ['employeeTraining'],
    queryFn: () => base44.entities.EmployeeTraining.list(),
    initialData: [],
  });

  const locker = lockerAssignments.find(la => la.employee_id === employee.id);
  const committee = committeeMembers.filter(cm => cm.employee_id === employee.id && cm.activo);
  const emergency = emergencyMembers.filter(em => em.employee_id === employee.id && em.activo);
  const employeeSkillsList = employeeSkills.filter(es => es.employee_id === employee.id);
  const employeeAbsences = absences.filter(a => a.employee_id === employee.id);
  const employeeTraining = trainingRecords.filter(tr => tr.employee_id === employee.id);

  const antiguedad = React.useMemo(() => {
    if (!employee.fecha_alta) return null;
    
    const fechaAlta = new Date(employee.fecha_alta);
    const hoy = new Date();
    
    const years = differenceInYears(hoy, fechaAlta);
    const months = differenceInMonths(hoy, fechaAlta) % 12;
    
    let result = [];
    if (years > 0) result.push(`${years} año${years !== 1 ? 's' : ''}`);
    if (months > 0) result.push(`${months} mes${months !== 1 ? 'es' : ''}`);
    
    return result.length > 0 ? result.join(', ') : 'Menos de 1 mes';
  }, [employee.fecha_alta]);

  const edad = React.useMemo(() => {
    if (!employee.fecha_nacimiento) return null;
    
    const birthDate = new Date(employee.fecha_nacimiento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }, [employee.fecha_nacimiento]);

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold">
                {employee.nombre?.charAt(0) || "?"}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{employee.nombre}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-blue-600">{employee.departamento || "Sin Departamento"}</Badge>
                  <Badge variant="outline">{employee.puesto || "Sin Puesto"}</Badge>
                  {employee.disponibilidad === "Ausente" && (
                    <Badge variant="destructive">Ausente</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={onEdit} variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button onClick={onClose} variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="general">
                <User className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="rrhh">
                <Briefcase className="w-4 h-4 mr-2" />
                RRHH
              </TabsTrigger>
              <TabsTrigger value="locker">
                <KeyRound className="w-4 h-4 mr-2" />
                Taquilla
              </TabsTrigger>
              <TabsTrigger value="skills">
                <Award className="w-4 h-4 mr-2" />
                Habilidades
              </TabsTrigger>
              <TabsTrigger value="committee">
                <Shield className="w-4 h-4 mr-2" />
                Comités
              </TabsTrigger>
              <TabsTrigger value="emergency">
                <Flame className="w-4 h-4 mr-2" />
                Emergencias
              </TabsTrigger>
              <TabsTrigger value="absences">
                <Calendar className="w-4 h-4 mr-2" />
                Ausencias
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-slate-900">Datos Personales</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-slate-600">Código Empleado</Label>
                      <p className="font-medium">{employee.codigo_empleado || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">DNI/NIE</Label>
                      <p className="font-medium">{employee.dni || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">NUSS</Label>
                      <p className="font-medium">{employee.nuss || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Fecha Nacimiento</Label>
                      <p className="font-medium">
                        {employee.fecha_nacimiento ? (
                          <>{format(new Date(employee.fecha_nacimiento), "dd/MM/yyyy", { locale: es })} ({edad} años)</>
                        ) : "-"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Sexo</Label>
                      <p className="font-medium">{employee.sexo || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Nacionalidad</Label>
                      <p className="font-medium">{employee.nacionalidad || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-slate-900">Contacto</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-slate-600">Email</Label>
                      <p className="font-medium">{employee.email || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Teléfono</Label>
                      <p className="font-medium">{employee.telefono_movil || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Dirección</Label>
                      <p className="font-medium">{employee.direccion || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Contacto Emergencia</Label>
                      <p className="font-medium">
                        {employee.contacto_emergencia_nombre || "-"}
                        {employee.contacto_emergencia_telefono && ` - ${employee.contacto_emergencia_telefono}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold text-lg text-slate-900 mb-4">Información Laboral</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-600">Tipo Jornada</Label>
                    <p className="font-medium">{employee.tipo_jornada}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Horas Semanales</Label>
                    <p className="font-medium">{employee.num_horas_jornada || 40}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Tipo Turno</Label>
                    <p className="font-medium">{employee.tipo_turno}</p>
                  </div>
                  {employee.equipo && (
                    <div>
                      <Label className="text-slate-600">Equipo</Label>
                      <p className="font-medium">{employee.equipo}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-slate-600">Categoría</Label>
                    <p className="font-medium">{employee.categoria || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Formación</Label>
                    <p className="font-medium">{employee.formacion || "-"}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rrhh" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg text-slate-900">Contrato</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-slate-600">Tipo de Contrato</Label>
                      <p className="font-medium">{employee.tipo_contrato || "-"}</p>
                    </div>
                    {employee.empresa_ett && (
                      <div>
                        <Label className="text-slate-600">Empresa ETT</Label>
                        <p className="font-medium">{employee.empresa_ett}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-slate-600">Código Contrato</Label>
                      <p className="font-medium">{employee.codigo_contrato || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Fecha Alta</Label>
                      <p className="font-medium">
                        {employee.fecha_alta ? format(new Date(employee.fecha_alta), "dd/MM/yyyy", { locale: es }) : "-"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Antigüedad</Label>
                      <p className="font-medium">{antiguedad || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Fecha Fin Contrato</Label>
                      <p className="font-medium">
                        {employee.fecha_fin_contrato ? format(new Date(employee.fecha_fin_contrato), "dd/MM/yyyy", { locale: es }) : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-lg text-slate-900">Compensación</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-slate-600">Salario Anual</Label>
                      <p className="font-medium">{employee.salario_anual ? `${employee.salario_anual.toLocaleString()} €` : "-"}</p>
                    </div>
                    {employee.objetivos?.periodo && (
                      <>
                        <div>
                          <Label className="text-slate-600">Período Objetivos</Label>
                          <p className="font-medium">{employee.objetivos.periodo}</p>
                        </div>
                        <div>
                          <Label className="text-slate-600">Incentivo Objetivos</Label>
                          <p className="font-medium">{employee.objetivos.importe_incentivo?.toLocaleString()} €</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {employee.evaluacion_responsable && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">Evaluación</h3>
                  <div className="bg-slate-50 p-4 rounded">
                    <p className="text-sm">{employee.evaluacion_responsable}</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="locker" className="mt-6">
              <LockerAssignmentPanel employee={employee} />
            </TabsContent>

            <TabsContent value="skills" className="space-y-4 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-slate-900">
                  Habilidades Adquiridas ({employeeSkillsList.length})
                </h3>
              </div>

              {employeeSkillsList.length === 0 ? (
                <Card className="bg-slate-50">
                  <CardContent className="p-8 text-center">
                    <Award className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No hay habilidades registradas</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employeeSkillsList.map((es) => {
                    const skill = skills.find(s => s.id === es.skill_id);
                    return (
                      <Card key={es.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-slate-900">{skill?.nombre || "Habilidad"}</h4>
                              <Badge className={`mt-2 ${
                                es.nivel_competencia === "Experto" ? "bg-purple-600" :
                                es.nivel_competencia === "Avanzado" ? "bg-blue-600" :
                                es.nivel_competencia === "Intermedio" ? "bg-green-600" :
                                "bg-slate-600"
                              }`}>
                                {es.nivel_competencia}
                              </Badge>
                              {es.certificado && (
                                <Badge className="bg-green-100 text-green-800 ml-2">Certificado</Badge>
                              )}
                            </div>
                          </div>
                          {es.fecha_adquisicion && (
                            <p className="text-xs text-slate-500 mt-2">
                              Adquirida: {format(new Date(es.fecha_adquisicion), "dd/MM/yyyy", { locale: es })}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="committee" className="space-y-4 mt-6">
              <h3 className="font-semibold text-lg text-slate-900">
                Participación en Comités ({committee.length})
              </h3>

              {committee.length === 0 ? (
                <Card className="bg-slate-50">
                  <CardContent className="p-8 text-center">
                    <Shield className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No participa en ningún comité</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {committee.map((cm) => (
                    <Card key={cm.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {(cm.tipos_comite || []).map((tipo, idx) => (
                                <Badge key={idx} className="bg-purple-600">{tipo}</Badge>
                              ))}
                            </div>
                            {cm.cargo && (
                              <p className="text-sm font-medium text-slate-700">{cm.cargo}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                              Desde: {format(new Date(cm.fecha_inicio), "dd/MM/yyyy", { locale: es })}
                            </p>
                            {cm.horas_sindicales_mensuales > 0 && (
                              <Badge variant="outline" className="mt-2">
                                {cm.horas_sindicales_mensuales}h/mes
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="emergency" className="space-y-4 mt-6">
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
                              Desde: {format(new Date(em.fecha_nombramiento), "dd/MM/yyyy", { locale: es })}
                            </p>
                            {em.zona_asignada && (
                              <p className="text-xs text-slate-600 mt-1">Zona: {em.zona_asignada}</p>
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
            </TabsContent>

            <TabsContent value="absences" className="space-y-4 mt-6">
              <h3 className="font-semibold text-lg text-slate-900">
                Historial de Ausencias ({employeeAbsences.length})
              </h3>

              {employeeAbsences.length === 0 ? (
                <Card className="bg-slate-50">
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No hay ausencias registradas</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {employeeAbsences
                    .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio))
                    .map((absence) => (
                      <Card key={absence.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge>{absence.tipo || absence.motivo}</Badge>
                              <p className="text-sm mt-2">
                                {format(new Date(absence.fecha_inicio), "dd/MM/yyyy", { locale: es })}
                                {" → "}
                                {absence.fecha_fin ? format(new Date(absence.fecha_fin), "dd/MM/yyyy", { locale: es }) : "Indefinida"}
                              </p>
                              {absence.motivo && (
                                <p className="text-xs text-slate-600 mt-1">{absence.motivo}</p>
                              )}
                            </div>
                            <Badge className={absence.remunerada ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {absence.remunerada ? "Remunerada" : "No remunerada"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}