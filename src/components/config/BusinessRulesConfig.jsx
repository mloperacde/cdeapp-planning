import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Gavel, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BusinessRulesConfig() {
  const [rules, setRules] = useState([
    {
      id: "1",
      nombre: "Asignación Automática de Taquilla",
      tipo: "auto_assign",
      condicion: "nuevo_empleado",
      accion: "asignar_taquilla_disponible",
      activa: true,
      descripcion: "Cuando se crea un nuevo empleado, asignar automáticamente una taquilla disponible"
    },
    {
      id: "2",
      nombre: "Validación Horario Jornada",
      tipo: "validation",
      condicion: "horas_semanales",
      accion: "validar_maximo_40h",
      activa: true,
      descripcion: "Validar que las horas semanales no excedan 40 horas para jornada completa"
    },
    {
      id: "3",
      nombre: "Alerta Contrato Temporal",
      tipo: "alert",
      condicion: "contrato_expira_30_dias",
      accion: "notificar_rrhh",
      activa: true,
      descripcion: "Notificar a RRHH cuando un contrato temporal expire en 30 días"
    }
  ]);

  const [newRule, setNewRule] = useState({
    nombre: "",
    tipo: "validation",
    condicion: "",
    accion: "",
    descripcion: ""
  });

  const ruleTypes = [
    { value: "validation", label: "Validación", color: "blue" },
    { value: "auto_assign", label: "Asignación Automática", color: "green" },
    { value: "alert", label: "Alerta", color: "amber" },
    { value: "calculation", label: "Cálculo Automático", color: "purple" },
    { value: "workflow", label: "Flujo de Trabajo", color: "indigo" }
  ];

  const conditionOptions = {
    validation: [
      "horas_semanales", "fecha_contrato", "datos_obligatorios", "duplicado_codigo"
    ],
    auto_assign: [
      "nuevo_empleado", "cambio_departamento", "cambio_turno"
    ],
    alert: [
      "contrato_expira_30_dias", "alta_absentismo", "sin_taquilla"
    ],
    calculation: [
      "calcular_absentismo", "calcular_antiguedad", "calcular_vacaciones"
    ],
    workflow: [
      "solicitud_aprobacion", "cambio_estado", "finalizar_onboarding"
    ]
  };

  const actionOptions = {
    validation: [
      "bloquear_guardado", "mostrar_advertencia", "validar_maximo_40h"
    ],
    auto_assign: [
      "asignar_taquilla_disponible", "asignar_maquina_experiencia", "asignar_equipo_balanceado"
    ],
    alert: [
      "notificar_rrhh", "notificar_responsable", "crear_tarea"
    ],
    calculation: [
      "actualizar_campo", "recalcular_kpi", "actualizar_balance"
    ],
    workflow: [
      "enviar_aprobacion", "cambiar_estado", "enviar_email"
    ]
  };

  const addRule = () => {
    if (!newRule.nombre || !newRule.condicion || !newRule.accion) return;
    setRules([...rules, { ...newRule, id: Date.now().toString(), activa: true }]);
    setNewRule({ nombre: "", tipo: "validation", condicion: "", accion: "", descripcion: "" });
  };

  const deleteRule = (id) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const toggleRule = (id) => {
    setRules(rules.map(r => r.id === id ? { ...r, activa: !r.activa } : r));
  };

  const getRuleTypeColor = (tipo) => {
    const found = ruleTypes.find(t => t.value === tipo);
    return found ? found.color : "slate";
  };

  return (
    <div className="space-y-6">
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-900 text-sm">
          Las reglas de negocio automatizan procesos y validaciones. Úsalas con cuidado para asegurar la integridad de los datos.
        </AlertDescription>
      </Alert>

      {/* Lista de Reglas */}
      <Card className="border-indigo-200 bg-indigo-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gavel className="w-5 h-5 text-indigo-600" />
            Reglas Activas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No hay reglas configuradas</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className={`p-4 bg-white rounded-lg border-2 ${rule.activa ? 'border-green-200' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={`bg-${getRuleTypeColor(rule.tipo)}-600`}>
                          {ruleTypes.find(t => t.value === rule.tipo)?.label || rule.tipo}
                        </Badge>
                        <span className="font-semibold text-slate-900">{rule.nombre}</span>
                        <Badge variant="outline" className={rule.activa ? "bg-green-50 text-green-700 border-green-300" : "bg-slate-100 text-slate-600"}>
                          {rule.activa ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{rule.descripcion}</p>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span><strong>Condición:</strong> {rule.condicion}</span>
                        <span><strong>Acción:</strong> {rule.accion}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRule(rule.id)}
                        className={rule.activa ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"}
                      >
                        {rule.activa ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRule(rule.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Añadir Nueva Regla */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-600" />
            Crear Nueva Regla
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Nombre de la Regla</Label>
              <Input
                placeholder="Ej: Validar duplicados de código empleado"
                value={newRule.nombre}
                onChange={(e) => setNewRule({...newRule, nombre: e.target.value})}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tipo de Regla</Label>
              <Select 
                value={newRule.tipo} 
                onValueChange={(value) => setNewRule({...newRule, tipo: value, condicion: "", accion: ""})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ruleTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Condición (Cuándo se ejecuta)</Label>
              <Select 
                value={newRule.condicion} 
                onValueChange={(value) => setNewRule({...newRule, condicion: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona condición" />
                </SelectTrigger>
                <SelectContent>
                  {(conditionOptions[newRule.tipo] || []).map((cond) => (
                    <SelectItem key={cond} value={cond}>
                      {cond.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Acción (Qué se hace)</Label>
              <Select 
                value={newRule.accion} 
                onValueChange={(value) => setNewRule({...newRule, accion: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona acción" />
                </SelectTrigger>
                <SelectContent>
                  {(actionOptions[newRule.tipo] || []).map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Descripción</Label>
              <Input
                placeholder="Describe qué hace esta regla y cuándo se aplica"
                value={newRule.descripcion}
                onChange={(e) => setNewRule({...newRule, descripcion: e.target.value})}
                className="text-sm"
              />
            </div>
          </div>

          <Button onClick={addRule} className="w-full bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Crear Regla
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}