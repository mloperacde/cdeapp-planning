import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, Calendar, Factory, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

// Import importer components if they exist, otherwise use placeholders
// I will update this file after checking the components in the next step
// For now, providing a safe default export to fix the build
export default function DataImportPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl("Configuration")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Importación de Datos</h1>
          <p className="text-slate-500">Gestión masiva de datos mediante archivos CSV/Excel</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="employees">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="employees" className="gap-2">
                <Users className="w-4 h-4" />
                Empleados
              </TabsTrigger>
              <TabsTrigger value="attendance" className="gap-2">
                <Calendar className="w-4 h-4" />
                Asistencia
              </TabsTrigger>
              <TabsTrigger value="production" className="gap-2">
                <Factory className="w-4 h-4" />
                Producción
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employees">
              <div className="text-center py-10 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Cargando módulo de importación de empleados...</p>
              </div>
            </TabsContent>

            <TabsContent value="attendance">
               <div className="text-center py-10 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Cargando módulo de importación de asistencia...</p>
              </div>
            </TabsContent>

            <TabsContent value="production">
               <div className="text-center py-10 text-slate-500">
                <Factory className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Cargando módulo de importación de producción...</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}