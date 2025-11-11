import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, ArrowLeft, Calendar, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function MachineMaintenancePage() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Machines")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Máquinas
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Wrench className="w-8 h-8 text-orange-600" />
              Mantenimiento de Máquinas
            </h1>
            <p className="text-slate-600 mt-1">
              Seguimiento de mantenimiento y mantenimiento predictivo
            </p>
          </div>
        </div>

        <Tabs defaultValue="tracking" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tracking">
              <Calendar className="w-4 h-4 mr-2" />
              Seguimiento de Mantenimiento
            </TabsTrigger>
            <TabsTrigger value="predictive">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Mantenimiento Predictivo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracking">
            <Card className="bg-blue-50 border-2 border-blue-300">
              <CardContent className="p-6">
                <p className="text-blue-800">
                  Módulo de seguimiento de mantenimiento en desarrollo...
                  <br />
                  <Link to={createPageUrl("MaintenanceTracking")} className="text-blue-600 hover:underline font-semibold">
                    → Ir a Seguimiento de Mantenimiento (página existente)
                  </Link>
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictive">
            <Card className="bg-blue-50 border-2 border-blue-300">
              <CardContent className="p-6">
                <p className="text-blue-800">
                  Módulo de mantenimiento predictivo en desarrollo...
                  <br />
                  <Link to={createPageUrl("PredictiveMaintenance")} className="text-blue-600 hover:underline font-semibold">
                    → Ir a Mantenimiento Predictivo (página existente)
                  </Link>
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}