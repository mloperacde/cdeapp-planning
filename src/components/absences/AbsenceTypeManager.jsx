import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";
import AbsenceTypeForm from "./AbsenceTypeForm";

export default function AbsenceTypeManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const queryClient = useQueryClient();

  const { data: absenceTypes } = useQuery({
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Tipos de Ausencia Personalizados
        </h2>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Tipo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {absenceTypes.map((type) => (
          <Card key={type.id} className={`border-l-4 ${!type.activo ? 'opacity-50' : ''}`} style={{ borderLeftColor: type.color || '#3B82F6' }}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">{type.nombre}</CardTitle>
                  <Badge variant="outline" className="text-xs">{type.codigo}</Badge>
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
              <p className="text-sm text-slate-600">{type.descripcion}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {type.remunerada && <Badge className="bg-green-100 text-green-800">Remunerada</Badge>}
                {type.requiere_aprobacion && <Badge className="bg-orange-100 text-orange-800">Requiere Aprobación</Badge>}
                {type.es_critica && <Badge className="bg-red-100 text-red-800">Crítica</Badge>}
                <Badge variant="outline">{type.categoria}</Badge>
              </div>
              {type.duracion_descripcion && (
                <p className="text-xs text-slate-500 mt-2">Duración: {type.duracion_descripcion}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {absenceTypes.length === 0 && (
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