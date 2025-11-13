import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AttendanceConfig({ config }) {
  const [formData, setFormData] = useState({
    nombre_configuracion: "Configuración General",
    tolerancia_entrada_minutos: 10,
    tolerancia_salida_minutos: 10,
    marcar_ausente_despues_de_minutos: 60,
    auto_actualizar_disponibilidad: true,
    crear_ausencia_automatica: true,
    notificar_ausencias: true,
    notificar_retrasos: true,
    notificar_retrasos_solo_si_mas_de_minutos: 15,
    destinatarios_notificaciones: [],
    departamentos_estrictos: [],
    tolerancia_reducida_minutos: 5,
    activar_predicciones_ml: true,
    umbral_alertas_patron_retrasos: 3,
    activo: true
  });

  const [newRecipient, setNewRecipient] = useState({ nombre: "", email: "", rol: "" });
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  useEffect(() => {
    if (config) {
      setFormData({
        ...config,
        destinatarios_notificaciones: config.destinatarios_notificaciones || [],
        departamentos_estrictos: config.departamentos_estrictos || []
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (config?.id) {
        return base44.entities.AttendanceConfig.update(config.id, data);
      }
      return base44.entities.AttendanceConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceConfig'] });
      toast.success("Configuración guardada");
    },
  });

  const departments = [...new Set(employees.map(e => e.departamento).filter(Boolean))];

  const handleAddRecipient = () => {
    if (!newRecipient.email) {
      toast.error("Email requerido");
      return;
    }

    setFormData({
      ...formData,
      destinatarios_notificaciones: [
        ...formData.destinatarios_notificaciones,
        { ...newRecipient }
      ]
    });
    setNewRecipient({ nombre: "", email: "", rol: "" });
  };

  const handleRemoveRecipient = (index) => {
    setFormData({
      ...formData,
      destinatarios_notificaciones: formData.destinatarios_notificaciones.filter((_, i) => i !== index)
    });
  };

  const handleToggleDepartment = (dept) => {
    const current = formData.departamentos_estrictos || [];
    if (current.includes(dept)) {
      setFormData({
        ...formData,
        departamentos_estrictos: current.filter(d => d !== dept)
      });
    } else {
      setFormData({
        ...formData,
        departamentos_estrictos: [...current, dept]
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Configuración General</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tolerancia Entrada (min)</Label>
              <Input
                type="number"
                min="0"
                value={formData.tolerancia_entrada_minutos}
                onChange={(e) => setFormData({
                  ...formData,
                  tolerancia_entrada_minutos: parseInt(e.target.value)
                })}
              />
            </div>

            <div className="space-y-2">
              <Label>Tolerancia Salida (min)</Label>
              <Input
                type="number"
                min="0"
                value={formData.tolerancia_salida_minutos}
                onChange={(e) => setFormData({
                  ...formData,
                  tolerancia_salida_minutos: parseInt(e.target.value)
                })}
              />
            </div>

            <div className="space-y-2">
              <Label>Marcar Ausente Después de (min)</Label>
              <Input
                type="number"
                min="0"
                value={formData.marcar_ausente_despues_de_minutos}
                onChange={(e) => setFormData({
                  ...formData,
                  marcar_ausente_despues_de_minutos: parseInt(e.target.value)
                })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-update"
                checked={formData.auto_actualizar_disponibilidad}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  auto_actualizar_disponibilidad: checked
                })}
              />
              <label htmlFor="auto-update" className="text-sm font-medium">
                Auto-actualizar disponibilidad de empleados
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-absence"
                checked={formData.crear_ausencia_automatica}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  crear_ausencia_automatica: checked
                })}
              />
              <label htmlFor="auto-absence" className="text-sm font-medium">
                Crear registro de ausencia automáticamente
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-absences"
                checked={formData.notificar_ausencias}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  notificar_ausencias: checked
                })}
              />
              <label htmlFor="notify-absences" className="text-sm font-medium">
                Notificar ausencias
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-delays"
                checked={formData.notificar_retrasos}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  notificar_retrasos: checked
                })}
              />
              <label htmlFor="notify-delays" className="text-sm font-medium">
                Notificar retrasos
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="ml-predictions"
                checked={formData.activar_predicciones_ml}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  activar_predicciones_ml: checked
                })}
              />
              <label htmlFor="ml-predictions" className="text-sm font-medium">
                Activar predicciones ML de rotación
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Destinatarios de Notificaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Nombre"
              value={newRecipient.nombre}
              onChange={(e) => setNewRecipient({ ...newRecipient, nombre: e.target.value })}
            />
            <Input
              placeholder="Email"
              type="email"
              value={newRecipient.email}
              onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
            />
            <Input
              placeholder="Rol (ej: Jefe de Turno)"
              value={newRecipient.rol}
              onChange={(e) => setNewRecipient({ ...newRecipient, rol: e.target.value })}
            />
            <Button type="button" onClick={handleAddRecipient}>
              <Plus className="w-4 h-4 mr-2" />
              Añadir
            </Button>
          </div>

          <div className="space-y-2">
            {formData.destinatarios_notificaciones?.map((dest, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div>
                  <p className="font-semibold text-sm">{dest.nombre}</p>
                  <p className="text-xs text-slate-600">{dest.email} - {dest.rol}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveRecipient(index)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Departamentos con Tolerancia Estricta</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-4">
            <Label>Tolerancia Reducida (minutos)</Label>
            <Input
              type="number"
              min="0"
              value={formData.tolerancia_reducida_minutos}
              onChange={(e) => setFormData({
                ...formData,
                tolerancia_reducida_minutos: parseInt(e.target.value)
              })}
              className="w-32"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {departments.map((dept) => (
              <div
                key={dept}
                className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.departamentos_estrictos?.includes(dept)
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
                onClick={() => handleToggleDepartment(dept)}
              >
                <Checkbox
                  checked={formData.departamentos_estrictos?.includes(dept)}
                  onCheckedChange={() => handleToggleDepartment(dept)}
                />
                <span className="ml-2 text-sm font-medium">{dept}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700"
          disabled={saveMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </form>
  );
}