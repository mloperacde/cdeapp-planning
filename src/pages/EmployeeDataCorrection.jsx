import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Search, Save, Edit2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const smartCorrect = (fieldName, value) => {
  if (!value || typeof value !== 'string' || !value.includes('?')) {
    return value;
  }

  // Nacionalidad: siempre Ñ
  if (fieldName === 'nacionalidad') {
    return value.replace(/\?/g, 'Ñ');
  }

  // Dirección: reglas específicas
  if (fieldName === 'direccion') {
    let corrected = value;
    // Ma?ana -> Mañana
    corrected = corrected.replace(/Ma\?ana/gi, 'Mañana');
    // Alcal?? -> Alcalá (dos interrogaciones seguidas)
    corrected = corrected.replace(/Alcal\?\?/gi, 'Alcalá');
    // planificaci?n -> planificación
    corrected = corrected.replace(/planificaci\?n/gi, 'planificación');
    // Cualquier otro ? -> Ñ como fallback
    corrected = corrected.replace(/\?/g, 'Ñ');
    return corrected;
  }

  // Nombre: análisis inteligente
  if (fieldName === 'nombre') {
    let corrected = value;
    
    // Patrones comunes con tildes
    const tildedPatterns = [
      { pattern: /Jos\?/gi, replacement: 'José' },
      { pattern: /Mar\?a/gi, replacement: 'María' },
      { pattern: /V\?ctor/gi, replacement: 'Víctor' },
      { pattern: /\?ngel/gi, replacement: 'Ángel' },
      { pattern: /Ra\?l/gi, replacement: 'Raúl' },
      { pattern: /Andr\?s/gi, replacement: 'Andrés' },
      { pattern: /Jes\?s/gi, replacement: 'Jesús' },
      { pattern: /\?scar/gi, replacement: 'Óscar' },
      { pattern: /I\?aki/gi, replacement: 'Iñaki' },
      { pattern: /Bego\?a/gi, replacement: 'Begoña' },
    ];

    // Aplicar patrones de tildes
    tildedPatterns.forEach(({ pattern, replacement }) => {
      corrected = corrected.replace(pattern, replacement);
    });

    // Si después de las tildes aún quedan ?, probablemente sean Ñ
    // Patrón para detectar Ñ: ? entre consonantes o al inicio seguido de vocal
    corrected = corrected.replace(/([bcdfghjklmnpqrstvwxyz])\?([aeiou])/gi, (match, before, after) => {
      return before + 'ñ' + after;
    });
    
    // ? al inicio de palabra seguido de vocal (ej: ?OÑEZ -> ÑOÑEZ)
    corrected = corrected.replace(/\b\?([aeiou])/gi, (match, after) => {
      return 'Ñ' + after;
    });

    // Cualquier ? restante -> Ñ
    corrected = corrected.replace(/\?/g, 'Ñ');
    
    return corrected;
  }

  // Default: reemplazar por Ñ
  return value.replace(/\?/g, 'Ñ');
};

