
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Gavel, Printer, Search, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function ConductIncidentManager({ incidents = [], employees = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [showLetter, setShowLetter] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const conductIncidents = incidents.filter(i => i.tipo === "Conducta");

  const filteredIncidents = conductIncidents.filter(i => {
    const emp = employees.find(e => e.id === i.employee_id);
    const empName = emp?.nombre || "";
    return empName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           i.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getEmployeeName = (id) => {
    const emp = employees.find(e => String(e.id) === String(id));
    return emp?.nombre || "Desconocido";
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        tipo: "Conducta", // Force type
        fecha_hora: data.fecha_hora || new Date().toISOString(),
      };

      if (data.id) {
        return await base44.entities.WorkIncident.update(data.id, payload);
      } else {
        return await base44.entities.WorkIncident.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workIncidentsShift"] });
      setShowForm(false);
      setEditingIncident(null);
      toast.success("Incidencia de conducta registrada");
    },
    onError: (e) => toast.error("Error al guardar: " + e.message)
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Buscar por empleado..." 
              className="pl-8 w-64" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={() => { setEditingIncident(null); setShowForm(true); }} className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Falta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-orange-800">Faltas Leves</p>
              <p className="text-2xl font-bold text-orange-900">
                {conductIncidents.filter(i => i.gravedad === "Leve").length}
              </p>
            </div>
            <Gavel className="w-8 h-8 text-orange-300" />
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-red-800">Faltas Graves/Muy Graves</p>
              <p className="text-2xl font-bold text-red-900">
                {conductIncidents.filter(i => ["Grave", "Muy Grave"].includes(i.gravedad)).length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-300" />
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-slate-800">Total Expedientes</p>
              <p className="text-2xl font-bold text-slate-900">{conductIncidents.length}</p>
            </div>
            <FileText className="w-8 h-8 text-slate-300" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro de Incumplimientos y Sanciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Gravedad</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead className="text-right">Gestión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No hay registros de conducta
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(incident.fecha_hora), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getEmployeeName(incident.employee_id)}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        incident.gravedad === "Leve" ? "bg-yellow-100 text-yellow-800" :
                        incident.gravedad === "Grave" ? "bg-orange-100 text-orange-800" :
                        "bg-red-100 text-red-800"
                      }>
                        {incident.gravedad}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={incident.descripcion}>
                      {incident.descripcion}
                    </TableCell>
                    <TableCell>
                      {incident.medidas_inmediatas || "-"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowLetter(incident)}>
                        <Printer className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingIncident(incident); setShowForm(true); }}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingIncident ? "Editar Falta" : "Registrar Nueva Falta de Conducta"}</DialogTitle>
          </DialogHeader>
          <ConductForm 
            initialData={editingIncident} 
            employees={employees} 
            onSubmit={(data) => saveMutation.mutate(data)} 
            onCancel={() => setShowForm(false)}
            isSubmitting={saveMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Letter Dialog */}
      {showLetter && (
        <Dialog open={!!showLetter} onOpenChange={() => setShowLetter(null)}>
          <DialogContent className="max-w-3xl h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Carta de Comunicación de Incumplimiento</DialogTitle>
            </DialogHeader>
            <SanctionLetter incident={showLetter} employee={employees.find(e => String(e.id) === String(showLetter.employee_id))} />
            <DialogFooter>
              <Button onClick={() => window.print()}>Imprimir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ConductForm({ initialData, employees, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState(initialData || {
    employee_id: "",
    fecha_hora: new Date().toISOString().slice(0, 16),
    gravedad: "Leve",
    descripcion: "",
    medidas_inmediatas: "", // Usado como "Acción/Sanción propuesta"
    lugar: "Planta",
    testigos: "" // Guardaremos esto en 'causas' o un campo libre si no existe
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Empleado</Label>
          <Select 
            value={String(formData.employee_id)} 
            onValueChange={(val) => setFormData({...formData, employee_id: val})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map(e => (
                <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Fecha y Hora</Label>
          <Input 
            type="datetime-local" 
            value={formData.fecha_hora} 
            onChange={(e) => setFormData({...formData, fecha_hora: e.target.value})} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Gravedad</Label>
          <Select 
            value={formData.gravedad} 
            onValueChange={(val) => setFormData({...formData, gravedad: val})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Leve">Leve</SelectItem>
              <SelectItem value="Grave">Grave</SelectItem>
              <SelectItem value="Muy Grave">Muy Grave</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Lugar de los hechos</Label>
          <Input 
            value={formData.lugar} 
            onChange={(e) => setFormData({...formData, lugar: e.target.value})} 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descripción de los hechos (Incumplimiento)</Label>
        <Textarea 
          value={formData.descripcion} 
          onChange={(e) => setFormData({...formData, descripcion: e.target.value})} 
          rows={4}
          placeholder="Describa detalladamente qué norma se incumplió y cómo ocurrieron los hechos..."
        />
      </div>

      <div className="space-y-2">
        <Label>Sanción / Medida Propuesta</Label>
        <Input 
          value={formData.medidas_inmediatas} 
          onChange={(e) => setFormData({...formData, medidas_inmediatas: e.target.value})} 
          placeholder="Ej: Amonestación verbal, Carta de advertencia..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting || !formData.employee_id}>
          {isSubmitting ? "Guardando..." : "Guardar Registro"}
        </Button>
      </div>
    </form>
  );
}

function SanctionLetter({ incident, employee }) {
  if (!incident || !employee) return null;

  return (
    <div className="p-8 font-serif text-sm leading-relaxed space-y-6 bg-white text-black border shadow-sm print:shadow-none print:border-0">
      
      {/* HEADER */}
      <div className="border-b-2 border-slate-800 pb-4 mb-6">
        <h1 className="text-xl font-bold text-center">COMUNICACIÓN INTERNA: NOTIFICACIÓN DE MEJORA Y CUMPLIMIENTO</h1>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
        <div className="flex">
          <span className="font-bold w-20">PARA:</span>
          <span>{employee.nombre}</span>
        </div>
        <div className="flex">
          <span className="font-bold w-20">DE:</span>
          <span>Dirección de Operaciones / RRHH</span>
        </div>
        <div className="flex">
          <span className="font-bold w-20">FECHA:</span>
          <span>{format(new Date(), "dd/MM/yyyy", { locale: es })}</span>
        </div>
        <div className="flex col-span-2 mt-2">
          <span className="font-bold w-20">ASUNTO:</span>
          <span className="font-semibold underline">Plan de alineación con Normas Internas, Seguridad e ISO/GMP</span>
        </div>
      </div>

      {/* 1. ANTECEDENTES */}
      <div>
        <h2 className="font-bold text-base mb-2 border-b border-slate-300">1. ANTECEDENTES Y RECONOCIMIENTO</h2>
        <p className="text-justify mb-2">
          La presente comunicación tiene como fin recordar la importancia del estricto cumplimiento de las Normas Internas de la Organización. 
          Es mandatorio señalar que dichas normas son de conocimiento público dentro de la empresa, habiendo sido recibidas, leídas y aceptadas formalmente por usted.
        </p>
        <p className="text-justify">
          Nuestra operatividad depende del respeto a los acuerdos que todos los empleados firmamos al integrarnos al equipo, garantizando así un ambiente de trabajo ordenado y profesional.
        </p>
      </div>

      {/* 2. PUNTOS DE OBSERVACIÓN */}
      <div>
        <h2 className="font-bold text-base mb-2 border-b border-slate-300">2. PUNTOS DE OBSERVACIÓN Y CONTROL TÉCNICO</h2>
        <p className="mb-2">Se ha observado la necesidad de reforzar su desempeño en las siguientes áreas clave, en relación a los hechos observados el <strong>{format(new Date(incident.fecha_hora), "dd/MM/yyyy")}</strong>:</p>
        
        <div className="bg-slate-50 p-3 border border-slate-200 mb-4 italic text-xs">
          "{incident.descripcion}"
        </div>

        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Normas Internas de Conducta:</strong> Respeto a los procedimientos generales, horarios y directrices de comportamiento que rigen a todo el personal.
          </li>
          <li>
            <strong>Seguridad Industrial y Riesgos Laborales:</strong> Uso correcto de los Equipos de Protección Personal (EPP) y cumplimiento de las medidas preventivas para evitar accidentes.
          </li>
          <li>
            <strong>Normas GMP (Buenas Prácticas de Manufactura):</strong> Mantenimiento de los estándares de higiene y manipulación requeridos para la integridad del producto.
          </li>
          <li>
            <strong>Gestión de Calidad ISO 9001:</strong> Cumplimiento de los procesos documentados para asegurar la excelencia en el servicio/producto final.
          </li>
        </ul>
      </div>

      {/* 3. COMPROMISO */}
      <div>
        <h2 className="font-bold text-base mb-2 border-b border-slate-300">3. COMPROMISO DE MEJORA</h2>
        <p className="text-justify mb-2">
          Confiamos en su compromiso con la organización y en su capacidad para retomar los estándares que su posición requiere. 
          Esta notificación no tiene un fin punitivo inmediato, sino que busca servir como una guía de rectificación y apoyo.
        </p>
        <p className="text-justify font-medium">
          Le instamos a cumplir con lo establecido en las normas que usted ya conoce y aceptó. No obstante, es importante mencionar que la persistencia en estas omisiones podría derivar en la necesidad de aplicar medidas administrativas adicionales de acuerdo con nuestras políticas, con el fin de resguardar la seguridad y calidad de todo el equipo.
        </p>
      </div>

      {/* CUADRO DE SEGUIMIENTO */}
      <div className="mt-4">
        <h3 className="font-bold text-sm mb-2 text-center bg-slate-100 py-1 border border-slate-300">CUADRO DE SEGUIMIENTO DE COMPROMISOS</h3>
        <table className="w-full border-collapse border border-slate-400 text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-400 p-2 text-left w-1/3">Área de Cumplimiento</th>
              <th className="border border-slate-400 p-2 text-center w-1/4">Estatus Actual</th>
              <th className="border border-slate-400 p-2 text-left">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-400 p-2 font-medium">Normas Internas</td>
              <td className="border border-slate-400 p-2 text-center text-red-600 font-bold">REVISIÓN</td>
              <td className="border border-slate-400 p-2">Conducta reportada: {incident.gravedad}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-2 font-medium">Seguridad Industrial</td>
              <td className="border border-slate-400 p-2 text-center">SEGUIMIENTO</td>
              <td className="border border-slate-400 p-2">Verificar uso de EPP y protocolos</td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-2 font-medium">GMP / ISO 9001</td>
              <td className="border border-slate-400 p-2 text-center">SEGUIMIENTO</td>
              <td className="border border-slate-400 p-2">Asegurar integridad del proceso</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FIRMAS */}
      <div className="mt-8 pt-4 border-t-2 border-slate-200">
        <p className="text-xs text-justify mb-8 italic">
          <strong>RECEPCIÓN Y CONFORMIDAD:</strong> Confirmo que he recibido esta orientación y entiendo que el cumplimiento de las normas internas y técnicas es fundamental para mi desarrollo profesional y la seguridad de la planta.
        </p>

        <div className="flex justify-between items-end gap-8">
          <div className="text-center w-1/2">
            <div className="border-b border-black mb-2 h-16"></div>
            <p className="font-bold">Firma del Empleado</p>
            <p className="text-xs">DNI/ID: ______________________</p>
            <p className="text-xs mt-1">Fecha: _____/_____/________</p>
          </div>
          <div className="text-center w-1/2">
            <div className="border-b border-black mb-2 h-16"></div>
            <p className="font-bold">Firma de Responsable Dpto. y/o RRHH</p>
            <p className="text-xs mt-4">Fecha: {format(new Date(), "dd/MM/yyyy")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
