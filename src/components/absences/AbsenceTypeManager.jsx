import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Settings, Shield, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import AbsenceTypeForm from "./AbsenceTypeForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AbsenceTypeManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [viewMode, setViewMode] = useState("cards");
  const queryClient = useQueryClient();

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AbsenceType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absenceTypes'] });
      toast.success("Tipo de ausencia eliminado");
    },
  });

  const handleEdit = (type) => {
    setEditingType(type);
    setShowForm(true);
  };

  const handleDelete = (type) => {
    if (window.confirm(`¿Eliminar tipo "${type.nombre}"?`)) {
      deleteMutation.mutate(type.id);
    }
  };

  const sortedAbsenceTypes = [...absenceTypes].sort((a, b) => (a?.orden || 0) - (b?.orden || 0));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Tipos de Ausencia y Permisos
        </h2>
        <div className="flex gap-2">
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="cards">Tarjetas</TabsTrigger>
              <TabsTrigger value="table">Tabla</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Tipo
          </Button>
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAbsenceTypes.map((type) => (
            <Card 
              key={type.id} 
              className={`border-l-4 shadow-lg hover:shadow-xl transition-shadow ${!type?.activo ? 'opacity-50' : ''}`} 
              style={{ borderLeftColor: type?.color || '#3B82F6' }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{type?.nombre}</CardTitle>
                    <Badge variant="outline" className="text-xs mb-2">{type?.codigo}</Badge>
                    <div className="flex flex-wrap gap-2 text-xs mt-2">
                      {type?.remunerada && <Badge className="bg-green-100 text-green-800">Remunerada</Badge>}
                      {type?.no_consume_vacaciones && (
                        <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          No Consume Vacaciones
                        </Badge>
                      )}
                      {type?.requiere_aprobacion && <Badge className="bg-orange-100 text-orange-800">Requiere Aprobación</Badge>}
                      {type?.es_critica && <Badge className="bg-red-100 text-red-800">Crítica</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(type)} className="hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {type?.descripcion && (
                  <p className="text-sm text-slate-600 mb-2">{type.descripcion}</p>
                )}
                
                <div className="space-y-1 text-xs">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">{type?.categoria_principal}</Badge>
                    <Badge variant="outline" className="text-xs">{type?.subcategoria}</Badge>
                  </div>
                  
                  {type?.duracion_descripcion && (
                    <p className="text-slate-600"><strong>Duración:</strong> {type.duracion_descripcion}</p>
                  )}

                  {type?.no_consume_vacaciones && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                      <p className="text-amber-800 font-semibold flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Protección de Vacaciones
                      </p>
                      <p className="text-amber-700 text-[10px] mt-1">
                        Si coincide con vacaciones colectivas, genera días pendientes para el empleado
                      </p>
                    </div>
                  )}
                  
                  {type?.articulo_referencia && (
                    <p className="text-slate-500 italic">{type.articulo_referencia}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Características</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAbsenceTypes.map((type) => (
                  <TableRow key={type.id} className={!type?.activo ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: type?.color || '#3B82F6' }}
                        />
                        <span className="font-semibold">{type?.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{type?.codigo}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">{type?.categoria_principal}</Badge>
                        <Badge variant="outline" className="text-xs block w-fit">{type?.subcategoria}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {type?.remunerada && (
                          <Badge className="bg-green-100 text-green-800 text-xs">Remunerada</Badge>
                        )}
                        {type?.no_consume_vacaciones && (
                          <Badge className="bg-amber-100 text-amber-800 text-xs flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            No Consume Vacaciones
                          </Badge>
                        )}
                        {type?.requiere_aprobacion && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">Requiere Aprobación</Badge>
                        )}
                        {type?.es_critica && (
                          <Badge className="bg-red-100 text-red-800 text-xs">Crítica</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{type?.duracion_descripcion || "-"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(type)} 
                          className="hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {sortedAbsenceTypes.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Settings className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay tipos de ausencia configurados</p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              Crear Primer Tipo
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <AbsenceTypeForm
          type={editingType}
          onClose={() => {
            setShowForm(false);
            setEditingType(null);
          }}
        />
      )}
    </div>
  );
}