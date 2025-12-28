import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Database, Factory, Users, Calendar, Save, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function DirectDataEntryPage() {
  const [activeTab, setActiveTab] = useState("production");
  const queryClient = useQueryClient();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-8 h-8 text-blue-600" />
            Entrada Directa de Datos
          </h1>
          <p className="text-slate-500">
            Registro manual rápido de datos de producción y personal
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg mb-6">
          <TabsTrigger value="production" className="flex items-center gap-2">
            <Factory className="w-4 h-4" /> Producción
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Presencia
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Notas Turno
          </TabsTrigger>
        </TabsList>

        <TabsContent value="production">
          <ProductionEntryForm />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceEntryForm />
        </TabsContent>

        <TabsContent value="notes">
          <ShiftNotesForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductionEntryForm() {
  const handleSubmit = (e) => {
    e.preventDefault();
    toast.info("Funcionalidad de registro de producción pendiente de conectar");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de Producción Manual</CardTitle>
        <CardDescription>Introduce los datos de producción de una máquina/turno específico</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" required />
            </div>
            <div className="space-y-2">
              <Label>Turno</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Mañana</SelectItem>
                  <SelectItem value="afternoon">Tarde</SelectItem>
                  <SelectItem value="night">Noche</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Máquina / Línea</Label>
            <Input placeholder="Código de máquina" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Orden de Trabajo</Label>
              <Input placeholder="Número de OF" />
            </div>
            <div className="space-y-2">
              <Label>Cantidad Producida</Label>
              <Input type="number" placeholder="0" />
            </div>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" /> Registrar Producción
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AttendanceEntryForm() {
  const handleSubmit = (e) => {
    e.preventDefault();
    toast.info("Funcionalidad de registro de presencia pendiente de conectar");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de Incidencia de Presencia</CardTitle>
        <CardDescription>Registra manualmente una entrada, salida o ausencia imprevista</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <Label>Empleado</Label>
            <Input placeholder="Buscar empleado por nombre o ID..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Registro</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check_in">Entrada Manual</SelectItem>
                  <SelectItem value="check_out">Salida Manual</SelectItem>
                  <SelectItem value="absence">Ausencia Imprevista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hora / Fecha</Label>
              <Input type="datetime-local" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motivo / Observación</Label>
            <Textarea placeholder="Explica el motivo del registro manual..." />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" /> Registrar Incidencia
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ShiftNotesForm() {
  const handleSubmit = (e) => {
    e.preventDefault();
    toast.info("Nota guardada");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notas de Turno</CardTitle>
        <CardDescription>Anotaciones generales para el siguiente turno o registro de incidencias generales</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <Label>Asunto</Label>
            <Input placeholder="Resumen breve..." />
          </div>
          
          <div className="space-y-2">
            <Label>Contenido</Label>
            <Textarea className="min-h-[150px]" placeholder="Detalles de lo ocurrido durante el turno..." />
          </div>

          <div className="flex items-center gap-2">
             <Input type="checkbox" className="w-4 h-4" id="urgent" />
             <Label htmlFor="urgent">Marcar como urgente / Importante</Label>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" /> Guardar Nota
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}