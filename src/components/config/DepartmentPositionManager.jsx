import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DepartmentPositionManager() {
  const [departments, setDepartments] = useState([
    { id: '1', name: 'PRODUCCIÓN', positions: ['Operario', 'Encargado', 'Supervisor'] },
    { id: '2', name: 'MANTENIMIENTO', positions: ['Técnico', 'Jefe de Mantenimiento'] },
    { id: '3', name: 'CALIDAD', positions: ['Técnico de Calidad', 'Responsable de Calidad'] },
    { id: '4', name: 'ALMACÉN', positions: ['Mozos', 'Jefe de Almacén'] },
  ]);
  
  const [editingDept, setEditingDept] = useState(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newPositionName, setNewPositionName] = useState('');
  const [addingPositionTo, setAddingPositionTo] = useState(null);

  const addDepartment = () => {
    if (!newDeptName.trim()) return;
    
    setDepartments([...departments, {
      id: Date.now().toString(),
      name: newDeptName.toUpperCase(),
      positions: []
    }]);
    setNewDeptName('');
  };

  const deleteDepartment = (deptId) => {
    if (confirm('¿Eliminar este departamento y todos sus puestos?')) {
      setDepartments(departments.filter(d => d.id !== deptId));
    }
  };

  const addPosition = (deptId) => {
    if (!newPositionName.trim()) return;
    
    setDepartments(departments.map(d => 
      d.id === deptId 
        ? { ...d, positions: [...d.positions, newPositionName] }
        : d
    ));
    setNewPositionName('');
    setAddingPositionTo(null);
  };

  const deletePosition = (deptId, positionName) => {
    if (confirm('¿Eliminar este puesto?')) {
      setDepartments(departments.map(d => 
        d.id === deptId 
          ? { ...d, positions: d.positions.filter(p => p !== positionName) }
          : d
      ));
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-900 text-sm">
          Los departamentos y puestos definidos aquí se utilizarán como opciones al importar empleados desde la Base de Datos Maestra.
        </AlertDescription>
      </Alert>

      <div className="flex gap-3">
        <Input
          placeholder="Nombre del nuevo departamento..."
          value={newDeptName}
          onChange={(e) => setNewDeptName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addDepartment()}
        />
        <Button onClick={addDepartment} className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          Añadir Departamento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map(dept => (
          <Card key={dept.id} className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-slate-900">{dept.name}</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteDepartment(dept.id)}
                  className="hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-600">Puestos:</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {dept.positions.length === 0 ? (
                    <span className="text-xs text-slate-400">Sin puestos definidos</span>
                  ) : (
                    dept.positions.map((position, idx) => (
                      <Badge key={idx} variant="outline" className="flex items-center gap-1">
                        {position}
                        <button
                          onClick={() => deletePosition(dept.id, position)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>

                {addingPositionTo === dept.id ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre del puesto..."
                      value={newPositionName}
                      onChange={(e) => setNewPositionName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addPosition(dept.id)}
                      autoFocus
                    />
                    <Button size="sm" onClick={() => addPosition(dept.id)}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setAddingPositionTo(null);
                      setNewPositionName('');
                    }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddingPositionTo(dept.id)}
                    className="w-full"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Añadir Puesto
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No hay departamentos configurados. Añade el primero arriba.
        </div>
      )}
    </div>
  );
}