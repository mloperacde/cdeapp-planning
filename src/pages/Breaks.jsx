import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Coffee, Sparkles, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BreaksPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingBreak, setEditingBreak] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedShift, setSelectedShift] = useState("Mañana");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: "",
    hora_inicio: "",
    duracion_minutos: 20,
    personas_por_turno: 5,
    aplica_turno_manana: true,
    aplica_turno_tarde: true,
    activo: true,
  });

  const { data: breakShifts, isLoading, error, isError } = useQuery({
    queryKey: ['breakShifts'],
    queryFn: async () => {
      try {
        const data = await base44.entities.BreakShift.list();
        
        // Handle various response structures
        let rawArray = [];
        if (Array.isArray(data)) {
          rawArray = data;
        } else if (data && Array.isArray(data.data)) {
          rawArray = data.data; // Some APIs wrap in { data: [...] }
        } else if (data && Array.isArray(data.items)) {
          rawArray = data.items; // Some wrap in { items: [...] }
        } else if (typeof data === 'object' && data !== null) {
           // If it's an object but not an array, maybe it's keyed by ID?
           // Try to convert values to array
           rawArray = Object.values(data).filter(item => typeof item === 'object');
        }

        // Validate items have an ID (if not, generate a temp one for display)
        return rawArray.map((item, idx) => ({
             ...item,
             id: item.id || `temp_id_${idx}`
        }));
      } catch (err) {
        console.error("Error fetching BreakShifts:", err);
        throw err;
      }
    },
    initialData: [],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  // Safe header extraction
  const dataStructure = breakShifts && breakShifts.length > 0 
    ? Object.keys(breakShifts[0]) 
    : ['id', 'nombre', 'hora_inicio', 'duracion_minutos', 'personas_por_turno', 'activo'];
  
  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingBreak?.id) {
        return base44.entities.BreakShift.update(editingBreak.id, data);
      }
      return base44.entities.BreakShift.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakShifts'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BreakShift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakShifts'] });
    },
  });

  const handleEdit = (breakShift) => {
    setEditingBreak(breakShift);
    setFormData(breakShift);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingBreak(null);
    setFormData({
      nombre: "",
      hora_inicio: "",
      duracion_minutos: 20,
      personas_por_turno: 5,
      aplica_turno_manana: true,
      aplica_turno_tarde: true,
      activo: true,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este turno de descanso?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleGenerateBreaks = async () => {
    if (!selectedDate || !selectedShift || !selectedTeamId) {
      toast.error("Selecciona día, turno y equipo antes de generar descansos");
      return;
    }

    const teamObj = teams.find(t => String(t.id) === String(selectedTeamId));
    if (!teamObj || !teamObj.team_key) {
      toast.error("No se ha podido resolver el equipo seleccionado");
      return;
    }

    const applicableBreaks = (breakShifts || [])
      .filter(b => b.activo)
      .filter(b => {
        if (selectedShift.includes("Mañana")) {
          return b.aplica_turno_manana;
        }
        if (selectedShift.includes("Tarde")) {
          return b.aplica_turno_tarde;
        }
        return b.aplica_turno_manana || b.aplica_turno_tarde;
      })
      .sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || ""));

    if (!applicableBreaks.length) {
      toast.error("No hay turnos de descanso activos para el turno seleccionado");
      return;
    }

    setIsCalling(true);
    try {
      const filters = {
        date: selectedDate,
        shift: selectedShift,
        team_key: teamObj.team_key,
      };

      if (!base44.entities.DailyMachineStaffing) {
        toast.error("Entidad DailyMachineStaffing no disponible en este entorno");
        return;
      }

      const [staffing, employeesRaw] = await Promise.all([
        base44.entities.DailyMachineStaffing.filter(filters),
        base44.entities.EmployeeMasterDatabase.list(undefined, 2000),
      ]);

      const staffingArray = Array.isArray(staffing) ? staffing : [];

      if (!staffingArray.length) {
        toast.error("No hay personal asignado a máquinas para esa fecha, turno y equipo");
        setGeneratedPlan(null);
        return;
      }

      const normalize = (str) =>
        str
          ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          : "";

      const employees = (Array.isArray(employeesRaw) ? employeesRaw : []).filter(
        (e) => normalize(e.departamento) === "produccion"
      );

      const employeeById = new Map(employees.map((e) => [String(e.id), e]));

      const roleKeys = [
        "responsable_linea",
        "segunda_linea",
        "operador_1",
        "operador_2",
        "operador_3",
        "operador_4",
        "operador_5",
        "operador_6",
        "operador_7",
        "operador_8",
      ];

      const getRoleLabel = (key) => {
        if (key === "responsable_linea") return "Responsable línea";
        if (key === "segunda_linea") return "2ª línea";
        if (key.startsWith("operador_")) {
          const idx = key.split("_")[1];
          return `Operador ${idx}`;
        }
        return key;
      };

      const assignments = [];
      const seen = new Set();

      staffingArray.forEach((s) => {
        roleKeys.forEach((key) => {
          const empId = s[key];
          if (!empId) return;
          const idStr = String(empId);
          const uniqueKey = `${idStr}-${key}`;
          if (seen.has(uniqueKey)) return;
          const emp = employeeById.get(idStr);
          if (!emp) return;
          seen.add(uniqueKey);
          assignments.push({
            id: idStr,
            employee: emp,
            roleKey: key,
            roleLabel: getRoleLabel(key),
          });
        });
      });

      if (!assignments.length) {
        toast.error("No se ha encontrado personal de Producción asignado a máquinas");
        setGeneratedPlan(null);
        return;
      }

      let slots = [];
      applicableBreaks.forEach((b, idx) => {
        const cap = Number(b.personas_por_turno || b.people_per_shift || 0);
        if (cap > 0) {
          for (let i = 0; i < cap; i++) {
            slots.push(idx);
          }
        }
      });
      if (!slots.length) {
        slots = applicableBreaks.map((_, idx) => idx);
      }

      const byBreak = applicableBreaks.map(() => []);
      assignments.forEach((item, index) => {
        const slotIndex = slots[index % slots.length];
        byBreak[slotIndex].push(item);
      });

      const plan = {
        date: selectedDate,
        shift: selectedShift,
        teamName: teamObj.team_name || teamObj.team_key,
        breaks: applicableBreaks.map((b, idx) => ({
          id: b.id,
          nombre: b.nombre || b.name || "Sin nombre",
          hora_inicio: b.hora_inicio || b.start_time || "--:--",
          personas_por_turno: b.personas_por_turno || b.people_per_shift || 0,
          empleados: byBreak[idx],
        })),
      };

      setGeneratedPlan(plan);
      toast.success("Descansos generados correctamente");
    } catch (error) {
      console.error("Error al generar descansos:", error);
      toast.error("Error al generar descansos");
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Standard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Coffee className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Gestión de Descansos
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Configura los horarios y grupos de descanso
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            className="h-8 gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Turno de Descanso</span>
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col gap-6">
        <Tabs defaultValue="generation" className="w-full">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="generation" className="flex-1 text-xs">
              Generación Descansos
            </TabsTrigger>
            <TabsTrigger value="config" className="flex-1 text-xs">
              Configuración Turnos Descanso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generation" className="mt-4 space-y-4">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>Generar descansos para Producción</span>
                  <Button
                    onClick={handleGenerateBreaks}
                    disabled={isCalling}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 bg-white hover:bg-purple-50 border-purple-200"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {isCalling ? "Generando..." : "Generar descansos"}
                    </span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Turno</Label>
                    <Select value={selectedShift} onValueChange={setSelectedShift}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona turno" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mañana">Mañana</SelectItem>
                        <SelectItem value="Tarde">Tarde</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Equipo</Label>
                    <Select
                      value={selectedTeamId}
                      onValueChange={setSelectedTeamId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={String(team.id)}>
                            {team.team_name || team.team_key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {generatedPlan && (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-500">
                      Resultado para {generatedPlan.date} · Turno {generatedPlan.shift} ·{" "}
                      Equipo {generatedPlan.teamName}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {generatedPlan.breaks.map((b) => (
                        <Card key={b.id} className="border border-slate-200 shadow-sm">
                          <CardHeader className="py-2 px-3 border-b bg-slate-50">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-slate-800">
                                    {b.nombre}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    Inicio {b.hora_inicio}
                                  </span>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                {b.empleados.length}/{b.personas_por_turno || 0} personas
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="px-3 py-2">
                            {b.empleados.length === 0 ? (
                              <div className="text-[11px] text-slate-400 italic">
                                Sin asignaciones para este turno de descanso.
                              </div>
                            ) : (
                              <ul className="space-y-1">
                                {b.empleados.map((item) => (
                                  <li
                                    key={`${b.id}-${item.id}-${item.roleKey}`}
                                    className="flex items-center justify-between text-[11px]"
                                  >
                                    <span className="font-medium text-slate-800">
                                      {item.employee.nombre ||
                                        item.employee.name ||
                                        item.employee.full_name ||
                                        item.employee.display_name ||
                                        "Sin nombre"}
                                    </span>
                                    <span className="text-slate-500">
                                      {item.roleLabel}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Turnos de Descanso Configurados</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center text-slate-500">Cargando...</div>
                ) : breakShifts.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay turnos de descanso configurados
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Nombre</TableHead>
                          <TableHead>Hora Inicio</TableHead>
                          <TableHead>Duración</TableHead>
                          <TableHead>Personas/Turno</TableHead>
                          <TableHead>Aplica a</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {breakShifts.map((breakShift) => (
                          <TableRow key={breakShift.id} className="hover:bg-slate-50">
                            <TableCell>
                              <span className="font-semibold text-slate-900">
                                {breakShift.nombre || breakShift.name || "Sin nombre"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                {breakShift.hora_inicio || breakShift.start_time || "--:--"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {breakShift.duracion_minutos || breakShift.duration || 0} min
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-green-600" />
                                {breakShift.personas_por_turno ||
                                  breakShift.people_per_shift ||
                                  0}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {breakShift.aplica_turno_manana && (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-50 text-amber-700"
                                  >
                                    Mañana
                                  </Badge>
                                )}
                                {breakShift.aplica_turno_tarde && (
                                  <Badge
                                    variant="outline"
                                    className="bg-indigo-50 text-indigo-700"
                                  >
                                    Tarde
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  breakShift.activo
                                    ? "bg-green-100 text-green-800"
                                    : "bg-slate-100 text-slate-600"
                                }
                              >
                                {breakShift.activo ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(breakShift)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(breakShift.id)}
                                  className="hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showForm && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBreak ? 'Editar Turno de Descanso' : 'Nuevo Turno de Descanso'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    placeholder="ej. Descanso 1"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hora_inicio">Hora de Inicio *</Label>
                  <Input
                    id="hora_inicio"
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duracion">Duración (minutos) *</Label>
                  <Input
                    id="duracion"
                    type="number"
                    min="5"
                    value={formData.duracion_minutos}
                    onChange={(e) => setFormData({ ...formData, duracion_minutos: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personas">Personas por Turno *</Label>
                  <Input
                    id="personas"
                    type="number"
                    min="1"
                    value={formData.personas_por_turno}
                    onChange={(e) => setFormData({ ...formData, personas_por_turno: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <Label>Aplicar a Turnos</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="manana"
                      checked={formData.aplica_turno_manana}
                      onCheckedChange={(checked) => setFormData({ ...formData, aplica_turno_manana: checked })}
                    />
                    <label htmlFor="manana" className="text-sm">
                      Turno de Mañana (7:00 - 15:00)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tarde"
                      checked={formData.aplica_turno_tarde}
                      onCheckedChange={(checked) => setFormData({ ...formData, aplica_turno_tarde: checked })}
                    />
                    <label htmlFor="tarde" className="text-sm">
                      Turno de Tarde (14:00/15:00 - 22:00)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t border-slate-200">
                <Checkbox
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <label htmlFor="activo" className="text-sm font-medium">
                  Turno Activo
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
