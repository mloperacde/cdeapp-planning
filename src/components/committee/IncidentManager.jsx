import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, XCircle, Plus, Eye, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import IncidentForm from "./IncidentForm";
import IncidentDetail from "./IncidentDetail";
import IncidentReport from "./IncidentReport";

export default function IncidentManager({ incidents = [], employees = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [viewingIncident, setViewingIncident] = useState(null);
  const [currentView, setCurrentView] = useState("list");

  const getEmployeeName = (employeeId) => {
    if (!employees || !Array.isArray(employees)) return "Desconocido";
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Desconocido";
  };

  const getGravedadBadge = (gravedad) => {
    const config = {
      "Leve": { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
      "Grave": { className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: AlertTriangle },
      "Muy Grave": { className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: AlertTriangle },
      "Mortal": { className: "bg-red-600 text-white dark:bg-red-700", icon: XCircle }
    }[gravedad] || { className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300", icon: AlertTriangle };

    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {gravedad}
      </Badge>
    );
  };

  const activeIncidents = (incidents || []).filter(i => 
    i.estado_investigacion !== "Cerrada" && i.estado_investigacion !== "Completada"
  );
  
  const closedIncidents = (incidents || []).filter(i => 
    i.estado_investigacion === "Cerrada" || i.estado_investigacion === "Completada"
  );

  const renderIncidentList = (incidentList) => {
    if (!incidentList || incidentList.length === 0) {
      return (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          No hay incidentes en esta categoría
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {incidentList.map((incident) => {
          const medidasPendientes = incident.medidas_correctoras?.filter(m => m.estado === "Pendiente").length || 0;
          const medidasTotal = incident.medidas_correctoras?.length || 0;
          
          return (
            <Card key={incident.id} className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow dark:bg-slate-800 dark:border-slate-700 dark:border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={
                        incident.tipo === "Accidente" ? "bg-red-600 dark:bg-red-700" :
                        incident.tipo === "Incidente" ? "bg-amber-600 dark:bg-amber-700" :
                        "bg-yellow-600 dark:bg-yellow-700"
                      }>
                        {incident.tipo}
                      </Badge>
                      {getGravedadBadge(incident.gravedad)}
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {getEmployeeName(incident.employee_id)}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {incident.departamento} - {incident.lugar}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium dark:text-slate-200">
                      {format(new Date(incident.fecha_hora), "dd/MM/yyyy", { locale: es })}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(incident.fecha_hora), "HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{incident.descripcion}</p>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="outline" className={
                      incident.estado_investigacion === "Completada" || incident.estado_investigacion === "Cerrada" 
                        ? "border-green-600 text-green-600 dark:border-green-400 dark:text-green-400" :
                      incident.estado_investigacion === "En Curso" ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400" :
                      "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400"
                    }>
                      {incident.estado_investigacion}
                    </Badge>
                    
                    {incident.dias_baja > 0 && (
                      <Badge className="bg-red-600 text-white dark:bg-red-700">
                        {incident.dias_baja} días baja
                      </Badge>
                    )}

                    {medidasTotal > 0 && (
                      <Badge variant="outline" className="dark:border-slate-600 dark:text-slate-400">
                        {medidasTotal - medidasPendientes}/{medidasTotal} medidas
                      </Badge>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setViewingIncident(incident)}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver Detalle
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={currentView === "list" ? "default" : "outline"}
            onClick={() => setCurrentView("list")}
            className={currentView === "list" ? "dark:bg-slate-100 dark:text-slate-900" : "dark:text-slate-200 dark:border-slate-700"}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Lista
          </Button>
          <Button
            variant={currentView === "report" ? "default" : "outline"}
            onClick={() => setCurrentView("report")}
            className={currentView === "report" ? "dark:bg-slate-100 dark:text-slate-900" : "dark:text-slate-200 dark:border-slate-700"}
          >
            <FileText className="w-4 h-4 mr-2" />
            Informe
          </Button>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600">
          <Plus className="w-4 h-4 mr-2" />
          Registrar Incidente
        </Button>
      </div>

      {currentView === "report" ? (
        <IncidentReport incidents={incidents} employees={employees} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 dark:from-red-950/40 dark:to-red-900/40 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-700 dark:text-red-300 font-medium">Activos</p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">{activeIncidents.length}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950/40 dark:to-blue-900/40 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Registrados</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{incidents.length}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950/40 dark:to-amber-900/40 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Accidentes con Baja</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                      {incidents.filter(i => i.dias_baja > 0).length}
                    </p>
                  </div>
                  <XCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="active" className="space-y-4">
            <TabsList className="dark:bg-slate-800 dark:text-slate-400">
              <TabsTrigger value="active" className="dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-slate-100">
                Activos ({activeIncidents.length})
              </TabsTrigger>
              <TabsTrigger value="closed" className="dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-slate-100">
                Cerrados ({closedIncidents.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="dark:data-[state=active]:bg-slate-950 dark:data-[state=active]:text-slate-100">
                Todos ({incidents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {renderIncidentList(activeIncidents)}
            </TabsContent>

            <TabsContent value="closed">
              {renderIncidentList(closedIncidents)}
            </TabsContent>

            <TabsContent value="all">
              {renderIncidentList(incidents)}
            </TabsContent>
          </Tabs>
        </>
      )}

      {showForm && (
        <IncidentForm
          incident={editingIncident}
          employees={employees}
          onClose={() => {
            setShowForm(false);
            setEditingIncident(null);
          }}
        />
      )}

      {viewingIncident && (
        <IncidentDetail
          incident={viewingIncident}
          employees={employees}
          onClose={() => setViewingIncident(null)}
        />
      )}
    </div>
  );
}