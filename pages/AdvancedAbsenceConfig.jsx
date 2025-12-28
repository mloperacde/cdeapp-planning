import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, GitFork, Bell, Calendar, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ApprovalFlowConfig from "../components/absences/ApprovalFlowConfig";
import AbsenceNotificationConfig from "../components/absences/AbsenceNotificationConfig";
import VacationAccumulationConfig from "../components/absences/VacationAccumulationConfig";
import AbsenceSyncAudit from "../components/absences/AbsenceSyncAudit";

export default function AdvancedAbsenceConfigPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Configuración Avanzada de Ausencias
          </h1>
          <p className="text-slate-600 mt-1">
            Flujos de aprobación, notificaciones y gestión de vacaciones
          </p>
        </div>

        <Tabs defaultValue="flows" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="flows">
              <GitFork className="w-4 h-4 mr-2" />
              Flujos de Aprobación
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="vacations">
              <Calendar className="w-4 h-4 mr-2" />
              Vacaciones y Acumulación
            </TabsTrigger>
            <TabsTrigger value="audit">
              <FileText className="w-4 h-4 mr-2" />
              Auditoría
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flows">
            <ApprovalFlowConfig />
          </TabsContent>

          <TabsContent value="notifications">
            <AbsenceNotificationConfig />
          </TabsContent>

          <TabsContent value="vacations">
            <VacationAccumulationConfig />
          </TabsContent>

          <TabsContent value="audit">
            <AbsenceSyncAudit />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}