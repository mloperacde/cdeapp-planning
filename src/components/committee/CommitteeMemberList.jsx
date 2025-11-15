import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Award, Phone } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function CommitteeMemberList({ members, employees, onEdit }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CommitteeMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committeeMembers'] });
      toast.success("Miembro eliminado");
    },
  });

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este miembro del comité?')) {
      deleteMutation.mutate(id);
    }
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Desconocido";
  };

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-slate-500">
          No hay miembros en comités
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {members.map((member) => (
        <Card key={member.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900">
                  {getEmployeeName(member.employee_id)}
                </h3>
                {member.cargo && (
                  <p className="text-sm text-slate-600">{member.cargo}</p>
                )}
              </div>
              {member.activo ? (
                <Badge className="bg-green-600 text-white">Activo</Badge>
              ) : (
                <Badge className="bg-slate-400 text-white">Inactivo</Badge>
              )}
            </div>

            <div className="space-y-2 mb-3">
              {member.tipos_comite && member.tipos_comite.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {member.tipos_comite.map((tipo, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tipo}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                <span className="text-slate-600">Desde:</span>
                <span className="font-semibold">
                  {format(new Date(member.fecha_inicio), "dd/MM/yyyy", { locale: es })}
                </span>
              </div>

              {member.horas_sindicales_mensuales > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Horas sindicales:</span>
                  <Badge variant="outline">
                    {member.horas_sindicales_mensuales}h/mes
                  </Badge>
                </div>
              )}

              {member.contacto_emergencia_comite && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-600" />
                  <span className="text-slate-600">{member.contacto_emergencia_comite}</span>
                </div>
              )}

              {member.funciones && (
                <div className="mt-2 p-2 bg-slate-50 rounded text-xs">
                  {member.funciones.substring(0, 100)}
                  {member.funciones.length > 100 && "..."}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(member)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(member.id)}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}