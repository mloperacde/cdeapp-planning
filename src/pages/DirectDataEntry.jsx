import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DirectDataEntry() {
  const [employeeData, setEmployeeData] = useState({
    nombre: "",
    tipo_jornada: "Jornada Completa",
    tipo_turno: "Rotativo",
    disponibilidad: "Disponible",
    estado_empleado: "Alta"
  });
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const createEmployeeMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setResult({ success: true, message: "Empleado creado exitosamente" });
      // Reset form
      setEmployeeData({
        nombre: "",
        tipo_jornada: "Jornada Completa",
        tipo_turno: "Rotativo",
        disponibilidad: "Disponible",
        estado_empleado: "Alta"
      });
    },
    onError: (error) => {
      setResult({ success: false, message: error.message });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeData.nombre) {
      setResult({ success: false, message: "El nombre es obligatorio" });
      return;
    }
    setResult(null);
    createEmployeeMutation.mutate(employeeData);
  };

  const handleChange = (field, value) => {
    setEmployeeData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("DataImport")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Importación
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-600" />
            Entrada Directa de Datos
          </h1>
          <p className="text-slate-600 mt-1">
            Alternativa: Crea empleados uno por uno manualmente
          </p>
        </div>

        <Card>
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Crear Nuevo Empleado</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basico">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basico">Datos Básicos</TabsTrigger>
                  <TabsTrigger value="laboral">Información Laboral</TabsTrigger>
                  <TabsTrigger value="personal">Datos Personales</TabsTrigger>
                </TabsList>

                <TabsContent value="basico" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre Completo *</Label>
                      <Input
                        id="nombre"
                        value={employeeData.nombre}
                        onChange={(e) => handleChange('nombre', e.target.value)}
                        placeholder="Juan Pérez García"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="codigo">Código Empleado</Label>
                      <Input
                        id="codigo"
                        value={employeeData.codigo_empleado || ""}
                        onChange={(e) => handleChange('codigo_empleado', e.target.value)}
                        placeholder="EMP001"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipo_jornada">Tipo de Jornada *</Label>
                      <Select
                        value={employeeData.tipo_jornada}
                        onValueChange={(value) => handleChange('tipo_jornada', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Jornada Completa">Jornada Completa</SelectItem>
                          <SelectItem value="Jornada Parcial">Jornada Parcial</SelectItem>
                          <SelectItem value="Reducción de Jornada">Reducción de Jornada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipo_turno">Tipo de Turno *</Label>
                      <Select
                        value={employeeData.tipo_turno}
                        onValueChange={(value) => handleChange('tipo_turno', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rotativo">Rotativo</SelectItem>
                          <SelectItem value="Fijo Mañana">Fijo Mañana</SelectItem>
                          <SelectItem value="Fijo Tarde">Fijo Tarde</SelectItem>
                          <SelectItem value="Turno Partido">Turno Partido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Select
                        value={employeeData.estado_empleado}
                        onValueChange={(value) => handleChange('estado_empleado', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Alta">Alta</SelectItem>
                          <SelectItem value="Baja">Baja</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="disponibilidad">Disponibilidad</Label>
                      <Select
                        value={employeeData.disponibilidad}
                        onValueChange={(value) => handleChange('disponibilidad', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Disponible">Disponible</SelectItem>
                          <SelectItem value="Ausente">Ausente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="laboral" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="departamento">Departamento</Label>
                      <Input
                        id="departamento"
                        value={employeeData.departamento || ""}
                        onChange={(e) => handleChange('departamento', e.target.value)}
                        placeholder="FABRICACION"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="puesto">Puesto</Label>
                      <Input
                        id="puesto"
                        value={employeeData.puesto || ""}
                        onChange={(e) => handleChange('puesto', e.target.value)}
                        placeholder="Operario"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="categoria">Categoría</Label>
                      <Input
                        id="categoria"
                        value={employeeData.categoria || ""}
                        onChange={(e) => handleChange('categoria', e.target.value)}
                        placeholder="Categoría 1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="equipo">Equipo</Label>
                      <Input
                        id="equipo"
                        value={employeeData.equipo || ""}
                        onChange={(e) => handleChange('equipo', e.target.value)}
                        placeholder="Equipo Turno Isa"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fecha_alta">Fecha de Alta</Label>
                      <Input
                        id="fecha_alta"
                        type="date"
                        value={employeeData.fecha_alta || ""}
                        onChange={(e) => handleChange('fecha_alta', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipo_contrato">Tipo de Contrato</Label>
                      <Input
                        id="tipo_contrato"
                        value={employeeData.tipo_contrato || ""}
                        onChange={(e) => handleChange('tipo_contrato', e.target.value)}
                        placeholder="Indefinido"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="personal" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dni">DNI/NIE</Label>
                      <Input
                        id="dni"
                        value={employeeData.dni || ""}
                        onChange={(e) => handleChange('dni', e.target.value)}
                        placeholder="12345678A"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nuss">NUSS</Label>
                      <Input
                        id="nuss"
                        value={employeeData.nuss || ""}
                        onChange={(e) => handleChange('nuss', e.target.value)}
                        placeholder="12-3456789012-34"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={employeeData.email || ""}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="empleado@email.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono Móvil</Label>
                      <Input
                        id="telefono"
                        value={employeeData.telefono_movil || ""}
                        onChange={(e) => handleChange('telefono_movil', e.target.value)}
                        placeholder="600123456"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                      <Input
                        id="fecha_nacimiento"
                        type="date"
                        value={employeeData.fecha_nacimiento || ""}
                        onChange={(e) => handleChange('fecha_nacimiento', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sexo">Sexo</Label>
                      <Select
                        value={employeeData.sexo || ""}
                        onValueChange={(value) => handleChange('sexo', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Femenino">Femenino</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={createEmployeeMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createEmployeeMutation.isPending ? "Guardando..." : "Crear Empleado"}
                </Button>
              </div>
            </form>

            {result && (
              <div className={`mt-4 p-4 rounded-lg border ${
                result.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {result.message}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}