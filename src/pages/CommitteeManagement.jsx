import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Shield,
  AlertTriangle,
  HeartPulse,
  Flame,
  Plus,
  Clock,
  Award,
  FileText,
  TrendingUp
} from "lucide-react";
import CommitteeMemberForm from "../components/committee/CommitteeMemberForm";
import CommitteeMemberList from "../components/committee/CommitteeMemberList";
import UnionHoursTracker from "../components/committee/UnionHoursTracker";
import RiskAssessmentManager from "../components/committee/RiskAssessmentManager";
import IncidentManager from "../components/committee/IncidentManager";

export default function CommitteeManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState(null);
  const [currentTab, setCurrentTab] = useState("company");

  const { data: committeeMembers } = useQuery({
    queryKey: ['committeeMembers'],
    queryFn: () => base44.entities.CommitteeMember.list(),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: riskAssessments } = useQuery({
    queryKey: ['riskAssessments'],
    queryFn: () => base44.entities.RiskAssessment.list('-fecha_evaluacion'),
    initialData: [],
  });

  const { data: incidents } = useQuery({
    queryKey: ['workIncidents'],
    queryFn: () => base44.entities.WorkIncident.list('-fecha_hora'),
    initialData: [],
  });

  const committeeTypes = [
    {
      id: "company",
      name: "Comité de Empresa",
      icon: Users,
      color: "blue",
      filter: "Comité de Empresa"
    },
    {
      id: "safety",
      name: "Seguridad y Salud",
      icon: Shield,
      color: "green",
      filter: "Comité Seguridad y Salud"
    },
    {
      id: "harassment",
      name: "Prevención Acoso",
      icon: AlertTriangle,
      color: "purple",
      filter: "Comité Prevención Acoso"
    },
    {
      id: "emergency",
      name: "Equipos Emergencia",
      icon: Flame,
      color: "red",
      filter: "Equipo de Emergencia"
    }
  ];

  const activeIncidents = incidents.filter(i => 
    i.estado_investigacion !== "Cerrada"
  ).length;

  const pendingRisks = riskAssessments.reduce((sum, ra) => 
    sum + (ra.riesgos_identificados?.filter(r => r.estado === "Pendiente").length || 0), 0
  );

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Gestión de Comités y PRL
            </h1>
            <p className="text-slate-600 mt-1">
              Comités, representantes, prevención de riesgos y gestión de incidentes
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Añadir Miembro
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Miembros</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {committeeMembers.filter(m => m.activo).length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Incidentes Activos</p>
                  <p className="text-2xl font-bold text-amber-900">{activeIncidents}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Riesgos Pendientes</p>
                  <p className="text-2xl font-bold text-red-900">{pendingRisks}</p>
                </div>
                <Shield className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Evaluaciones</p>
                  <p className="text-2xl font-bold text-green-900">{riskAssessments.length}</p>
                </div>
                <FileText className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            {committeeTypes.map((type) => {
              const Icon = type.icon;
              const count = committeeMembers.filter(m => 
                m.tipo_comite === type.filter && m.activo
              ).length;
              
              return (
                <TabsTrigger key={type.id} value={type.id}>
                  <Icon className="w-4 h-4 mr-2" />
                  {type.name.split(' ')[0]}
                  <Badge variant="outline" className="ml-2">{count}</Badge>
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="hours">
              <Clock className="w-4 h-4 mr-2" />
              H. Sindicales
            </TabsTrigger>
            <TabsTrigger value="risks">
              <Shield className="w-4 h-4 mr-2" />
              Riesgos
            </TabsTrigger>
          </TabsList>

          {committeeTypes.map((type) => (
            <TabsContent key={type.id} value={type.id}>
              <CommitteeMemberList
                members={committeeMembers.filter(m => m.tipo_comite === type.filter)}
                employees={employees}
                committeeType={type.filter}
                onEdit={(member) => {
                  setSelectedCommittee(member);
                  setShowForm(true);
                }}
              />
            </TabsContent>
          ))}

          <TabsContent value="hours">
            <UnionHoursTracker
              committeeMembers={committeeMembers}
              employees={employees}
            />
          </TabsContent>

          <TabsContent value="risks">
            <RiskAssessmentManager />
          </TabsContent>
        </Tabs>

        {/* Sección de Incidentes */}
        <div className="mt-6">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-red-600" />
                Gestión de Incidentes y Accidentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <IncidentManager 
                incidents={incidents}
                employees={employees}
              />
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <CommitteeMemberForm
            member={selectedCommittee}
            employees={employees}
            onClose={() => {
              setShowForm(false);
              setSelectedCommittee(null);
            }}
          />
        )}
      </div>
    </div>
  );
}