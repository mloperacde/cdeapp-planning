import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, AlertTriangle, HeartPulse, Flame, Plus, FileText } from "lucide-react";
import CommitteeMemberForm from "../components/committee/CommitteeMemberForm";
import CommitteeMemberList from "../components/committee/CommitteeMemberList";
import UnionHoursTracker from "../components/committee/UnionHoursTracker";
import RiskAssessmentManager from "../components/committee/RiskAssessmentManager";
import IncidentManager from "../components/committee/IncidentManager";
import EmergencyTeamManager from "../components/committee/EmergencyTeamManager";
import PRLDocumentManager from "../components/committee/PRLDocumentManager";
import EmergencyTrainingManager from "../components/committee/EmergencyTrainingManager"; // Added import

export default function CommitteeManagementPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState(null);
  const [currentTab, setCurrentTab] = useState("company");

  const { data: committeeMembers = [], refetch: _refetchCommitteeMembers } = useQuery({
    queryKey: ['committeeMembers'],
    queryFn: async () => {
      try {
        return await base44.entities.CommitteeMember.list(undefined, 500);
      } catch (err) {
        console.warn('Error loading committee members:', err);
        return [];
      }
    },
    initialData: [],
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const { data: employees = [], refetch: _refetchEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        return await base44.entities.EmployeeMasterDatabase.list('nombre', 5000);
      } catch (err) {
        console.warn('Error loading employees:', err);
        return [];
      }
    },
    initialData: [],
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['riskAssessments'],
    queryFn: () => base44.entities.RiskAssessment.list('-fecha_evaluacion'),
    initialData: [],
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['workIncidents'],
    queryFn: () => base44.entities.WorkIncident.list('-fecha_hora'),
    initialData: [],
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const activeIncidents = incidents.filter(i => 
    i.estado_investigacion !== "Cerrada"
  ).length;

  const pendingRisks = riskAssessments.reduce((sum, ra) => 
    sum + (ra.riesgos_identificados?.filter(r => r.estado === "Pendiente").length || 0), 0
  );

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header Estándar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Gestión de Comités y PRL
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Comités, representantes, prevención de riesgos y gestión de incidentes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            className="h-8 gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Añadir Miembro</span>
          </Button>
        </div>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:bg-slate-900 dark:bg-none dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Miembros</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {committeeMembers.filter(m => m.activo).length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:bg-slate-900 dark:bg-none dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Incidentes Activos</p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{activeIncidents}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 dark:bg-slate-900 dark:bg-none dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">Riesgos Pendientes</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">{pendingRisks}</p>
                </div>
                <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:bg-slate-900 dark:bg-none dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium">Evaluaciones</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{riskAssessments.length}</p>
                </div>
                <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="company">
              <Users className="w-4 h-4 mr-2" />
              Comités
            </TabsTrigger>
            <TabsTrigger value="emergency">
              <Flame className="w-4 h-4 mr-2" />
              Emergencias
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="incidents">
              <HeartPulse className="w-4 h-4 mr-2" />
              Incidentes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Tabs defaultValue="list" className="space-y-4">
              <TabsList>
                <TabsTrigger value="list">Lista de Miembros</TabsTrigger>
                <TabsTrigger value="hours">Horas Sindicales</TabsTrigger>
                <TabsTrigger value="risks">Evaluaciones de Riesgos</TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                <CommitteeMemberList
                  members={committeeMembers}
                  employees={employees}
                  onEdit={(member) => {
                    setSelectedCommittee(member);
                    setShowForm(true);
                  }}
                />
              </TabsContent>

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
          </TabsContent>

          <TabsContent value="emergency">
            <Tabs defaultValue="team" className="space-y-4">
              <TabsList>
                <TabsTrigger value="team">Equipo de Emergencia</TabsTrigger>
                <TabsTrigger value="training">Estado de Formaciones</TabsTrigger>
              </TabsList>

              <TabsContent value="team">
                <EmergencyTeamManager employees={employees} />
              </TabsContent>

              <TabsContent value="training">
                <EmergencyTrainingManager employees={employees} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="documents">
            <PRLDocumentManager />
          </TabsContent>

          <TabsContent value="incidents">
            <IncidentManager 
              incidents={incidents}
              employees={employees}
            />
          </TabsContent>
        </Tabs>

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
  );
}
