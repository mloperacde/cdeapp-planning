import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Check, X } from "lucide-react";

export default function RolePermissionsMatrix({ role, onPermissionChange, editable = false }) {
  const permissionSections = [
    {
      key: "chat",
      label: "Chat / Mensajería",
      permissions: [
        { key: "ver_canales", label: "Ver canales" },
        { key: "crear_canales", label: "Crear canales" },
        { key: "mensajes_directos", label: "Mensajes directos" }
      ]
    },
    {
      key: "ausencias",
      label: "Ausencias",
      permissions: [
        { key: "ver_propias", label: "Ver propias" },
        { key: "crear_propias", label: "Crear propias" },
        { key: "ver_todas", label: "Ver todas" },
        { key: "aprobar", label: "Aprobar" },
        { key: "rechazar", label: "Rechazar" },
        { key: "eliminar", label: "Eliminar" }
      ]
    },
    {
      key: "perfil",
      label: "Perfil",
      permissions: [
        { key: "ver_propio", label: "Ver propio" },
        { key: "editar_propio", label: "Editar propio" },
        { key: "ver_otros", label: "Ver otros" },
        { key: "editar_otros", label: "Editar otros" }
      ]
    },
    {
      key: "contrato",
      label: "Contrato",
      permissions: [
        { key: "ver", label: "Ver" },
        { key: "editar", label: "Editar" }
      ]
    },
    {
      key: "documentos",
      label: "Documentos",
      permissions: [
        { key: "ver", label: "Ver" },
        { key: "descargar", label: "Descargar" },
        { key: "subir", label: "Subir" },
        { key: "editar", label: "Editar" },
        { key: "eliminar", label: "Eliminar" },
        { key: "gestionar_permisos", label: "Gestionar permisos" }
      ]
    },
    {
      key: "empleados",
      label: "Empleados",
      permissions: [
        { key: "ver", label: "Ver" },
        { key: "crear", label: "Crear" },
        { key: "editar", label: "Editar" },
        { key: "eliminar", label: "Eliminar" }
      ]
    },
    {
      key: "maquinas",
      label: "Máquinas",
      permissions: [
        { key: "ver", label: "Ver" },
        { key: "actualizar_estado", label: "Actualizar estado" },
        { key: "planificar", label: "Planificar" }
      ]
    },
    {
      key: "mantenimiento",
      label: "Mantenimiento",
      permissions: [
        { key: "ver", label: "Ver" },
        { key: "crear", label: "Crear" },
        { key: "actualizar", label: "Actualizar" },
        { key: "completar", label: "Completar" }
      ]
    },
    {
      key: "comites",
      label: "Comités y PRL",
      permissions: [
        { key: "ver", label: "Ver" },
        { key: "gestionar_miembros", label: "Gestionar miembros" },
        { key: "gestionar_documentos", label: "Gestionar documentos" }
      ]
    },
    {
      key: "campos_empleado",
      label: "Campos de Empleado (Vista)",
      permissions: [
        { key: "ver_salario", label: "Ver Salario" },
        { key: "ver_dni", label: "Ver DNI" },
        { key: "ver_contacto", label: "Ver Contacto (Tlf/Email)" },
        { key: "ver_direccion", label: "Ver Dirección" },
        { key: "ver_bancarios", label: "Ver Datos Bancarios" }
      ]
    }
  ];

  const getPermissionValue = (section, permission) => {
    return role?.permissions?.[section]?.[permission] || false;
  };

  const handlePermissionToggle = (section, permission) => {
    if (!editable || !onPermissionChange) return;
    
    const newPermissions = {
      ...role.permissions,
      [section]: {
        ...role.permissions?.[section],
        [permission]: !getPermissionValue(section, permission)
      }
    };
    
    onPermissionChange(newPermissions);
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Matriz de Permisos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {permissionSections.map(section => (
            <div key={section.key} className="p-4">
              <h4 className="font-semibold text-sm mb-3 text-slate-700">
                {section.label}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {section.permissions.map(perm => {
                  const hasPermission = getPermissionValue(section.key, perm.key);
                  return (
                    <div
                      key={perm.key}
                      className={`flex items-center space-x-2 p-2 rounded ${
                        editable ? 'hover:bg-slate-50 cursor-pointer' : ''
                      }`}
                      onClick={() => editable && handlePermissionToggle(section.key, perm.key)}
                    >
                      {editable ? (
                        <Checkbox
                          checked={hasPermission}
                          onCheckedChange={() => handlePermissionToggle(section.key, perm.key)}
                        />
                      ) : (
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                          hasPermission ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {hasPermission ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <X className="w-3 h-3 text-red-600" />
                          )}
                        </div>
                      )}
                      <label className="text-xs cursor-pointer">
                        {perm.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}