import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, Trash2, Edit, Save, X, Users, Briefcase, 
  ChevronRight, ChevronDown, Building2, UserCircle 
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function DepartmentPositionManager() {
  const queryClient = useQueryClient();
  const [editingDept, setEditingDept] = useState(null);
  const [editingPos, setEditingPos] = useState(null);
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isPosDialogOpen, setIsPosDialogOpen] = useState(false);

  // Department State
  const [deptForm, setDeptForm] = useState({
    name: "",
    code: "",
    parent_id: "root", // Use "root" for top level
    manager_id: "",
    color: "#3b82f6"
  });

  // Position State
  const [posForm, setPosForm] = useState({
    name: "",
    department_id: "",
    max_headcount: 1,
    level: "Mid",
    description: ""
  });

  // Queries
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Mutations
  const deptMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data };
      if (payload.parent_id === "root") payload.parent_id = null;
      
      if (editingDept) {
        return base44.entities.Department.update(editingDept.id, payload);
      }
      return base44.entities.Department.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsDeptDialogOpen(false);
      resetDeptForm();
      toast.success(editingDept ? "Departamento actualizado" : "Departamento creado");
    }
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id) => base44.entities.Department.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success("Departamento eliminado");
    }
  });

  const posMutation = useMutation({
    mutationFn: async (data) => {
      if (editingPos) {
        return base44.entities.Position.update(editingPos.id, data);
      }
      return base44.entities.Position.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      setIsPosDialogOpen(false);
      resetPosForm();
      toast.success(editingPos ? "Puesto actualizado" : "Puesto creado");
    }
  });

  const deletePosMutation = useMutation({
    mutationFn: (id) => base44.entities.Position.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast.success("Puesto eliminado");
    }
  });

  // Helpers
  const resetDeptForm = () => {
    setDeptForm({ name: "", code: "", parent_id: "root", manager_id: "", color: "#3b82f6" });
    setEditingDept(null);
  };

  const resetPosForm = () => {
    setPosForm({ name: "", department_id: "", max_headcount: 1, level: "Mid", description: "" });
    setEditingPos(null);
  };

  const handleEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code,
      parent_id: dept.parent_id || "root",
      manager_id: dept.manager_id || "",
      color: dept.color || "#3b82f6"
    });
    setIsDeptDialogOpen(true);
  };

  const handleAddPos = (deptId) => {
    resetPosForm();
    setPosForm(prev => ({ ...prev, department_id: deptId }));
    setIsPosDialogOpen(true);
  };

  const handleEditPos = (pos) => {
    setEditingPos(pos);
    setPosForm({
      name: pos.name,
      department_id: pos.department_id,
      max_headcount: pos.max_headcount || 1,
      level: pos.level || "Mid",
      description: pos.description || ""
    });
    setIsPosDialogOpen(true);
  };

  const getDeptPositions = (deptId) => positions.filter(p => p.department_id === deptId);

  // Render recursive department tree
  const renderDepartmentTree = (parentId = null, level = 0) => {
    const currentDepts = departments.filter(d => (d.parent_id || null) === parentId);
    
    if (currentDepts.length === 0) return null;

    return (
      <div className={`space-y-4 ${level > 0 ? "ml-8 mt-4 border-l-2 border-slate-200 pl-4" : ""}`}>
        {currentDepts.map(dept => {
          const deptPositions = getDeptPositions(dept.id);
          const totalHeadcount = deptPositions.reduce((acc, pos) => acc + (pos.max_headcount || 0), 0);
          
          return (
            <Card key={dept.id} className="border-l-4" style={{ borderLeftColor: dept.color }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-slate-900">{dept.name}</h3>
                      <Badge variant="outline" className="text-xs">{dept.code}</Badge>
                      {dept.manager_id && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                          <UserCircle className="w-3 h-3" />
                          {employees.find(e => e.id === dept.manager_id)?.nombre || "Manager"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {deptPositions.length} Puestos definidos
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Total Headcount: {totalHeadcount}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditDept(dept)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if(confirm('¿Eliminar departamento?')) deleteDeptMutation.mutate(dept.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Positions Grid */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {deptPositions.map(pos => (
                    <div key={pos.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                      <div>
                        <div className="font-medium text-sm text-slate-900">{pos.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] h-5">{pos.level}</Badge>
                          <span>Max: {pos.max_headcount}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditPos(pos)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-red-500 hover:text-red-700"
                          onClick={() => {
                            if(confirm('¿Eliminar puesto?')) deletePosMutation.mutate(pos.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    className="h-auto border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400"
                    onClick={() => handleAddPos(dept.id)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Añadir Puesto
                  </Button>
                </div>

                {/* Render children recursively */}
                {renderDepartmentTree(dept.id, level + 1)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
        <div>
          <h2 className="text-lg font-semibold text-blue-900">Estructura Organizativa</h2>
          <p className="text-sm text-blue-700">Define departamentos, jerarquías y puestos con límites de personal.</p>
        </div>
        <Button onClick={() => { resetDeptForm(); setIsDeptDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Departamento
        </Button>
      </div>

      <div className="space-y-4">
        {departments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-lg">
            No hay estructura definida. Comienza creando un departamento.
          </div>
        ) : (
          renderDepartmentTree(null)
        )}
      </div>

      {/* Department Dialog */}
      <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? "Editar Departamento" : "Nuevo Departamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Código (ej: IT, HR)</Label>
                <Input value={deptForm.code} onChange={e => setDeptForm({...deptForm, code: e.target.value})} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Departamento Padre</Label>
              <Select value={deptForm.parent_id} onValueChange={val => setDeptForm({...deptForm, parent_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">-- Raíz (Sin padre) --</SelectItem>
                  {departments
                    .filter(d => d.id !== editingDept?.id) // Prevent self-parenting loop
                    .map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsable (Manager)</Label>
              <Select value={deptForm.manager_id} onValueChange={val => setDeptForm({...deptForm, manager_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar responsable..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color Identificativo</Label>
              <div className="flex gap-2">
                {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${deptForm.color === color ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setDeptForm({...deptForm, color})}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeptDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => deptMutation.mutate(deptForm)} disabled={!deptForm.name}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position Dialog */}
      <Dialog open={isPosDialogOpen} onOpenChange={setIsPosDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPos ? "Editar Puesto" : "Nuevo Puesto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del Puesto</Label>
              <Input value={posForm.name} onChange={e => setPosForm({...posForm, name: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Headcount Máximo</Label>
                <Input 
                  type="number" 
                  min="1"
                  value={posForm.max_headcount} 
                  onChange={e => setPosForm({...posForm, max_headcount: parseInt(e.target.value) || 1})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Nivel</Label>
                <Select value={posForm.level} onValueChange={val => setPosForm({...posForm, level: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Junior", "Mid", "Senior", "Lead", "Manager", "Director", "Executive"].map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={posForm.description} onChange={e => setPosForm({...posForm, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPosDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => posMutation.mutate(posForm)} disabled={!posForm.name}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}