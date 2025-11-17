import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Plus, Edit, Trash2, ArrowLeft, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MessagingConfigPage() {
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const queryClient = useQueryClient();

  const { data: messageTypes = [] } = useQuery({
    queryKey: ['messageTypes'],
    queryFn: async () => {
      return [
        {
          id: "1",
          nombre: "Mensaje General",
          descripcion: "Mensaje informativo general",
          destinatarios_permitidos: ["all"],
          color: "#3B82F6"
        },
        {
          id: "2",
          nombre: "Alerta Urgente",
          descripcion: "Mensaje urgente que requiere atención inmediata",
          destinatarios_permitidos: ["supervisor", "admin"],
          color: "#EF4444"
        },
        {
          id: "3",
          nombre: "Anuncio Equipo",
          descripcion: "Anuncio específico para un equipo",
          destinatarios_permitidos: ["team_lead", "supervisor"],
          color: "#8B5CF6"
        }
      ];
    },
    initialData: [],
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    initialData: [],
  });

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              Configuración de Mensajería
            </h1>
            <p className="text-slate-600 mt-1">
              Configura tipos de mensajes y permisos de envío
            </p>
          </div>
          <Button onClick={() => setShowTypeForm(true)} className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Tipo de Mensaje
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Tipos de Mensajes Configurados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {messageTypes.map((type) => (
                  <Card key={type?.id} className="border-l-4" style={{ borderLeftColor: type?.color }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{type?.nombre}</h4>
                          <p className="text-sm text-slate-600 mt-1">{type?.descripcion}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              Permitido: {type?.destinatarios_permitidos?.join(", ")}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingType(type);
                            setShowTypeForm(true);
                          }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b">
              <CardTitle>Permisos por Rol</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role?.id} className="p-3 bg-slate-50 rounded-lg border">
                    <div className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      {role?.role_name}
                      {role?.is_admin && <Badge className="bg-red-600">Admin</Badge>}
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>✓ Puede enviar mensajes directos</p>
                      {role?.permissions?.acciones_ausencias?.aprobar && (
                        <p>✓ Puede enviar alertas urgentes</p>
                      )}
                      {role?.is_admin && (
                        <p>✓ Acceso completo a todos los canales</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-0 bg-blue-50 border-blue-200 mt-6">
          <CardHeader>
            <CardTitle className="text-base">Configuración de Canales por Tipo de Usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-lg border">
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">Administradores</h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>✓ Acceso a todos los canales</li>
                    <li>✓ Crear canales nuevos</li>
                    <li>✓ Mensajes prioritarios</li>
                  </ul>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">Supervisores</h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>✓ Canales de su departamento</li>
                    <li>✓ Mensajes a su equipo</li>
                    <li>✓ Canales generales</li>
                  </ul>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <h4 className="font-semibold text-sm text-slate-900 mb-2">Empleados</h4>
                  <ul className="text-xs text-slate-600 space-y-1">
                    <li>✓ Mensajes directos</li>
                    <li>✓ Canal de su equipo</li>
                    <li>✓ Canales generales (solo lectura)</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showTypeForm && (
        <Dialog open={true} onOpenChange={() => {
          setShowTypeForm(false);
          setEditingType(null);
        }} modal={false}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Tipo de Mensaje</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Esta funcionalidad estará disponible próximamente. Por ahora, los tipos de mensajes están predefinidos.
              </p>
              <Button variant="outline" onClick={() => {
                setShowTypeForm(false);
                setEditingType(null);
              }}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}