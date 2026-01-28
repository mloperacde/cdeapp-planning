import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, Trash2, Clock } from "lucide-react";

export default function WorkScheduleConfig() {
  const [jornadaTypes, setJornadaTypes] = useState([
    { id: "1", nombre: "Jornada Completa", horas: 40, descripcion: "Jornada completa de 40 horas semanales" },
    { id: "2", nombre: "Jornada Parcial", horas: 30, descripcion: "Jornada parcial de 30 horas semanales" },
    { id: "3", nombre: "Reducción de Jornada", horas: 35, descripcion: "Reducción de jornada a 35 horas" }
  ]);

  const [horarios, setHorarios] = useState([
    { id: "1", nombre: "Rotativo", tipo: "rotativo", mananaInicio: "07:00", mananaFin: "15:00", tardeInicio: "14:00", tardeFin: "22:00" },
    { id: "2", nombre: "Fijo Mañana", tipo: "fijo", inicio: "07:00", fin: "15:00" },
    { id: "3", nombre: "Fijo Tarde", tipo: "fijo", inicio: "14:00", fin: "22:00" },
    { id: "4", nombre: "Turno Partido", tipo: "partido", entrada1: "09:00", salida1: "13:00", entrada2: "16:00", salida2: "20:00" }
  ]);

  const [newJornada, setNewJornada] = useState({ nombre: "", horas: 40, descripcion: "" });
  const [newHorario, setNewHorario] = useState({ nombre: "", tipo: "fijo", inicio: "07:00", fin: "15:00" });

  const addJornada = () => {
    if (!newJornada.nombre || !newJornada.horas) return;
    setJornadaTypes([...jornadaTypes, { ...newJornada, id: Date.now().toString() }]);
    setNewJornada({ nombre: "", horas: 40, descripcion: "" });
  };

  const deleteJornada = (id) => {
    setJornadaTypes(jornadaTypes.filter(j => j.id !== id));
  };

  const addHorario = () => {
    if (!newHorario.nombre) return;
    setHorarios([...horarios, { ...newHorario, id: Date.now().toString() }]);
    setNewHorario({ nombre: "", tipo: "fijo", inicio: "07:00", fin: "15:00" });
  };

  const deleteHorario = (id) => {
    setHorarios(horarios.filter(h => h.id !== id));
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Tipos de Jornada */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Tipos de Jornada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {jornadaTypes.map((jornada) => (
              <div key={jornada.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-600">{jornada.horas}h</Badge>
                    <span className="font-semibold text-slate-900">{jornada.nombre}</span>
                  </div>
                  {jornada.descripcion && (
                    <p className="text-xs text-slate-600 mt-1">{jornada.descripcion}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteJornada(jornada.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 mt-3">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Añadir Nuevo Tipo de Jornada</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                placeholder="Nombre"
                value={newJornada.nombre}
                onChange={(e) => setNewJornada({...newJornada, nombre: e.target.value})}
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="Horas"
                value={newJornada.horas}
                onChange={(e) => setNewJornada({...newJornada, horas: parseInt(e.target.value)})}
                className="text-sm"
              />
              <Input
                placeholder="Descripción"
                value={newJornada.descripcion}
                onChange={(e) => setNewJornada({...newJornada, descripcion: e.target.value})}
                className="text-sm col-span-1"
              />
              <Button onClick={addJornada} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1" />
                Añadir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horarios */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            Horarios y Turnos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {horarios.map((horario) => (
              <div key={horario.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-600">{horario.tipo}</Badge>
                    <span className="font-semibold text-slate-900">{horario.nombre}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex gap-3">
                    {horario.tipo === 'rotativo' && (
                      <>
                        <span>Mañana: {horario.mananaInicio} - {horario.mananaFin}</span>
                        <span>Tarde: {horario.tardeInicio} - {horario.tardeFin}</span>
                      </>
                    )}
                    {horario.tipo === 'fijo' && (
                      <span>{horario.inicio} - {horario.fin}</span>
                    )}
                    {horario.tipo === 'partido' && (
                      <>
                        <span>Entrada 1: {horario.entrada1} - {horario.salida1}</span>
                        <span>Entrada 2: {horario.entrada2} - {horario.salida2}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteHorario(horario.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 mt-3">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Añadir Nuevo Horario</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <Input
                placeholder="Nombre del horario"
                value={newHorario.nombre}
                onChange={(e) => setNewHorario({...newHorario, nombre: e.target.value})}
                className="text-sm"
              />
              <select
                value={newHorario.tipo}
                onChange={(e) => setNewHorario({...newHorario, tipo: e.target.value})}
                className="text-sm border rounded-md px-3"
              >
                <option value="fijo">Fijo</option>
                <option value="rotativo">Rotativo</option>
                <option value="partido">Turno Partido</option>
              </select>
            </div>
            {newHorario.tipo === 'fijo' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  type="time"
                  value={newHorario.inicio}
                  onChange={(e) => setNewHorario({...newHorario, inicio: e.target.value})}
                  className="text-sm"
                />
                <Input
                  type="time"
                  value={newHorario.fin}
                  onChange={(e) => setNewHorario({...newHorario, fin: e.target.value})}
                  className="text-sm"
                />
                <Button onClick={addHorario} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Añadir
                </Button>
              </div>
            )}
            {newHorario.tipo === 'rotativo' && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <Input
                  type="time"
                  placeholder="Mañana inicio"
                  onChange={(e) => setNewHorario({...newHorario, mananaInicio: e.target.value})}
                  className="text-sm"
                />
                <Input
                  type="time"
                  placeholder="Mañana fin"
                  onChange={(e) => setNewHorario({...newHorario, mananaFin: e.target.value})}
                  className="text-sm"
                />
                <Input
                  type="time"
                  placeholder="Tarde inicio"
                  onChange={(e) => setNewHorario({...newHorario, tardeInicio: e.target.value})}
                  className="text-sm"
                />
                <Input
                  type="time"
                  placeholder="Tarde fin"
                  onChange={(e) => setNewHorario({...newHorario, tardeFin: e.target.value})}
                  className="text-sm"
                />
                <Button onClick={addHorario} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Añadir
                </Button>
              </div>
            )}
            {newHorario.tipo === 'partido' && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <Input
                  type="time"
                  placeholder="Entrada 1"
                  onChange={(e) => setNewHorario({...newHorario, entrada1: e.target.value})}
                  className="text-sm"
                />
                <Input
                  type="time"
                  placeholder="Salida 1"
                  onChange={(e) => setNewHorario({...newHorario, salida1: e.target.value})}
                  className="text-sm"
                />
                <Input
                  type="time"
                  placeholder="Entrada 2"
                  onChange={(e) => setNewHorario({...newHorario, entrada2: e.target.value})}
                  className="text-sm"
                />
                <Input
                  type="time"
                  placeholder="Salida 2"
                  onChange={(e) => setNewHorario({...newHorario, salida2: e.target.value})}
                  className="text-sm"
                />
                <Button onClick={addHorario} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Añadir
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full bg-slate-600 hover:bg-slate-700">
        <Save className="w-4 h-4 mr-2" />
        Guardar Configuración
      </Button>
    </div>
  );
}