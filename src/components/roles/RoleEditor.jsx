import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, AlertCircle } from "lucide-react";

// Estructura base limpia para un rol nuevo
const EMPTY_ROLE = {
  role_name: "",
  description: "",
  nivel_prioridad: 1,
  permissions: {
    modulos_acceso: [],
    empleados: {
      ver: false,
      crear: false,
      editar: false,
      eliminar: false,
      departamentos_visibles: []
    },
    campos_empleado: {
      ver_salario: false,
      ver_bancarios: false,
      ver_dni: false,
      ver_contacto: true,
      ver_direccion: true,
      editar_sensible: false,
      editar_contacto: false
    },
    empleados_detalle: {
      pestanas: {
        personal: true,
        organizacion: true,
        horarios: true,
        taquilla: true,
        contrato: false,
        absentismo: false,
        maquinas: true,
        disponibilidad: true
      }
    },
    contrato: {
      ver: false,
      editar: false
    }
  }
};

export default function RoleEditor({ roleId, onClose, onSuccess }) {
  const [formData, setFormData] = useState(JSON.parse(JSON.stringify(EMPTY_ROLE)));
  const [loading, setLoading] = useState(false);

  // Cargar departamentos dinámicamente
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  // Cargar rol si estamos editando
  useEffect(() => {
    if (roleId) {
      const fetchRole = async () => {
        try {
          // Buscamos directamente por ID para asegurar datos frescos
          const roles = await base44.entities.UserRole.list();
          const found = roles.find(r => r.id === roleId);
          if (found) {
            // Merge cuidadoso para no perder estructura si el rol guardado es antiguo
            const merged = {
              ...EMPTY_ROLE,
              ...found,
              permissions: {
                ...EMPTY_ROLE.permissions,
                ...(found.permissions || {}),
                empleados: { ...EMPTY_ROLE.permissions.empleados, ...(found.permissions?.empleados || {}) },
                campos_empleado: { ...EMPTY_ROLE.permissions.campos_empleado, ...(found.permissions?.campos_empleado || {}) },
                empleados_detalle: { 
                  pestanas: { ...EMPTY_ROLE.permissions.empleados_detalle.pestanas, ...(found.permissions?.empleados_detalle?.pestanas || {}) }
                },
                contrato: { ...EMPTY_ROLE.permissions.contrato, ...(found.permissions?.contrato || {}) }
              }
            };
            setFormData(merged);
          }
        } catch (e) {
          toast.error("Error cargando rol");
        }
      };
      fetchRole();
    } else {
        setFormData(JSON.parse(JSON.stringify(EMPTY_ROLE)));
    }
  }, [roleId]);

  // Handlers planos y directos - SIN lógica compleja
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePermissionChange = (path, value) => {
    setFormData(prev => {
      const next = { ...prev };
      // Helper simple para asignar valor en path profundo 'a.b.c'
      const parts = path.split('.');
      let current = next.permissions;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const handleDeptToggle = (deptName) => {
    setFormData(prev => {
      const next = { ...prev };
      const currentList = next.permissions.empleados.departamentos_visibles || [];
      const exists = currentList.includes(deptName);
      
      let newList;
      if (deptName === '*') {
        newList = exists ? [] : ['*'];
      } else {
        // Si estaba seleccionado '*', al seleccionar uno específico quitamos '*'
        const cleanList = currentList.filter(d => d !== '*');
        newList = exists 
          ? cleanList.filter(d => d !== deptName)
          : [...cleanList, deptName];
      }
      
      next.permissions.empleados.departamentos_visibles = newList;
      return next;
    });
  };

  const handleSave = async () => {
    if (!formData.role_name) return toast.error("El nombre es obligatorio");
    
    setLoading(true);
    try {
      if (roleId) {
        await base44.entities.UserRole.update(roleId, formData);
        toast.success("Rol actualizado");
      } else {
        await base44.entities.UserRole.create(formData);
        toast.success("Rol creado");
      }
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{roleId ? "Editar Rol" : "Crear Nuevo Rol"}</h2>
          <p className="text-slate-500">Define los permisos y accesos para este perfil</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-blue-600">
            <Save className="w-4 h-4 mr-2" />
            Guardar Rol
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
        {/* Columna Izquierda: Datos Básicos */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Rol</Label>
                <Input 
                  value={formData.role_name} 
                  onChange={e => handleChange('role_name', e.target.value)} 
                  placeholder="Ej: Jefe de Turno"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={e => handleChange('description', e.target.value)} 
                  placeholder="Descripción breve..."
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridad (1-10)</Label>
                <Input 
                  type="number" 
                  min="1" max="10"
                  value={formData.nivel_prioridad} 
                  onChange={e => handleChange('nivel_prioridad', parseInt(e.target.value))} 
                />
                <p className="text-xs text-slate-500">Mayor número = prioridad sobre otros roles en conflictos.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Matriz de Permisos */}
        <div className="md:col-span-2 h-full overflow-hidden flex flex-col">
          <Tabs defaultValue="empleados" className="flex-1 flex flex-col h-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="empleados">Gestión Empleados</TabsTrigger>
              <TabsTrigger value="campos">Datos Sensibles</TabsTrigger>
              <TabsTrigger value="fichas">Vistas de Ficha</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 bg-white dark:bg-slate-800 rounded-md border mt-2 p-4">
              
              <TabsContent value="empleados" className="mt-0 space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500" /> Acciones Generales
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="ver_lista" 
                        checked={formData.permissions.empleados.ver} 
                        onCheckedChange={c => handlePermissionChange('empleados.ver', c)}
                      />
                      <Label htmlFor="ver_lista">Ver Lista de Empleados</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="crear_emp" 
                        checked={formData.permissions.empleados.crear} 
                        onCheckedChange={c => handlePermissionChange('empleados.crear', c)}
                      />
                      <Label htmlFor="crear_emp">Crear Nuevos Empleados</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="editar_emp" 
                        checked={formData.permissions.empleados.editar} 
                        onCheckedChange={c => handlePermissionChange('empleados.editar', c)}
                      />
                      <Label htmlFor="editar_emp">Editar Datos Básicos</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="eliminar_emp" 
                        checked={formData.permissions.empleados.eliminar} 
                        onCheckedChange={c => handlePermissionChange('empleados.eliminar', c)}
                      />
                      <Label htmlFor="eliminar_emp" className="text-red-600">Eliminar Empleados</Label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Visibilidad por Departamento</h3>
                  <div className="flex flex-wrap gap-3">
                    <div 
                      className={`cursor-pointer px-3 py-1 rounded-full border transition-colors ${
                        formData.permissions.empleados.departamentos_visibles.includes('*') 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white hover:bg-slate-100'
                      }`}
                      onClick={() => handleDeptToggle('*')}
                    >
                      VER TODOS
                    </div>
                    {departments.map(dept => (
                      <div 
                        key={dept.id}
                        className={`cursor-pointer px-3 py-1 rounded-full border transition-colors ${
                          formData.permissions.empleados.departamentos_visibles.includes(dept.name.toUpperCase()) 
                          ? 'bg-blue-100 text-blue-800 border-blue-300' 
                          : 'bg-white hover:bg-slate-100'
                        }`}
                        onClick={() => handleDeptToggle(dept.name.toUpperCase())}
                      >
                        {dept.name}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="campos" className="mt-0 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50">
                    <div>
                      <Label className="font-semibold">Salario Anual</Label>
                      <p className="text-sm text-slate-500">Ver campo de salario bruto</p>
                    </div>
                    <Checkbox 
                      checked={formData.permissions.campos_empleado.ver_salario}
                      onCheckedChange={c => handlePermissionChange('campos_empleado.ver_salario', c)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50">
                    <div>
                      <Label className="font-semibold">Datos Bancarios</Label>
                      <p className="text-sm text-slate-500">Ver IBAN y cuenta bancaria</p>
                    </div>
                    <Checkbox 
                      checked={formData.permissions.campos_empleado.ver_bancarios}
                      onCheckedChange={c => handlePermissionChange('campos_empleado.ver_bancarios', c)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50">
                    <div>
                      <Label className="font-semibold">DNI / NIE</Label>
                      <p className="text-sm text-slate-500">Ver documento de identidad</p>
                    </div>
                    <Checkbox 
                      checked={formData.permissions.campos_empleado.ver_dni}
                      onCheckedChange={c => handlePermissionChange('campos_empleado.ver_dni', c)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded border-amber-200 bg-amber-50">
                    <div>
                      <Label className="font-semibold text-amber-900">Editar Datos Sensibles</Label>
                      <p className="text-sm text-amber-700">Permite modificar salario, banco, DNI</p>
                    </div>
                    <Checkbox 
                      checked={formData.permissions.campos_empleado.editar_sensible}
                      onCheckedChange={c => handlePermissionChange('campos_empleado.editar_sensible', c)}
                    />
                  </div>
                  
                  <Separator className="my-4"/>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <Label className="font-semibold">Contratos</Label>
                      <p className="text-sm text-slate-500">Ver pestaña y detalles de contrato</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs">Ver</Label>
                            <Checkbox 
                                checked={formData.permissions.contrato.ver}
                                onCheckedChange={c => handlePermissionChange('contrato.ver', c)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs">Editar</Label>
                            <Checkbox 
                                checked={formData.permissions.contrato.editar}
                                onCheckedChange={c => handlePermissionChange('contrato.editar', c)}
                            />
                        </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fichas" className="mt-0">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 mb-4">
                        Controla qué pestañas ve este rol dentro de la ficha de un empleado.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        {Object.keys(formData.permissions.empleados_detalle.pestanas).map(tabKey => (
                            <div key={tabKey} className="flex items-center space-x-2 capitalize">
                                <Checkbox 
                                    id={`tab_${tabKey}`}
                                    checked={formData.permissions.empleados_detalle.pestanas[tabKey]}
                                    onCheckedChange={c => handlePermissionChange(`empleados_detalle.pestanas.${tabKey}`, c)}
                                />
                                <Label htmlFor={`tab_${tabKey}`}>{tabKey}</Label>
                            </div>
                        ))}
                    </div>
                </div>
              </TabsContent>

            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </div>
  );
}