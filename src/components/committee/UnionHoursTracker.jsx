import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function UnionHoursTracker({ committeeMembers, employees }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    committee_member_id: "",
    employee_id: "",
    fecha: format(new Date(), 'yyyy-MM-dd'),
    horas_utilizadas: 0,
    motivo: "",
    actividad: "",
    notas: ""
  });

  const queryClient = useQueryClient();

  const { data: hoursRecords } = useQuery({
    queryKey: ['unionHoursRecords'],
    queryFn: () => base44.entities.UnionHoursRecord.list('-fecha'),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.UnionHoursRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unionHoursRecords'] });
      toast.success("Registro de horas guardado");
      setShowForm(false);
      setFormData({
        committee_member_id: "",
        employee_id: "",
        fecha: format(new Date(), 'yyyy-MM-dd'),
        horas_utilizadas: 0,
        motivo: "",
        actividad: "",
        notas: ""
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Desconocido";
  };

  const activeMembersWithHours = committeeMembers.filter(m => 
    m.activo && m.horas_sindicales_mensuales > 0
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Control de Horas Sindicales
            </CardTitle>
            <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Registrar Uso
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Miembro del Comité *</Label>
                  <Select
                    value={formData.committee_member_id}
                    onValueChange={(value) => {
                      const member = activeMembersWithHours.find(m => m.id === value);
                      setFormData({ 
                        ...formData, 
                        committee_member_id: value,
                        employee_id: member?.employee_id || ""
                      });
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar miembro" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeMembersWithHours.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {getEmployeeName(member.employee_id)} - {member.tipo_comite}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Horas Utilizadas *</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.horas_utilizadas}
                    onChange={(e) => setFormData({ ...formData, horas_utilizadas: parseFloat(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Actividad *</Label>
                  <Select
                    value={formData.actividad}
                    onValueChange={(value) => setFormData({ ...formData, actividad: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar actividad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Reunión Comité">Reunión Comité</SelectItem>
                      <SelectItem value="Negociación Colectiva">Negociación Colectiva</SelectItem>
                      <SelectItem value="Asesoramiento Trabajadores">Asesoramiento Trabajadores</SelectItem>
                      <SelectItem value="Formación Sindical">Formación Sindical</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Motivo *</Label>
                  <Textarea
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    required
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {activeMembersWithHours.map((member) => {
              const memberRecords = hoursRecords.filter(r => r.committee_member_id === member.id);
              const thisMonth = new Date();
              const monthlyRecords = memberRecords.filter(r => {
                const recordDate = new Date(r.fecha);
                return recordDate.getMonth() === thisMonth.getMonth() && 
                       recordDate.getFullYear() === thisMonth.getFullYear();
              });
              const hoursUsed = monthlyRecords.reduce((sum, r) => sum + (r.horas_utilizadas || 0), 0);
              const remaining = member.horas_sindicales_mensuales - hoursUsed;
              const percentage = (hoursUsed / member.horas_sindicales_mensuales) * 100;

              return (
                <Card key={member.id} className="bg-slate-50">
                  <CardContent className="p-4">
                    <div className="font-semibold text-slate-900 mb-2">
                      {getEmployeeName(member.employee_id)}
                    </div>
                    <div className="text-xs text-slate-600 mb-3">{member.tipo_comite}</div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Usadas:</span>
                        <span className="font-bold">{hoursUsed}h</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Disponibles:</span>
                        <span className="font-bold text-green-600">{remaining}h</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            percentage > 90 ? 'bg-red-600' : 
                            percentage > 70 ? 'bg-amber-600' : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 mb-3">Historial Reciente</h3>
            {hoursRecords.slice(0, 10).map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{getEmployeeName(record.employee_id)}</div>
                  <div className="text-sm text-slate-600">{record.motivo}</div>
                  <div className="text-xs text-slate-500">{record.actividad}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">{record.horas_utilizadas}h</div>
                  <div className="text-xs text-slate-500">
                    {format(new Date(record.fecha), "dd/MM/yyyy", { locale: es })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}