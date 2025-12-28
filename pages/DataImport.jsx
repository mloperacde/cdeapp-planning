import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, Calendar, Factory, ArrowLeft, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Importers
import MasterEmployeeImport from "@/components/master/MasterEmployeeImport";
import AttendanceImporter from "@/components/attendance/AttendanceImporter";
import WorkOrderImporter from "@/components/planning/WorkOrderImporter";

export default function DataImportPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Data for WorkOrderImporter
  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: []
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list(),
    initialData: []
  });

  // Config for AttendanceImporter (mock or fetch if exists)
  const { data: attendanceConfig } = useQuery({
    queryKey: ['attendanceConfig'],
    queryFn: () => base44.entities.AttendanceConfig.list().then(res => res[0] || {}),
    initialData: {}
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" size="icon" className="hover:bg-slate-200">
              <ArrowLeft className="w-6 h-6 text-slate-700" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              Centro de Importación de Datos
            </h1>
            <p className="text-slate-600 mt-1">
              Herramientas unificadas para la carga masiva de información al sistema
            </p>
          </div>
        </div>

        <Tabs defaultValue="employees" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-auto p-1 bg-slate-200/50 backdrop-blur">
            <TabsTrigger value="employees" className="gap-3 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Users className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <div className="font-semibold text-slate-900">Empleados</div>
                <div className="text-xs text-slate-500">Carga masiva de personal</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-3 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Calendar className="w-5 h-5 text-green-600" />
               <div className="text-left">
                <div className="font-semibold text-slate-900">Asistencia</div>
                <div className="text-xs text-slate-500">Importar fichajes y horas</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="production" className="gap-3 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Factory className="w-5 h-5 text-amber-600" />
               <div className="text-left">
                <div className="font-semibold text-slate-900">Producción</div>
                <div className="text-xs text-slate-500">Órdenes de trabajo</div>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-4 animate-in fade-in-50 duration-300">
            <MasterEmployeeImport />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4 animate-in fade-in-50 duration-300">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <AttendanceImporter 
                  selectedDate={selectedDate} 
                  onDateChange={setSelectedDate}
                  config={attendanceConfig}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production" className="space-y-4 animate-in fade-in-50 duration-300">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="w-6 h-6 text-amber-600" />
                  Importador de Órdenes de Trabajo
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Carga nuevas órdenes de producción asignándolas a máquinas y fechas.
                </p>
              </CardHeader>
              <CardContent className="p-6">
                 <WorkOrderImporter 
                   machines={machines} 
                   processes={processes}
                   onImportSuccess={() => {
                     // Optional: refresh queries or show global toast
                   }}
                 />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}