export default function EmployeeDataCorrection() {
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editedData, setEditedData] = useState({});
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const employeesWithQuestionMarks = useMemo(() => {
    const results = [];
    
    employees.forEach(emp => {
      const fieldsWithQuestionMark = [];
      
      Object.entries(emp).forEach(([key, value]) => {
        if (typeof value === 'string' && value.includes('?')) {
          fieldsWithQuestionMark.push({
            field: key,
            value: value,
            suggestion: smartCorrect(key, value)
          });
        }
      });
      
      if (fieldsWithQuestionMark.length > 0) {
        results.push({
          employee: emp,
          fields: fieldsWithQuestionMark
        });
      }
    });
    
    return results;
  }, [employees]);

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ employeeId, data }) => {
      return base44.entities.Employee.update(employeeId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditingEmployee(null);
      setEditedData({});
      toast.success("✅ Empleado actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar: " + error.message);
    }
  });

  const handleEdit = (item) => {
    setEditingEmployee(item);
    const initialData = {};
    item.fields.forEach(field => {
      initialData[field.field] = field.suggestion;
    });
    setEditedData(initialData);
  };

  const handleSave = () => {
    if (!editingEmployee) return;
    
    updateEmployeeMutation.mutate({
      employeeId: editingEmployee.employee.id,
      data: editedData
    });
  };

  const getFieldLabel = (fieldName) => {
    const labels = {
      nombre: "Nombre",
      codigo_empleado: "Código",
      dni: "DNI",
      nuss: "NUSS",
      direccion: "Dirección",
      nacionalidad: "Nacionalidad",
      formacion: "Formación",
      departamento: "Departamento",
      puesto: "Puesto",
      categoria: "Categoría",
      email: "Email",
      telefono_movil: "Teléfono",
      contacto_emergencia_nombre: "Contacto Emergencia",
      equipo: "Equipo"
    };
    return labels[fieldName] || fieldName;
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Search className="w-8 h-8 text-blue-600" />
            Corrección de Datos - Caracteres Especiales
          </h1>
          <p className="text-slate-600 mt-1">
            Corrección inteligente de caracteres "?" en datos de empleados
          </p>
        </div>

        <div className="mb-6">
          <Card className="bg-blue-50 border-2 border-blue-200 shadow-lg">
            <CardContent className="p-4">
              <div className="space-y-2 text-sm text-blue-900">
                <p className="font-semibold">🤖 Corrección Automática Inteligente:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Nacionalidad:</strong> ? → Ñ (ej: ESPA?OLA → ESPAÑOLA)</li>
                  <li><strong>Nombres:</strong> Análisis inteligente
                    <ul className="list-circle list-inside ml-4 text-xs">
                      <li>Jos?, Mar?a, ?ngel → José, María, Ángel (tildes)</li>
                      <li>Mu?oz, Pe?a → Muñoz, Peña (Ñ entre consonantes)</li>
                    </ul>
                  </li>
                  <li><strong>Dirección:</strong> Ma?ana → Mañana, Alcal?? → Alcalá, planificaci?n → planificación</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <Card className={`shadow-lg ${
            employeesWithQuestionMarks.length > 0 
              ? 'bg-amber-50 border-2 border-amber-300' 
              : 'bg-green-50 border-2 border-green-300'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                {employeesWithQuestionMarks.length > 0 ? (
                  <>
                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                    <div>
                      <p className="text-lg font-bold text-amber-900">
                        {employeesWithQuestionMarks.length} empleado(s) con caracteres "?" detectados
                      </p>
                      <p className="text-sm text-amber-800">
                        Revisa las sugerencias automáticas y ajusta si es necesario
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-lg font-bold text-green-900">
                        ✅ No se encontraron caracteres "?" en los datos
                      </p>
                      <p className="text-sm text-green-800">
                        Todos los empleados tienen datos correctos
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {employeesWithQuestionMarks.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Empleados a Corregir ({employeesWithQuestionMarks.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Campos Afectados</TableHead>
                      <TableHead className="text-center">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeesWithQuestionMarks.map((item) => (
                      <TableRow key={item.employee.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="font-semibold text-slate-900">
                            {item.employee.nombre}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.employee.codigo_empleado || 'Sin código'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{item.employee.departamento || '-'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.fields.map((field, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {getFieldLabel(field.field)}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-xs text-amber-700 mt-1">
                            {item.fields.length} campo(s) con "?"
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Revisar y Corregir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {editingEmployee && (
        <Dialog open={true} onOpenChange={() => setEditingEmployee(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Corregir Datos - {editingEmployee.employee.nombre}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>✨ Sugerencias Automáticas:</strong> Las correcciones se han aplicado automáticamente según reglas inteligentes.
                  Puedes ajustar manualmente cualquier campo si la sugerencia no es correcta.
                </p>
              </div>

              {editingEmployee.fields.map((field, idx) => (
                <div key={idx} className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                    {getFieldLabel(field.field)}
                  </Label>
                  
                  <div className="space-y-2">
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-700 font-medium mb-1">❌ Valor Actual:</p>
                      <p className="text-sm font-mono text-red-900">{field.value}</p>
                    </div>
                    
                    <div className="bg-green-50 border-2 border-green-300 rounded p-2">
                      <p className="text-xs text-green-700 font-medium mb-1">✅ Corrección Sugerida (editable):</p>
                      <Input
                        value={editedData[field.field] || field.suggestion}
                        onChange={(e) => setEditedData({
                          ...editedData,
                          [field.field]: e.target.value
                        })}
                        className="font-mono bg-white border-green-400"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setEditingEmployee(null)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateEmployeeMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateEmployeeMutation.isPending ? "Guardando..." : "Guardar Correcciones"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}